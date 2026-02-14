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
  insertCrossSellProductSchema,
  insertNeighborhoodSchema,
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import {
  isS3Configured,
  uploadBuffer,
  proxyS3Object,
  ensureLocalUploadsDir,
  saveLocalFile,
  getLocalUploadsDir,
  extractObjectKeyFromUrl,
  deleteObject,
} from "./s3-storage";

const upload = multer({ storage: multer.memoryStorage() });

ensureLocalUploadsDir();

// Image setting keys that should trigger old image deletion
const IMAGE_SETTING_KEYS = ["hero_image", "company_logo"];

declare module "express-session" {
  interface SessionData {
    adminId?: string;
    adminUsername?: string;
    adminRole?: string;
    tenantId?: string;
    superadminId?: string;
    superadminUsername?: string;
  }
}

const generateToken = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const tokenData = await storage.getAdminToken(token);
      if (tokenData && new Date(tokenData.expiresAt) > new Date()) {
        if (!req.session.adminId) {
          req.session.adminId = tokenData.adminId;
          req.session.adminUsername = tokenData.username;
          req.session.tenantId = tokenData.tenantId || undefined;
        }
        return next();
      }
    } catch (error) {
      // Token not found or expired
    }
  }
  
  if (req.session?.adminId) {
    return next();
  }
  
  return res.status(401).json({ error: "Unauthorized" });
};

const getTenantId = (req: Request): string | undefined => {
  return req.session?.tenantId;
};

const requireAdminRole = async (req: Request, res: Response, next: NextFunction) => {
  const adminId = req.session?.adminId;
  if (!adminId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const admin = await storage.getAdminUserById(adminId);
  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ error: "Admin role required" });
  }
  return next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories(getTenantId(req));
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory({ ...data, tenantId: getTenantId(req) });
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
      const category = await storage.updateCategory(req.params.id, data, getTenantId(req));
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
      await storage.deleteCategory(req.params.id, getTenantId(req));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Menu Items
  app.get("/api/menu-items", async (req, res) => {
    try {
      const menuItems = await storage.getMenuItems(getTenantId(req));
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  app.get("/api/menu-items/:id", async (req, res) => {
    try {
      const menuItem = await storage.getMenuItemById(req.params.id, getTenantId(req));
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
      const menuItem = await storage.createMenuItem({ ...data, tenantId: getTenantId(req) });
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
      const menuItem = await storage.updateMenuItem(req.params.id, data, getTenantId(req));
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
      await storage.deleteMenuItem(req.params.id, getTenantId(req));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  });

  // Customers
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers(getTenantId(req));
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomerById(req.params.id, getTenantId(req));
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
      const customer = await storage.createCustomer({ ...data, tenantId: getTenantId(req) });
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create customer" });
      }
    }
  });

  app.get("/api/customers/phone/:phone", requireAdmin, async (req, res) => {
    try {
      const phone = req.params.phone;
      const customer = await storage.getCustomerByPhone(phone, getTenantId(req));
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      const customerOrders = await storage.getOrdersByCustomer(customer.id, getTenantId(req));
      const ordersWithItems = await Promise.all(
        customerOrders.map(async (order) => {
          const items = await storage.getOrderItems(order.id);
          return { ...order, items };
        })
      );
      res.json({ customer, orders: ordersWithItems });
    } catch (error) {
      res.status(500).json({ error: "Failed to lookup customer" });
    }
  });

  app.get("/api/customers/search", requireAdmin, async (req, res) => {
    try {
      const q = (req.query.q as string || "").toLowerCase();
      if (!q || q.length < 2) {
        return res.json([]);
      }
      const allCustomers = await storage.getCustomers(getTenantId(req));
      const filtered = allCustomers.filter(c =>
        c.name.toLowerCase().includes(q) || c.phone.includes(q)
      ).slice(0, 20);
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ error: "Failed to search customers" });
    }
  });

  app.patch("/api/customers/:id", requireAdmin, async (req, res) => {
    try {
      const partialSchema = insertCustomerSchema.partial();
      const data = partialSchema.parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, data, getTenantId(req));
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  // Admin Customer Management
  app.get("/api/admin/customers", requireAdmin, async (req, res) => {
    try {
      const customers = await storage.getCustomersWithStats(getTenantId(req));
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.patch("/api/admin/customers/:id", requireAdmin, async (req, res) => {
    try {
      const partialSchema = insertCustomerSchema.partial();
      const data = partialSchema.parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, data, getTenantId(req));
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/admin/customers/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id, getTenantId(req));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // Customer Export (CSV/Excel)
  app.get("/api/admin/customers/export/:format", requireAdmin, async (req, res) => {
    try {
      const format = req.params.format;
      if (format !== "csv" && format !== "xlsx") {
        return res.status(400).json({ error: "Unsupported format. Use csv or xlsx." });
      }
      const customers = await storage.getCustomersWithStats(getTenantId(req));
      
      const exportData = customers.map(c => ({
        "Ad Soyad": c.name,
        "Telefon": c.phone,
        "Adres": c.address || "",
        "Mahalle": c.mahalle || "",
        "Sokak": c.sokak || "",
        "Bina No": c.binaNo || "",
        "Daire No": c.daireNo || "",
        "Notlar": c.notes || "",
        "Siparis Sayisi": c.orderCount || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Musteriler");

      if (format === "csv") {
        const csv = XLSX.utils.sheet_to_csv(ws);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=musteriler.csv");
        res.send("\uFEFF" + csv); // BOM for Excel UTF-8 compatibility
      } else {
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=musteriler.xlsx");
        res.send(buffer);
      }
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Export failed" });
    }
  });

  // Customer Import (CSV/Excel)
  app.post("/api/admin/customers/import", requireAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

      let imported = 0;
      let skipped = 0;

      for (const row of data) {
        const name = row["Ad Soyad"] || row["name"] || row["Name"] || row["ad soyad"];
        const phone = row["Telefon"] || row["phone"] || row["Phone"] || row["telefon"];

        if (!name || !phone) {
          skipped++;
          continue;
        }

        // Check if customer with same phone already exists
        const existing = await storage.getCustomerByPhone(String(phone), getTenantId(req));
        if (existing) {
          skipped++;
          continue;
        }

        await storage.createCustomer({
          name: String(name),
          phone: String(phone),
          address: row["Adres"] || row["address"] || row["Address"] || "",
          mahalle: row["Mahalle"] || row["mahalle"] || "",
          sokak: row["Sokak"] || row["sokak"] || "",
          binaNo: row["Bina No"] || row["binaNo"] || row["bina_no"] || "",
          daireNo: row["Daire No"] || row["daireNo"] || row["daire_no"] || "",
          notes: row["Notlar"] || row["notes"] || row["Notes"] || "",
          tenantId: getTenantId(req),
        });
        imported++;
      }

      res.json({ imported, skipped, total: data.length });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ error: "Import failed" });
    }
  });

  // Categories Export (CSV/Excel)
  app.get("/api/admin/categories/export/:format", requireAdmin, async (req, res) => {
    try {
      const format = req.params.format;
      if (format !== "csv" && format !== "xlsx") {
        return res.status(400).json({ error: "Unsupported format. Use csv or xlsx." });
      }
      const categories = await storage.getCategories(getTenantId(req));
      
      const exportData = categories.map(c => ({
        "ID": c.id,
        "Kategori Adi": c.name,
        "Aciklama": c.description || "",
        "Gorsel URL": c.image || "",
        "Sira": c.sortOrder || 0,
        "Aktif": c.isActive ? "Evet" : "Hayir",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Kategoriler");

      if (format === "csv") {
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=kategoriler.csv");
        res.send(csv);
      } else {
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=kategoriler.xlsx");
        res.send(buffer);
      }
    } catch (error) {
      console.error("Categories export error:", error);
      res.status(500).json({ error: "Export failed" });
    }
  });

  // Categories Import (CSV/Excel)
  app.post("/api/admin/categories/import", requireAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

      let imported = 0;
      let skipped = 0;

      for (const row of data) {
        const name = row["Kategori Adi"] || row["name"] || row["Name"] || row["kategori_adi"];
        
        if (!name) {
          skipped++;
          continue;
        }

        // Check if category with same name already exists
        const categories = await storage.getCategories(getTenantId(req));
        const existing = categories.find(c => c.name.toLowerCase() === String(name).toLowerCase());
        if (existing) {
          skipped++;
          continue;
        }

        await storage.createCategory({
          name: String(name),
          description: row["Aciklama"] || row["description"] || "",
          image: row["Gorsel URL"] || row["image"] || "",
          sortOrder: parseInt(row["Sira"] || row["sortOrder"] || "0") || 0,
          isActive: row["Aktif"] === "Evet" || row["isActive"] === true || row["Aktif"] !== "Hayir",
          tenantId: getTenantId(req),
        });
        imported++;
      }

      res.json({ imported, skipped, total: data.length });
    } catch (error) {
      console.error("Categories import error:", error);
      res.status(500).json({ error: "Import failed" });
    }
  });

  // Menu Items Export (CSV/Excel)
  app.get("/api/admin/menu-items/export/:format", requireAdmin, async (req, res) => {
    try {
      const format = req.params.format;
      if (format !== "csv" && format !== "xlsx") {
        return res.status(400).json({ error: "Unsupported format. Use csv or xlsx." });
      }
      const menuItems = await storage.getMenuItems(getTenantId(req));
      const categories = await storage.getCategories(getTenantId(req));
      
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));
      
      const exportData = menuItems.map(m => ({
        "ID": m.id,
        "Urun Adi": m.name,
        "Aciklama": m.description || "",
        "Fiyat": m.price,
        "Kategori": m.categoryId ? categoryMap.get(m.categoryId) || "" : "",
        "Gorsel URL": m.image || "",
        "Mevcut": m.isAvailable ? "Evet" : "Hayir",
        "Populer": m.isPopular ? "Evet" : "Hayir",
        "Kampanya": m.isKampanya ? "Evet" : "Hayir",
        "Kampanya Etiketi": m.kampanyaTag || "",
        "Sira": m.sortOrder || 0,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Menu");

      if (format === "csv") {
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=menu.csv");
        res.send(csv);
      } else {
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=menu.xlsx");
        res.send(buffer);
      }
    } catch (error) {
      console.error("Menu items export error:", error);
      res.status(500).json({ error: "Export failed" });
    }
  });

  // Menu Items Import (CSV/Excel)
  app.post("/api/admin/menu-items/import", requireAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

      const categories = await storage.getCategories(getTenantId(req));
      const categoryNameMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

      let imported = 0;
      let skipped = 0;

      for (const row of data) {
        const name = row["Urun Adi"] || row["name"] || row["Name"] || row["urun_adi"];
        const price = row["Fiyat"] || row["price"] || row["Price"];
        
        if (!name || !price) {
          skipped++;
          continue;
        }

        // Check if menu item with same name already exists
        const menuItems = await storage.getMenuItems(getTenantId(req));
        const existing = menuItems.find(m => m.name.toLowerCase() === String(name).toLowerCase());
        if (existing) {
          skipped++;
          continue;
        }

        const categoryName = row["Kategori"] || row["category"] || "";
        const categoryId = categoryNameMap.get(String(categoryName).toLowerCase()) || null;

        await storage.createMenuItem({
          name: String(name),
          description: row["Aciklama"] || row["description"] || "",
          price: String(price),
          image: row["Gorsel URL"] || row["image"] || "",
          categoryId,
          isAvailable: row["Mevcut"] === "Evet" || row["isAvailable"] === true || row["Mevcut"] !== "Hayir",
          isPopular: row["Populer"] === "Evet" || row["isPopular"] === true,
          isKampanya: row["Kampanya"] === "Evet" || row["isKampanya"] === true,
          kampanyaTag: row["Kampanya Etiketi"] || row["kampanyaTag"] || "",
          sortOrder: parseInt(row["Sira"] || row["sortOrder"] || "0") || 0,
          tenantId: getTenantId(req),
        });
        imported++;
      }

      res.json({ imported, skipped, total: data.length });
    } catch (error) {
      console.error("Menu items import error:", error);
      res.status(500).json({ error: "Import failed" });
    }
  });

  // Orders Export (CSV/Excel)
  app.get("/api/admin/orders/export/:format", requireAdmin, async (req, res) => {
    try {
      const format = req.params.format;
      if (format !== "csv" && format !== "xlsx") {
        return res.status(400).json({ error: "Unsupported format. Use csv or xlsx." });
      }
      const orders = await storage.getOrders(getTenantId(req));
      
      const statusMap: Record<string, string> = {
        pending: "Beklemede",
        confirmed: "Onaylandi",
        preparing: "Hazirlaniyor",
        ready: "Hazir",
        delivered: "Teslim Edildi",
        cancelled: "Iptal",
      };

      const paymentMap: Record<string, string> = {
        cash: "Nakit",
        credit_card: "Kredi Karti",
        online: "Online",
      };
      
      const exportData = orders.map(o => ({
        "Siparis No": o.id,
        "Musteri Adi": o.customerName,
        "Telefon": o.customerPhone,
        "Adres": o.customerAddress,
        "Durum": statusMap[o.status || "pending"] || o.status,
        "Odeme": paymentMap[o.paymentMethod || "cash"] || o.paymentMethod,
        "Ara Toplam": o.subtotal,
        "Toplam": o.total,
        "Notlar": o.notes || "",
        "Tarih": o.createdAt ? new Date(o.createdAt).toLocaleString("tr-TR") : "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Siparisler");

      if (format === "csv") {
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=siparisler.csv");
        res.send(csv);
      } else {
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=siparisler.xlsx");
        res.send(buffer);
      }
    } catch (error) {
      console.error("Orders export error:", error);
      res.status(500).json({ error: "Export failed" });
    }
  });

  // Reviews Export (CSV/Excel)
  app.get("/api/admin/reviews/export/:format", requireAdmin, async (req, res) => {
    try {
      const format = req.params.format;
      if (format !== "csv" && format !== "xlsx") {
        return res.status(400).json({ error: "Unsupported format. Use csv or xlsx." });
      }
      const reviews = await storage.getReviews(getTenantId(req));
      
      const exportData = reviews.map(r => ({
        "ID": r.id,
        "Musteri Adi": r.customerName,
        "Puan": r.rating,
        "Yorum": r.comment || "",
        "Urun": r.menuItemName || "",
        "Onaylandi": r.isApproved ? "Evet" : "Hayir",
        "Tarih": r.createdAt ? new Date(r.createdAt).toLocaleString("tr-TR") : "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Yorumlar");

      if (format === "csv") {
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=yorumlar.csv");
        res.send(csv);
      } else {
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=yorumlar.xlsx");
        res.send(buffer);
      }
    } catch (error) {
      console.error("Reviews export error:", error);
      res.status(500).json({ error: "Export failed" });
    }
  });

  // Reviews Import (CSV/Excel)
  app.post("/api/admin/reviews/import", requireAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

      let imported = 0;
      let skipped = 0;

      for (const row of data) {
        const customerName = row["Musteri Adi"] || row["customerName"] || row["name"];
        const rating = row["Puan"] || row["rating"];
        
        if (!customerName || !rating) {
          skipped++;
          continue;
        }

        await storage.createReview({
          customerName: String(customerName),
          rating: parseInt(String(rating)) || 5,
          comment: row["Yorum"] || row["comment"] || "",
          menuItemName: row["Urun"] || row["menuItemName"] || "",
          isApproved: row["Onaylandi"] === "Evet" || row["isApproved"] === true || row["Onaylandi"] !== "Hayir",
          tenantId: getTenantId(req),
        });
        imported++;
      }

      res.json({ imported, skipped, total: data.length });
    } catch (error) {
      console.error("Reviews import error:", error);
      res.status(500).json({ error: "Import failed" });
    }
  });

  // Orders
  app.get("/api/orders", async (req, res) => {
    try {
      const allOrders = await storage.getOrders(getTenantId(req));
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
      const order = await storage.getOrderById(req.params.id, getTenantId(req));
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
      
      const tenantId = getTenantId(req);
      // Find or create customer
      let customer = await storage.getCustomerByPhone(orderData.customerPhone, tenantId);
      if (!customer) {
        customer = await storage.createCustomer({
          name: orderData.customerName,
          phone: orderData.customerPhone,
          address: orderData.customerAddress,
          tenantId,
        });
      }

      // Create order
      const order = await storage.createOrder({
        ...orderData,
        customerId: customer.id,
        status: "pending",
        tenantId,
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
            tenantId,
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
      const order = await storage.updateOrderStatus(req.params.id, status, getTenantId(req));
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  app.delete("/api/admin/orders/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteOrder(req.params.id, getTenantId(req));
      if (!deleted) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  // Reviews
  app.get("/api/reviews", async (req, res) => {
    try {
      const reviews = await storage.getApprovedReviews(getTenantId(req));
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const data = insertReviewSchema.parse(req.body);
      const review = await storage.createReview({ ...data, tenantId: getTenantId(req) });
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
      const stats = await storage.getDashboardStats(getTenantId(req));
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Site Settings (public)
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getAllSettings(getTenantId(req));
      const settingsMap: Record<string, string> = {};
      settings.forEach(s => {
        if (s.value) settingsMap[s.key] = s.value;
      });
      res.json(settingsMap);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // ==================== ADMIN ROUTES ====================

  // Admin Auth
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const admin = await storage.getAdminByUsername(username);
      if (!admin) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!admin.isActive) {
        return res.status(401).json({ error: "Account disabled" });
      }

      req.session.adminId = admin.id;
      req.session.adminUsername = admin.username;
      req.session.adminRole = admin.role || "operator";
      req.session.tenantId = admin.tenantId || undefined;
      await storage.updateAdminLastLogin(admin.id);

      const token = generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.createAdminToken(token, admin.id, admin.username, expiresAt, admin.tenantId || undefined);
      
      // Cleanup expired tokens periodically
      await storage.cleanupExpiredTokens();

      // Ensure session is saved before responding
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ error: "Session save failed" });
        }
        res.json({ success: true, username: admin.username, role: admin.role || "operator", token });
      });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/admin/me", requireAdmin, async (req, res) => {
    const adminId = req.session.adminId;
    if (adminId) {
      const admin = await storage.getAdminUserById(adminId);
      if (admin) {
        return res.json({ username: admin.username, role: admin.role });
      }
    }
    res.json({ username: req.session.adminUsername });
  });

  // Admin User Management
  app.get("/api/admin/users", requireAdmin, requireAdminRole, async (req, res) => {
    try {
      const users = await storage.getAllAdminUsers(getTenantId(req));
      const sanitized = users.map(({ password, ...rest }) => rest);
      res.json(sanitized);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", requireAdmin, requireAdminRole, async (req, res) => {
    try {
      const { username, password, role, isActive } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      if (typeof username !== "string" || username.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }
      if (typeof password !== "string" || password.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters" });
      }
      const validRoles = ["admin", "manager", "operator"];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      const existing = await storage.getAdminByUsername(username, getTenantId(req));
      if (existing) {
        return res.status(409).json({ error: "Username already exists" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createAdminUser({
        username,
        password: hashedPassword,
        role: role || "operator",
        isActive: isActive !== false,
        tenantId: getTenantId(req),
      });
      const { password: _, ...sanitized } = user;
      res.json(sanitized);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/admin/users/:id", requireAdmin, requireAdminRole, async (req, res) => {
    try {
      const { id } = req.params;
      const { username, password, role, isActive } = req.body;
      const validRoles = ["admin", "manager", "operator"];
      if (role !== undefined && !validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      if (username !== undefined && (typeof username !== "string" || username.length < 3)) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }
      if (password && (typeof password !== "string" || password.length < 4)) {
        return res.status(400).json({ error: "Password must be at least 4 characters" });
      }
      if (username !== undefined) {
        const existing = await storage.getAdminByUsername(username, getTenantId(req));
        if (existing && existing.id !== id) {
          return res.status(409).json({ error: "Username already exists" });
        }
      }
      const updateData: Record<string, any> = {};
      if (username !== undefined) updateData.username = username;
      if (password) updateData.password = await bcrypt.hash(password, 10);
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;

      const updated = await storage.updateAdminUser(id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password: _, ...sanitized } = updated;
      res.json(sanitized);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, requireAdminRole, async (req, res) => {
    try {
      const { id } = req.params;
      if (id === req.session.adminId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      const deleted = await storage.deleteAdminUser(id);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Admin Settings
  app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getAllSettings(getTenantId(req));
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key) {
        return res.status(400).json({ error: "Key is required" });
      }
      
      if (IMAGE_SETTING_KEYS.includes(key)) {
        const oldSetting = await storage.getSetting(key, getTenantId(req));
        if (oldSetting?.value) {
          try {
            const s3Key = extractObjectKeyFromUrl(oldSetting.value);
            if (isS3Configured() && s3Key) {
              await deleteObject(s3Key);
            } else if (oldSetting.value.startsWith("/uploads/")) {
              const localPath = path.join(getLocalUploadsDir(), path.basename(oldSetting.value));
              if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
            }
          } catch {}
        }
      }
      
      const setting = await storage.setSetting(key, value || "", getTenantId(req));
      res.json(setting);
    } catch (error) {
      console.error("Error saving setting:", error);
      res.status(500).json({ error: "Failed to save setting" });
    }
  });

  // Admin Reviews
  app.get("/api/admin/reviews", requireAdmin, async (req, res) => {
    try {
      const reviews = await storage.getAllReviews(getTenantId(req));
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.patch("/api/admin/reviews/:id", requireAdmin, async (req, res) => {
    try {
      const partialSchema = insertReviewSchema.partial();
      const data = partialSchema.parse(req.body);
      const review = await storage.updateReview(req.params.id, data, getTenantId(req));
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }
      res.json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update review" });
    }
  });

  app.delete("/api/admin/reviews/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteReview(req.params.id, getTenantId(req));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  // Cross-sell Products (Admin)
  app.get("/api/admin/cross-sell", requireAdmin, async (req, res) => {
    try {
      const products = await storage.getCrossSellProducts(getTenantId(req));
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cross-sell products" });
    }
  });

  app.post("/api/admin/cross-sell", requireAdmin, async (req, res) => {
    try {
      const data = insertCrossSellProductSchema.parse(req.body);
      const product = await storage.addCrossSellProduct({ ...data, tenantId: getTenantId(req) });
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to add cross-sell product" });
    }
  });

  app.patch("/api/admin/cross-sell/:id", requireAdmin, async (req, res) => {
    try {
      const partialSchema = insertCrossSellProductSchema.partial();
      const data = partialSchema.parse(req.body);
      const product = await storage.updateCrossSellProduct(req.params.id, data, getTenantId(req));
      if (!product) {
        return res.status(404).json({ error: "Cross-sell product not found" });
      }
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update cross-sell product" });
    }
  });

  app.delete("/api/admin/cross-sell/:id", requireAdmin, async (req, res) => {
    try {
      await storage.removeCrossSellProduct(req.params.id, getTenantId(req));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to remove cross-sell product" });
    }
  });

  // Cross-sell Products (Public - for basket display)
  app.get("/api/cross-sell", async (req, res) => {
    try {
      const products = await storage.getActiveCrossSellProducts(getTenantId(req));
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cross-sell products" });
    }
  });

  // Neighborhoods (Public - for delivery form)
  app.get("/api/neighborhoods", async (req, res) => {
    try {
      const neighborhoods = await storage.getActiveNeighborhoods(getTenantId(req));
      res.json(neighborhoods);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch neighborhoods" });
    }
  });

  // Admin Neighborhoods (protected)
  app.get("/api/admin/neighborhoods", requireAdmin, async (req, res) => {
    try {
      const neighborhoods = await storage.getNeighborhoods(getTenantId(req));
      res.json(neighborhoods);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch neighborhoods" });
    }
  });

  app.post("/api/admin/neighborhoods", requireAdmin, async (req, res) => {
    try {
      const data = insertNeighborhoodSchema.parse(req.body);
      const neighborhood = await storage.createNeighborhood({ ...data, tenantId: getTenantId(req) });
      res.status(201).json(neighborhood);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create neighborhood" });
      }
    }
  });

  app.patch("/api/admin/neighborhoods/:id", requireAdmin, async (req, res) => {
    try {
      const partialSchema = insertNeighborhoodSchema.partial();
      const data = partialSchema.parse(req.body);
      const neighborhood = await storage.updateNeighborhood(req.params.id, data, getTenantId(req));
      if (!neighborhood) {
        return res.status(404).json({ error: "Neighborhood not found" });
      }
      res.json(neighborhood);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update neighborhood" });
      }
    }
  });

  app.delete("/api/admin/neighborhoods/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteNeighborhood(req.params.id, getTenantId(req));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete neighborhood" });
    }
  });

  // Profit Channels
  app.get("/api/admin/profit-channels", requireAdmin, async (req, res) => {
    try {
      const channels = await storage.getProfitChannels(getTenantId(req));
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profit channels" });
    }
  });

  app.post("/api/admin/profit-channels", requireAdmin, async (req, res) => {
    try {
      const channel = await storage.createProfitChannel({ ...req.body, tenantId: getTenantId(req) });
      res.status(201).json(channel);
    } catch (error) {
      res.status(500).json({ error: "Failed to create profit channel" });
    }
  });

  app.patch("/api/admin/profit-channels/:id", requireAdmin, async (req, res) => {
    try {
      const channel = await storage.updateProfitChannel(req.params.id, req.body, getTenantId(req));
      if (!channel) return res.status(404).json({ error: "Channel not found" });
      res.json(channel);
    } catch (error) {
      res.status(500).json({ error: "Failed to update profit channel" });
    }
  });

  app.delete("/api/admin/profit-channels/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteProfitChannel(req.params.id, getTenantId(req));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete profit channel" });
    }
  });

  // Daily Channel Revenues
  app.get("/api/admin/daily-revenues", requireAdmin, async (req, res) => {
    try {
      const { date, startDate, endDate } = req.query;
      if (startDate && endDate) {
        const revenues = await storage.getDailyRevenuesByRange(startDate as string, endDate as string, getTenantId(req));
        return res.json(revenues);
      }
      const revenues = await storage.getDailyRevenues(date as string || new Date().toISOString().split("T")[0], getTenantId(req));
      res.json(revenues);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch daily revenues" });
    }
  });

  app.post("/api/admin/daily-revenues", requireAdmin, async (req, res) => {
    try {
      const revenue = await storage.upsertDailyRevenue({ ...req.body, tenantId: getTenantId(req) });
      res.status(201).json(revenue);
    } catch (error) {
      res.status(500).json({ error: "Failed to save daily revenue" });
    }
  });

  app.delete("/api/admin/daily-revenues/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteDailyRevenue(req.params.id, getTenantId(req));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete daily revenue" });
    }
  });

  // Qollao own-platform daily revenue auto-calculation from orders
  app.get("/api/admin/qollao-daily-revenue", requireAdmin, async (req, res) => {
    try {
      const { date } = req.query;
      const targetDate = (date as string) || new Date().toISOString().split("T")[0];
      const allOrders = await storage.getOrders(getTenantId(req));
      const dayOrders = allOrders.filter(o => {
        if (!o.createdAt) return false;
        const orderDate = new Date(o.createdAt).toISOString().split("T")[0];
        return orderDate === targetDate && o.status !== "cancelled";
      });
      const revenue = dayOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);
      res.json({ date: targetDate, revenue: revenue.toFixed(2), orderCount: dayOrders.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate Qollao revenue" });
    }
  });

  // Admin Categories (protected versions)
  app.post("/api/admin/categories", requireAdmin, async (req, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory({ ...data, tenantId: getTenantId(req) });
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create category" });
      }
    }
  });

  app.patch("/api/admin/categories/:id", requireAdmin, async (req, res) => {
    try {
      const partialSchema = insertCategorySchema.partial();
      const data = partialSchema.parse(req.body);
      const category = await storage.updateCategory(req.params.id, data, getTenantId(req));
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

  app.delete("/api/admin/categories/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id, getTenantId(req));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Admin Menu Items (protected versions)
  app.post("/api/admin/menu-items", requireAdmin, async (req, res) => {
    try {
      const data = insertMenuItemSchema.parse(req.body);
      const menuItem = await storage.createMenuItem({ ...data, tenantId: getTenantId(req) });
      res.status(201).json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create menu item" });
      }
    }
  });

  app.patch("/api/admin/menu-items/:id", requireAdmin, async (req, res) => {
    try {
      const partialSchema = insertMenuItemSchema.partial();
      const data = partialSchema.parse(req.body);
      const menuItem = await storage.updateMenuItem(req.params.id, data, getTenantId(req));
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

  app.delete("/api/admin/menu-items/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteMenuItem(req.params.id, getTenantId(req));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  });

  app.use("/uploads", express.static(getLocalUploadsDir()));

  app.post("/api/uploads/local", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (isS3Configured()) {
        const result = await uploadBuffer(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
        res.json({ path: result.publicUrl });
      } else {
        const result = saveLocalFile(req.file.buffer, req.file.originalname);
        res.json({ path: result.filePath });
      }
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // ==================== DOMAIN RESOLUTION ====================

  app.get("/api/resolve-domain", async (req, res) => {
    try {
      const hostname = (req.query.hostname as string || req.hostname || "").toLowerCase().replace(/^www\./, "");
      if (!hostname) return res.json({ tenant: null });
      const tenant = await storage.getTenantByDomain(hostname);
      if (!tenant || !tenant.isActive) return res.json({ tenant: null });
      res.json({ tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, customDomain: tenant.customDomain } });
    } catch (error) {
      res.json({ tenant: null });
    }
  });

  // ==================== TENANT-SCOPED PUBLIC ENDPOINTS (for pilot pages) ====================

  app.get("/api/t/:slug/settings", async (req, res) => {
    try {
      const tenant = await storage.getTenantBySlug(req.params.slug);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      const settings = await storage.getAllSettings(tenant.id);
      const settingsMap: Record<string, string> = {};
      settings.forEach(s => {
        if (s.value) settingsMap[s.key] = s.value;
      });
      res.json(settingsMap);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.get("/api/t/:slug/categories", async (req, res) => {
    try {
      const tenant = await storage.getTenantBySlug(req.params.slug);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      const cats = await storage.getCategories(tenant.id);
      res.json(cats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/t/:slug/menu-items", async (req, res) => {
    try {
      const tenant = await storage.getTenantBySlug(req.params.slug);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      const items = await storage.getMenuItems(tenant.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  app.get("/api/t/:slug/reviews", async (req, res) => {
    try {
      const tenant = await storage.getTenantBySlug(req.params.slug);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      const revs = await storage.getApprovedReviews(tenant.id);
      res.json(revs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  return httpServer;
}
