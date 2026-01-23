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
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";

const upload = multer({ storage: multer.memoryStorage() });
const objectStorageService = new ObjectStorageService();

const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});
const localUpload = multer({ storage: diskStorage });

// Image setting keys that should trigger old image deletion
const IMAGE_SETTING_KEYS = ["hero_image", "company_logo"];

declare module "express-session" {
  interface SessionData {
    adminId?: string;
    adminUsername?: string;
  }
}

const generateToken = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const tokenData = await storage.getAdminToken(token);
      if (tokenData && new Date(tokenData.expiresAt) > new Date()) {
        return next();
      }
    } catch (error) {
      // Token not found or expired
    }
  }
  
  // Fallback to session
  if (req.session?.adminId) {
    return next();
  }
  
  return res.status(401).json({ error: "Unauthorized" });
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Categories
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

  // Admin Customer Management
  app.get("/api/admin/customers", requireAdmin, async (req, res) => {
    try {
      const customers = await storage.getCustomersWithStats();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.patch("/api/admin/customers/:id", requireAdmin, async (req, res) => {
    try {
      const partialSchema = insertCustomerSchema.partial();
      const data = partialSchema.parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, data);
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
      await storage.deleteCustomer(req.params.id);
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
      const customers = await storage.getCustomersWithStats();
      
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
        const existing = await storage.getCustomerByPhone(String(phone));
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
      const categories = await storage.getCategories();
      
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
        const categories = await storage.getCategories();
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
      const menuItems = await storage.getMenuItems();
      const categories = await storage.getCategories();
      
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

      const categories = await storage.getCategories();
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
        const menuItems = await storage.getMenuItems();
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
      const orders = await storage.getOrders();
      
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
      const reviews = await storage.getReviews();
      
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

  app.delete("/api/admin/orders/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteOrder(req.params.id);
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

  // Site Settings (public)
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
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
      await storage.updateAdminLastLogin(admin.id);

      // Generate token for Authorization header auth (works in iframes)
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await storage.createAdminToken(token, admin.id, admin.username, expiresAt);
      
      // Cleanup expired tokens periodically
      await storage.cleanupExpiredTokens();

      // Ensure session is saved before responding
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ error: "Session save failed" });
        }
        res.json({ success: true, username: admin.username, token });
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

  app.get("/api/admin/me", requireAdmin, (req, res) => {
    res.json({ username: req.session.adminUsername });
  });

  // Admin Settings
  app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
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
      
      // If this is an image setting, delete the old image first
      if (IMAGE_SETTING_KEYS.includes(key)) {
        const oldSetting = await storage.getSetting(key);
        if (oldSetting?.value && objectStorageService.isLocalObjectPath(oldSetting.value)) {
          // Delete old image from object storage
          await objectStorageService.deleteObject(oldSetting.value);
        }
      }
      
      const setting = await storage.setSetting(key, value || "");
      res.json(setting);
    } catch (error) {
      console.error("Error saving setting:", error);
      res.status(500).json({ error: "Failed to save setting" });
    }
  });

  // Admin Reviews
  app.get("/api/admin/reviews", requireAdmin, async (req, res) => {
    try {
      const reviews = await storage.getAllReviews();
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.patch("/api/admin/reviews/:id", requireAdmin, async (req, res) => {
    try {
      const partialSchema = insertReviewSchema.partial();
      const data = partialSchema.parse(req.body);
      const review = await storage.updateReview(req.params.id, data);
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
      await storage.deleteReview(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  // Cross-sell Products (Admin)
  app.get("/api/admin/cross-sell", requireAdmin, async (req, res) => {
    try {
      const products = await storage.getCrossSellProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cross-sell products" });
    }
  });

  app.post("/api/admin/cross-sell", requireAdmin, async (req, res) => {
    try {
      const data = insertCrossSellProductSchema.parse(req.body);
      const product = await storage.addCrossSellProduct(data);
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
      const product = await storage.updateCrossSellProduct(req.params.id, data);
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
      await storage.removeCrossSellProduct(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to remove cross-sell product" });
    }
  });

  // Cross-sell Products (Public - for basket display)
  app.get("/api/cross-sell", async (req, res) => {
    try {
      const products = await storage.getActiveCrossSellProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cross-sell products" });
    }
  });

  // Neighborhoods (Public - for delivery form)
  app.get("/api/neighborhoods", async (req, res) => {
    try {
      const neighborhoods = await storage.getActiveNeighborhoods();
      res.json(neighborhoods);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch neighborhoods" });
    }
  });

  // Admin Neighborhoods (protected)
  app.get("/api/admin/neighborhoods", requireAdmin, async (req, res) => {
    try {
      const neighborhoods = await storage.getNeighborhoods();
      res.json(neighborhoods);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch neighborhoods" });
    }
  });

  app.post("/api/admin/neighborhoods", requireAdmin, async (req, res) => {
    try {
      const data = insertNeighborhoodSchema.parse(req.body);
      const neighborhood = await storage.createNeighborhood(data);
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
      const neighborhood = await storage.updateNeighborhood(req.params.id, data);
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
      await storage.deleteNeighborhood(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete neighborhood" });
    }
  });

  // Admin Categories (protected versions)
  app.post("/api/admin/categories", requireAdmin, async (req, res) => {
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

  app.patch("/api/admin/categories/:id", requireAdmin, async (req, res) => {
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

  app.delete("/api/admin/categories/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Admin Menu Items (protected versions)
  app.post("/api/admin/menu-items", requireAdmin, async (req, res) => {
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

  app.patch("/api/admin/menu-items/:id", requireAdmin, async (req, res) => {
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

  app.delete("/api/admin/menu-items/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteMenuItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  });

  // Serve uploaded files statically
  app.use("/uploads", express.static(uploadsDir));

  // Local file upload endpoint (fallback when object storage fails)
  app.post("/api/uploads/local", localUpload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const filePath = `/uploads/${req.file.filename}`;
      res.json({ path: filePath });
    } catch (error) {
      console.error("Local upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  return httpServer;
}
