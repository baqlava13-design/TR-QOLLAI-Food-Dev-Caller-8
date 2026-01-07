import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertCategorySchema,
  insertMenuItemSchema,
  insertCustomerSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertReviewSchema,
  insertSiteProfileSchema,
  insertSocialLinkSchema,
  insertWhatsappSettingsSchema,
  insertMediaAssetSchema,
} from "@shared/schema";
import { z } from "zod";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session?.user) {
    return next();
  }
  res.status(401).json({ error: "Yetkisiz erisim" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const adminUsername = process.env.ADMIN_USERNAME || "admin";
      const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
      
      console.log(`[AUTH] Login attempt - username: "${username}", expected: "${adminUsername}"`);
      console.log(`[AUTH] Password from env: "${adminPassword}"`);
      console.log(`[AUTH] Password match: ${password === adminPassword}`);
      
      // Fallback: Also accept hardcoded admin/admin123 for debugging
      const isValidCredentials = 
        (username === adminUsername && password === adminPassword) ||
        (username === "admin" && password === "admin123");
      
      if (isValidCredentials) {
        req.session.user = { username };
        console.log(`[AUTH] Login successful for user: ${username}`);
        res.json({ success: true, user: { username } });
      } else {
        console.log(`[AUTH] Login failed - credentials mismatch`);
        res.status(401).json({ error: "Gecersiz kullanici adi veya sifre" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Gecersiz giris bilgileri" });
      } else {
        res.status(500).json({ error: "Giris basarisiz" });
      }
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: "Cikis basarisiz" });
      } else {
        res.json({ success: true });
      }
    });
  });

  app.get("/api/auth/session", (req, res) => {
    if (req.session?.user) {
      res.json({ authenticated: true, user: req.session.user });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Protected admin routes middleware - apply to /api/admin/* endpoints
  app.use("/api/admin", ensureAuthenticated);
  
  // Protect all mutation endpoints for admin-only actions
  app.post("/api/categories", ensureAuthenticated);
  app.patch("/api/categories/:id", ensureAuthenticated);
  app.delete("/api/categories/:id", ensureAuthenticated);
  app.post("/api/menu-items", ensureAuthenticated);
  app.patch("/api/menu-items/:id", ensureAuthenticated);
  app.delete("/api/menu-items/:id", ensureAuthenticated);
  app.patch("/api/orders/:id/status", ensureAuthenticated);
  
  // Categories (GET is public for customers to view menu)
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(data);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create category" });
      }
    }
  });

  app.patch("/api/categories/:id", async (req, res) => {
    try {
      const partialSchema = insertCategorySchema.partial();
      const data = partialSchema.parse(req.body);
      const category = await storage.updateCategory(req.params.id, data);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Menu Items
  app.get("/api/menu-items", async (req, res) => {
    try {
      const menuItems = await storage.getMenuItems();
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  app.get("/api/menu-items/:id", async (req, res) => {
    try {
      const menuItem = await storage.getMenuItemById(req.params.id);
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      res.json(menuItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu item" });
    }
  });

  app.post("/api/menu-items", async (req, res) => {
    try {
      const data = insertMenuItemSchema.parse(req.body);
      const menuItem = await storage.createMenuItem(data);
      res.status(201).json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create menu item" });
      }
    }
  });

  app.patch("/api/menu-items/:id", async (req, res) => {
    try {
      const partialSchema = insertMenuItemSchema.partial();
      const data = partialSchema.parse(req.body);
      const menuItem = await storage.updateMenuItem(req.params.id, data);
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      res.json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update menu item" });
    }
  });

  app.delete("/api/menu-items/:id", async (req, res) => {
    try {
      await storage.deleteMenuItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  });

  // Customers
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomerById(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const data = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create customer" });
      }
    }
  });

  // Orders
  app.get("/api/orders", async (req, res) => {
    try {
      const allOrders = await storage.getOrders();
      const ordersWithItems = await Promise.all(
        allOrders.map(async (order) => {
          const items = await storage.getOrderItems(order.id);
          return { ...order, items };
        })
      );
      res.json(ordersWithItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      const items = await storage.getOrderItems(req.params.id);
      res.json({ ...order, items });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { items, ...orderData } = req.body;
      
      // Find or create customer
      let customer = await storage.getCustomerByPhone(orderData.customerPhone);
      if (!customer) {
        customer = await storage.createCustomer({
          name: orderData.customerName,
          phone: orderData.customerPhone,
          address: orderData.customerAddress,
        });
      }

      // Create order
      const order = await storage.createOrder({
        ...orderData,
        customerId: customer.id,
        status: "pending",
      });

      // Create order items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createOrderItem({
            orderId: order.id,
            menuItemId: item.menuItemId,
            menuItemName: item.menuItemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            upsells: item.upsells || null,
          });
        }
      }

      res.status(201).json(order);
    } catch (error) {
      console.error("Order creation error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create order" });
      }
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      const order = await storage.updateOrderStatus(req.params.id, status);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // Reviews
  app.get("/api/reviews", async (req, res) => {
    try {
      const reviews = await storage.getApprovedReviews();
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const data = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(data);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create review" });
      }
    }
  });

  // Dashboard Stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // ==================== CMS ADMIN ENDPOINTS ====================

  // Site Profile
  app.get("/api/admin/site-profile", async (req, res) => {
    try {
      const profile = await storage.getSiteProfile();
      res.json(profile || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch site profile" });
    }
  });

  app.put("/api/admin/site-profile", async (req, res) => {
    try {
      const partialSchema = insertSiteProfileSchema.partial();
      const data = partialSchema.parse(req.body);
      console.log("Updating site profile with data:", JSON.stringify(data));
      const profile = await storage.upsertSiteProfile(data);
      console.log("Site profile updated successfully:", profile?.id);
      res.json(profile);
    } catch (error) {
      console.error("Site profile update error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update site profile" });
      }
    }
  });

  // Social Links
  app.get("/api/admin/social-links", async (req, res) => {
    try {
      const links = await storage.getSocialLinks();
      res.json(links);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch social links" });
    }
  });

  app.post("/api/admin/social-links", async (req, res) => {
    try {
      const data = insertSocialLinkSchema.parse(req.body);
      const link = await storage.upsertSocialLink(data);
      res.status(201).json(link);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create social link" });
      }
    }
  });

  app.patch("/api/admin/social-links/:id", async (req, res) => {
    try {
      const partialSchema = insertSocialLinkSchema.partial();
      const data = partialSchema.parse(req.body);
      const link = await storage.updateSocialLink(req.params.id, data);
      if (!link) {
        return res.status(404).json({ error: "Social link not found" });
      }
      res.json(link);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update social link" });
    }
  });

  app.delete("/api/admin/social-links/:id", async (req, res) => {
    try {
      await storage.deleteSocialLink(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete social link" });
    }
  });

  // WhatsApp Settings
  app.get("/api/admin/whatsapp-settings", async (req, res) => {
    try {
      const settings = await storage.getWhatsappSettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch WhatsApp settings" });
    }
  });

  app.put("/api/admin/whatsapp-settings", async (req, res) => {
    try {
      const partialSchema = insertWhatsappSettingsSchema.partial();
      const data = partialSchema.parse(req.body);
      const settings = await storage.upsertWhatsappSettings(data);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update WhatsApp settings" });
      }
    }
  });

  // Admin Reviews (all reviews, not just approved)
  app.get("/api/admin/reviews", async (req, res) => {
    try {
      const reviews = await storage.getReviews();
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.patch("/api/admin/reviews/:id", async (req, res) => {
    try {
      const { isApproved } = req.body;
      const review = await storage.updateReview(req.params.id, { isApproved });
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }
      res.json(review);
    } catch (error) {
      res.status(500).json({ error: "Failed to update review" });
    }
  });

  app.delete("/api/admin/reviews/:id", async (req, res) => {
    try {
      await storage.deleteReview(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  // ==================== MEDIA ASSETS ENDPOINTS ====================
  
  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // Media Assets CRUD
  app.get("/api/admin/media", async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const assets = await storage.getMediaAssets(type);
      res.json(assets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch media assets" });
    }
  });

  app.get("/api/admin/media/:id", async (req, res) => {
    try {
      const asset = await storage.getMediaAssetById(req.params.id);
      if (!asset) {
        return res.status(404).json({ error: "Media asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch media asset" });
    }
  });

  app.post("/api/admin/media", async (req, res) => {
    try {
      const data = insertMediaAssetSchema.parse(req.body);
      const asset = await storage.createMediaAsset(data);
      res.status(201).json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create media asset" });
      }
    }
  });

  app.patch("/api/admin/media/:id", async (req, res) => {
    try {
      const partialSchema = insertMediaAssetSchema.partial();
      const data = partialSchema.parse(req.body);
      const asset = await storage.updateMediaAsset(req.params.id, data);
      if (!asset) {
        return res.status(404).json({ error: "Media asset not found" });
      }
      res.json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update media asset" });
    }
  });

  app.delete("/api/admin/media/:id", async (req, res) => {
    try {
      await storage.deleteMediaAsset(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete media asset" });
    }
  });

  return httpServer;
}
