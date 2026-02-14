import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import bcrypt from "bcryptjs";

const requireSuperadmin = async (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.superadminId) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
};

export function registerSuperadminRoutes(app: Express) {
  // Superadmin login
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
      req.session.superadminId = admin.id;
      req.session.superadminUsername = admin.username;
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ error: "Session save failed" });
        }
        res.json({ id: admin.id, username: admin.username });
      });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Check superadmin auth
  app.get("/api/superadmin/me", requireSuperadmin, (req, res) => {
    res.json({ id: req.session.superadminId, username: req.session.superadminUsername });
  });

  // Superadmin logout
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

  // Pipeline filter
  app.get("/api/superadmin/tenants/status/:status", requireSuperadmin, async (req, res) => {
    try {
      const tenants = await storage.getTenantsByStatus(req.params.status);
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenants by status" });
    }
  });

  // Update pitch checklist
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

  // Get tenant stats (orders count, revenue)
  app.get("/api/superadmin/tenants/:id/stats", requireSuperadmin, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.params.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
}
