import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, decimal, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "preparing", "delivered", "cancelled"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "pos"]);
export const mediaTypeEnum = pgEnum("media_type", ["logo", "hero", "menu_item", "category", "gallery"]);

// Media Assets table
export const mediaAssets = pgTable("media_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  objectPath: text("object_path").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type"),
  size: integer("size"),
  type: mediaTypeEnum("type").default("gallery"),
  altText: text("alt_text"),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  saleStartDate: timestamp("sale_start_date"),
  saleEndDate: timestamp("sale_end_date"),
  image: text("image"),
  ingredients: text("ingredients"),
  categoryId: varchar("category_id").references(() => categories.id),
  isAvailable: boolean("is_available").default(true),
  isPopular: boolean("is_popular").default(false),
  isFeatured: boolean("is_featured").default(false),
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
  notes: text("notes"),
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
  avatarUrl: text("avatar_url"),
  sourceLabel: text("source_label").default("Google"),
  isHighlighted: boolean("is_highlighted").default(false),
  isApproved: boolean("is_approved").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Site Settings table (for business info, WhatsApp number, etc.)
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value"),
});

// Site Profile table (single row for main site info)
export const siteProfile = pgTable("site_profile", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantName: text("restaurant_name").notNull().default("Lezzet Express"),
  tagline: text("tagline").default("Corlu'nun En Lezzetli Adresi"),
  aboutText: text("about_text"),
  logoUrl: text("logo_url"),
  heroTitle: text("hero_title").default("Ev Yapimi Lezzetler Kapiinizda"),
  heroSubtitle: text("hero_subtitle").default("Taze malzemeler, ozenle hazirlanan yemekler"),
  heroImageUrl: text("hero_image_url"),
  heroImageUrl2: text("hero_image_url_2"),
  heroPrimaryButtonText: text("hero_primary_button_text").default("Siparis Ver"),
  heroPrimaryButtonLink: text("hero_primary_button_link").default("#menu"),
  heroSecondaryButtonText: text("hero_secondary_button_text").default("Bizi Arayin"),
  heroSecondaryButtonLink: text("hero_secondary_button_link"),
  heroHighlightBadge: text("hero_highlight_badge").default("Ucretsiz Teslimat"),
  brandImageUrl: text("brand_image_url"),
  brandTitle: text("brand_title").default("Hikayemiz"),
  brandDescription: text("brand_description"),
  footerText: text("footer_text"),
  footerCtaText: text("footer_cta_text").default("Hemen Siparis Ver"),
  footerCtaLink: text("footer_cta_link").default("#menu"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  workingHours: text("working_hours").default("Her gun 10:00 - 22:00"),
  googleReviewsWidgetCode: text("google_reviews_widget_code"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
});

// Gallery Media table
export const galleryMedia = pgTable("gallery_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  altText: text("alt_text"),
  section: text("section").default("gallery"),
  sortOrder: integer("sort_order").default(0),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Social Links table
export const socialLinks = pgTable("social_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: text("platform").notNull(),
  url: text("url"),
  isVisible: boolean("is_visible").default(true),
  sortOrder: integer("sort_order").default(0),
});

// WhatsApp Settings table
export const whatsappSettings = pgTable("whatsapp_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessPhone: text("business_phone").notNull().default("905551234567"),
  defaultMessage: text("default_message"),
  orderConfirmationTemplate: text("order_confirmation_template"),
  isEnabled: boolean("is_enabled").default(true),
});

// Insert schemas
export const insertMediaAssetSchema = createInsertSchema(mediaAssets).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true });
export const insertUpsellOptionSchema = createInsertSchema(upsellOptions).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, confirmedAt: true, deliveredAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({ id: true });
export const insertSiteProfileSchema = createInsertSchema(siteProfile).omit({ id: true });
export const insertSocialLinkSchema = createInsertSchema(socialLinks).omit({ id: true });
export const insertWhatsappSettingsSchema = createInsertSchema(whatsappSettings).omit({ id: true });
export const insertGalleryMediaSchema = createInsertSchema(galleryMedia).omit({ id: true, createdAt: true });

// Types
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type InsertMediaAsset = z.infer<typeof insertMediaAssetSchema>;

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

export type SiteProfile = typeof siteProfile.$inferSelect;
export type InsertSiteProfile = z.infer<typeof insertSiteProfileSchema>;

export type SocialLink = typeof socialLinks.$inferSelect;
export type InsertSocialLink = z.infer<typeof insertSocialLinkSchema>;

export type WhatsappSettings = typeof whatsappSettings.$inferSelect;
export type InsertWhatsappSettings = z.infer<typeof insertWhatsappSettingsSchema>;

export type GalleryMedia = typeof galleryMedia.$inferSelect;
export type InsertGalleryMedia = z.infer<typeof insertGalleryMediaSchema>;

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
