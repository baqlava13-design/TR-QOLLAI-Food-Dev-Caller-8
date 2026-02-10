import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, decimal, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "preparing", "delivered", "cancelled"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "pos"]);
export const deliveryTypeEnum = pgEnum("delivery_type", ["delivery", "pickup"]);

// Categories table (with self-referencing for subcategories)
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  parentId: varchar("parent_id"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "subcategories",
  }),
  subcategories: many(categories, { relationName: "subcategories" }),
  menuItems: many(menuItems),
}));

// Menu Items table
export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  image: text("image"),
  categoryId: varchar("category_id").references(() => categories.id),
  isAvailable: boolean("is_available").default(true),
  isPopular: boolean("is_popular").default(false),
  isKampanya: boolean("is_kampanya").default(false),
  kampanyaTag: text("kampanya_tag"),
  sortOrder: integer("sort_order").default(0),
});

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(categories, {
    fields: [menuItems.categoryId],
    references: [categories.id],
  }),
  upsellOptions: many(upsellOptions),
  orderItems: many(orderItems),
}));

// Upsell Options table
export const upsellOptions = pgTable("upsell_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  menuItemId: varchar("menu_item_id").references(() => menuItems.id),
  isGlobal: boolean("is_global").default(false),
});

export const upsellOptionsRelations = relations(upsellOptions, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [upsellOptions.menuItemId],
    references: [menuItems.id],
  }),
}));

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  mahalle: text("mahalle"),
  sokak: text("sokak"),
  binaNo: text("bina_no"),
  daireNo: text("daire_no"),
  notes: text("notes"),
  orderCount: integer("order_count").default(0),
  lastOrderDate: timestamp("last_order_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerAddress: text("customer_address").notNull(),
  status: orderStatusEnum("status").default("pending"),
  paymentMethod: paymentMethodEnum("payment_method").default("cash"),
  deliveryType: deliveryTypeEnum("delivery_type").default("delivery"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
  deliveredAt: timestamp("delivered_at"),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  orderItems: many(orderItems),
}));

// Order Items table
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  menuItemId: varchar("menu_item_id").references(() => menuItems.id),
  menuItemName: text("menu_item_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  upsells: text("upsells"),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));

// Reviews table
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: text("customer_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  menuItemName: text("menu_item_name"),
  isApproved: boolean("is_approved").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Site Settings table (for business info, WhatsApp number, etc.)
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value"),
});

// Cross-sell products table (products to show in basket for upselling)
export const crossSellProducts = pgTable("cross_sell_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  menuItemId: varchar("menu_item_id").references(() => menuItems.id).notNull(),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const crossSellProductsRelations = relations(crossSellProducts, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [crossSellProducts.menuItemId],
    references: [menuItems.id],
  }),
}));

// Insert schemas
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true });
export const insertUpsellOptionSchema = createInsertSchema(upsellOptions).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true, orderCount: true, lastOrderDate: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, confirmedAt: true, deliveredAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({ id: true });
export const insertCrossSellProductSchema = createInsertSchema(crossSellProducts).omit({ id: true });

// Types
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

export type UpsellOption = typeof upsellOptions.$inferSelect;
export type InsertUpsellOption = z.infer<typeof insertUpsellOptionSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;

export type CrossSellProduct = typeof crossSellProducts.$inferSelect;
export type InsertCrossSellProduct = z.infer<typeof insertCrossSellProductSchema>;

// Neighborhoods table
export const neighborhoods = pgTable("neighborhoods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  minimumOrderAmount: decimal("minimum_order_amount", { precision: 10, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});

export const insertNeighborhoodSchema = createInsertSchema(neighborhoods).omit({ id: true });
export type Neighborhood = typeof neighborhoods.$inferSelect;
export type InsertNeighborhood = z.infer<typeof insertNeighborhoodSchema>;

// Admin Users table
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true, createdAt: true, lastLogin: true });
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

// Admin Tokens table for persistent session storage
export const adminTokens = pgTable("admin_tokens", {
  token: varchar("token").primaryKey(),
  adminId: varchar("admin_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AdminToken = typeof adminTokens.$inferSelect;

// Legacy user support (keeping for compatibility)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Cart item type for frontend
export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedUpsells: UpsellOption[];
}

// Order form data type
export interface OrderFormData {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: "cash" | "pos";
  notes?: string;
  items: CartItem[];
}
