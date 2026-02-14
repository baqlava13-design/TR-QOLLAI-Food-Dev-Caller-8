import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, decimal, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "preparing", "delivered", "cancelled"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "pos"]);
export const deliveryTypeEnum = pgEnum("delivery_type", ["delivery", "pickup"]);
export const courierTypeEnum = pgEnum("courier_type", ["own", "external"]);
export const pipelineStatusEnum = pgEnum("pipeline_status", ["lead", "pitched", "trial", "customer", "churned"]);
export const leadSourceEnum = pgEnum("lead_source", ["walk-in", "instagram", "referral", "website", "cold-call", "other"]);

// ==================== MULTI-TENANT ====================

export interface PilotMenuItem {
  name: string;
  description: string;
  price: string;
  image: string;
}

// Tenants table (doubles as CRM leads)
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  city: text("city"),
  address: text("address"),
  status: pipelineStatusEnum("status").default("lead"),
  source: leadSourceEnum("source").default("other"),
  nextFollowupAt: timestamp("next_followup_at"),
  notes: text("notes"),
  demoReady: boolean("demo_ready").default(false),
  logoUrl: text("logo_url"),
  heroImages: jsonb("hero_images").$type<string[]>().default([]),
  menuSeeded: boolean("menu_seeded").default(false),
  pitchChecklist: jsonb("pitch_checklist").$type<Record<string, boolean>>().default({}),
  pilotMenuItems: jsonb("pilot_menu_items").$type<PilotMenuItem[]>().default([]),
  customDomain: text("custom_domain"),
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }),
  trialEndsAt: timestamp("trial_ends_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

// ==================== BUSINESS TABLES (tenant-scoped) ====================

// Categories table (with self-referencing for subcategories)
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  parentId: varchar("parent_id"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  tenant: one(tenants, { fields: [categories.tenantId], references: [tenants.id] }),
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
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
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
  tenant: one(tenants, { fields: [menuItems.tenantId], references: [tenants.id] }),
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
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  menuItemId: varchar("menu_item_id").references(() => menuItems.id),
  isGlobal: boolean("is_global").default(false),
});

export const upsellOptionsRelations = relations(upsellOptions, ({ one }) => ({
  tenant: one(tenants, { fields: [upsellOptions.tenantId], references: [tenants.id] }),
  menuItem: one(menuItems, {
    fields: [upsellOptions.menuItemId],
    references: [menuItems.id],
  }),
}));

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
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

export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, { fields: [customers.tenantId], references: [tenants.id] }),
  orders: many(orders),
}));

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
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
  tenant: one(tenants, { fields: [orders.tenantId], references: [tenants.id] }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  orderItems: many(orderItems),
}));

// Order Items table
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  menuItemId: varchar("menu_item_id").references(() => menuItems.id),
  menuItemName: text("menu_item_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  upsells: text("upsells"),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  tenant: one(tenants, { fields: [orderItems.tenantId], references: [tenants.id] }),
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
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  customerName: text("customer_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  menuItemName: text("menu_item_name"),
  isApproved: boolean("is_approved").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Site Settings table (per-tenant settings)
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: text("value"),
});

// Cross-sell products table
export const crossSellProducts = pgTable("cross_sell_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  menuItemId: varchar("menu_item_id").references(() => menuItems.id).notNull(),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const crossSellProductsRelations = relations(crossSellProducts, ({ one }) => ({
  tenant: one(tenants, { fields: [crossSellProducts.tenantId], references: [tenants.id] }),
  menuItem: one(menuItems, {
    fields: [crossSellProducts.menuItemId],
    references: [menuItems.id],
  }),
}));

// Neighborhoods table
export const neighborhoods = pgTable("neighborhoods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  minimumOrderAmount: decimal("minimum_order_amount", { precision: 10, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});

// Admin Users table (tenant-scoped)
export const userRoleEnum = pgEnum("user_role", ["admin", "operator"]);

export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  password: text("password").notNull(),
  role: userRoleEnum("role").default("operator"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
});

// Admin Tokens table
export const adminTokens = pgTable("admin_tokens", {
  token: varchar("token").primaryKey(),
  adminId: varchar("admin_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AdminToken = typeof adminTokens.$inferSelect;

// Profit Channels table
export const profitChannels = pgTable("profit_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  courierType: courierTypeEnum("courier_type").default("own"),
  courierCostPerOrder: decimal("courier_cost_per_order", { precision: 10, scale: 2 }).default("0"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("0"),
  isOwnPlatform: boolean("is_own_platform").default(false),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});

// Daily Channel Revenues table
export const dailyChannelRevenues = pgTable("daily_channel_revenues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  channelId: varchar("channel_id").references(() => profitChannels.id, { onDelete: "cascade" }).notNull(),
  date: text("date").notNull(),
  revenue: decimal("revenue", { precision: 12, scale: 2 }).notNull().default("0"),
  orderCount: integer("order_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyChannelRevenuesRelations = relations(dailyChannelRevenues, ({ one }) => ({
  tenant: one(tenants, { fields: [dailyChannelRevenues.tenantId], references: [tenants.id] }),
  channel: one(profitChannels, {
    fields: [dailyChannelRevenues.channelId],
    references: [profitChannels.id],
  }),
}));

// Superadmin Users table (platform-level, not tenant-scoped)
export const superadminUsers = pgTable("superadmin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Legacy user support (keeping for compatibility)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// ==================== INSERT SCHEMAS ====================

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true });
export const insertUpsellOptionSchema = createInsertSchema(upsellOptions).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true, orderCount: true, lastOrderDate: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, confirmedAt: true, deliveredAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({ id: true });
export const insertCrossSellProductSchema = createInsertSchema(crossSellProducts).omit({ id: true });
export const insertNeighborhoodSchema = createInsertSchema(neighborhoods).omit({ id: true });
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true, createdAt: true, lastLogin: true });
export const insertProfitChannelSchema = createInsertSchema(profitChannels).omit({ id: true });
export const insertDailyChannelRevenueSchema = createInsertSchema(dailyChannelRevenues).omit({ id: true, createdAt: true });

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// ==================== TYPES ====================

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

export type Neighborhood = typeof neighborhoods.$inferSelect;
export type InsertNeighborhood = z.infer<typeof insertNeighborhoodSchema>;

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

export type ProfitChannel = typeof profitChannels.$inferSelect;
export type InsertProfitChannel = z.infer<typeof insertProfitChannelSchema>;

export type DailyChannelRevenue = typeof dailyChannelRevenues.$inferSelect;
export type InsertDailyChannelRevenue = z.infer<typeof insertDailyChannelRevenueSchema>;

export type SuperadminUser = typeof superadminUsers.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ==================== FRONTEND TYPES ====================

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedUpsells: UpsellOption[];
}

export interface OrderFormData {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: "cash" | "pos";
  notes?: string;
  items: CartItem[];
}

// Default pitch checklist items
export const DEFAULT_PITCH_CHECKLIST = {
  "intro_qollai": false,
  "show_demo": false,
  "explain_whatsapp": false,
  "show_admin_panel": false,
  "discuss_pricing": false,
  "show_phone_orders": false,
  "setup_trial": false,
  "collect_menu": false,
  "configure_branding": false,
  "go_live": false,
};

export const PITCH_CHECKLIST_LABELS: Record<string, string> = {
  "intro_qollai": "Introduce Qollai platform",
  "show_demo": "Show live demo",
  "explain_whatsapp": "Explain WhatsApp integration",
  "show_admin_panel": "Show admin panel features",
  "discuss_pricing": "Discuss pricing & plans",
  "show_phone_orders": "Show phone order entry",
  "setup_trial": "Set up trial account",
  "collect_menu": "Collect menu & photos",
  "configure_branding": "Configure branding (logo, colors)",
  "go_live": "Go live!",
};
