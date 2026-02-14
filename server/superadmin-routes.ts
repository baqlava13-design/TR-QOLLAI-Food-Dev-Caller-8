import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import bcrypt from "bcryptjs";

const generateToken = () => {
  return "sa_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const superadminTokens = new Map<string, { adminId: string; username: string; expiresAt: Date }>();

const requireSuperadmin = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer sa_")) {
    const token = authHeader.slice(7);
    const tokenData = superadminTokens.get(token);
    if (tokenData && new Date(tokenData.expiresAt) > new Date()) {
      (req as any).superadminId = tokenData.adminId;
      (req as any).superadminUsername = tokenData.username;
      return next();
    }
  }

  if (req.session?.superadminId) {
    (req as any).superadminId = req.session.superadminId;
    (req as any).superadminUsername = req.session.superadminUsername;
    return next();
  }

  return res.status(401).json({ error: "Unauthorized" });
};

export function registerSuperadminRoutes(app: Express) {
  app.post("/api/superadmin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      const admin = await storage.getSuperadminByUsername(username);
      if (!admin) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      superadminTokens.set(token, { adminId: admin.id, username: admin.username, expiresAt });

      req.session.superadminId = admin.id;
      req.session.superadminUsername = admin.username;
      req.session.save(() => {
        res.json({ id: admin.id, username: admin.username, token });
      });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/superadmin/me", requireSuperadmin, (req, res) => {
    res.json({ id: (req as any).superadminId, username: (req as any).superadminUsername });
  });

  app.post("/api/superadmin/logout", (req, res) => {
    req.session.superadminId = undefined;
    req.session.superadminUsername = undefined;
    res.json({ success: true });
  });

  // ==================== TENANT CRUD ====================

  app.get("/api/superadmin/tenants", requireSuperadmin, async (_req, res) => {
    try {
      const tenants = await storage.getTenants();
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  app.get("/api/superadmin/tenants/:id", requireSuperadmin, async (req, res) => {
    try {
      const tenant = await storage.getTenantById(req.params.id);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenant" });
    }
  });

  app.post("/api/superadmin/tenants", requireSuperadmin, async (req, res) => {
    try {
      const { name, slug, ...rest } = req.body;
      if (!name || !slug) {
        return res.status(400).json({ error: "Name and slug required" });
      }
      const existing = await storage.getTenantBySlug(slug);
      if (existing) {
        return res.status(409).json({ error: "Slug already exists" });
      }
      const tenant = await storage.createTenant({ name, slug, ...rest });

      try {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        await storage.createAdminUser({
          username: `admin_${slug}`,
          password: hashedPassword,
          role: "admin",
          isActive: true,
          tenantId: tenant.id,
        });
      } catch (adminError) {
        console.error("Failed to create admin user for tenant:", adminError);
      }

      res.status(201).json(tenant);
    } catch (error) {
      console.error("Failed to create tenant:", error);
      res.status(500).json({ error: "Failed to create tenant" });
    }
  });

  app.patch("/api/superadmin/tenants/:id", requireSuperadmin, async (req, res) => {
    try {
      const tenant = await storage.updateTenant(req.params.id, req.body);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ error: "Failed to update tenant" });
    }
  });

  app.delete("/api/superadmin/tenants/:id", requireSuperadmin, async (req, res) => {
    try {
      await storage.deleteTenant(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tenant" });
    }
  });

  app.get("/api/superadmin/tenants/status/:status", requireSuperadmin, async (req, res) => {
    try {
      const tenants = await storage.getTenantsByStatus(req.params.status);
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenants by status" });
    }
  });

  app.patch("/api/superadmin/tenants/:id/checklist", requireSuperadmin, async (req, res) => {
    try {
      const tenant = await storage.getTenantById(req.params.id);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      const currentChecklist = (tenant.pitchChecklist || {}) as Record<string, boolean>;
      const updated = await storage.updateTenant(req.params.id, {
        pitchChecklist: { ...currentChecklist, ...req.body } as any,
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update checklist" });
    }
  });

  app.post("/api/superadmin/change-password", requireSuperadmin, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new password required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }
      const admin = await storage.getSuperadminByUsername((req as any).superadminUsername);
      if (!admin) {
        return res.status(404).json({ error: "Admin not found" });
      }
      const valid = await bcrypt.compare(currentPassword, admin.password);
      if (!valid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateSuperadminPassword(admin.id, hashedPassword);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  app.get("/api/superadmin/tenants/:id/stats", requireSuperadmin, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.params.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ==================== PILOT CONFIGURATION ====================

  app.patch("/api/superadmin/tenants/:id/pilot", requireSuperadmin, async (req, res) => {
    try {
      const { logoUrl, heroImages, pilotMenuItems, demoReady } = req.body;
      const updateData: any = {};
      if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
      if (heroImages !== undefined) updateData.heroImages = heroImages;
      if (pilotMenuItems !== undefined) updateData.pilotMenuItems = pilotMenuItems;
      if (demoReady !== undefined) updateData.demoReady = demoReady;
      const tenant = await storage.updateTenant(req.params.id, updateData);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ error: "Failed to update pilot data" });
    }
  });

  // ==================== ACTIVATE TENANT ====================

  app.post("/api/superadmin/tenants/:id/activate", requireSuperadmin, async (req, res) => {
    try {
      const tenant = await storage.getTenantById(req.params.id);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });

      const pilotItems = (tenant.pilotMenuItems || []) as any[];
      if (pilotItems.length > 0 && !tenant.menuSeeded) {
        const cat = await storage.createCategory({ name: "Menu", tenantId: tenant.id, isActive: true, sortOrder: 0 });
        for (let i = 0; i < pilotItems.length; i++) {
          const item = pilotItems[i];
          await storage.createMenuItem({
            tenantId: tenant.id,
            name: item.name,
            description: item.description || "",
            price: item.price || "0",
            image: item.image || "",
            categoryId: cat.id,
            isAvailable: true,
            isPopular: false,
            sortOrder: i,
          });
        }
      }

      const updated = await storage.updateTenant(tenant.id, {
        status: "customer",
        isActive: true,
        menuSeeded: true,
        demoReady: true,
      });

      res.json(updated);
    } catch (error) {
      console.error("Failed to activate tenant:", error);
      res.status(500).json({ error: "Failed to activate tenant" });
    }
  });

  // ==================== PUBLIC PILOT PAGE (no auth) ====================

  app.get("/api/pilot/:slug", async (req, res) => {
    try {
      const tenant = await storage.getTenantBySlug(req.params.slug);
      if (!tenant || !tenant.demoReady) {
        return res.status(404).json({ error: "Pilot page not found" });
      }
      res.json({
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        heroImages: tenant.heroImages,
        pilotMenuItems: tenant.pilotMenuItems || [],
        contactPhone: tenant.contactPhone,
        city: tenant.city,
        address: tenant.address,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to load pilot page" });
    }
  });
}
