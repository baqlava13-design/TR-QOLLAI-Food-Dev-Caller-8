import {
  categories,
  menuItems,
  upsellOptions,
  customers,
  orders,
  orderItems,
  reviews,
  siteSettings,
  adminUsers,
  adminTokens,
  crossSellProducts,
  tenants,
  superadminUsers,
  neighborhoods,
  profitChannels,
  dailyChannelRevenues,
  type Category,
  type InsertCategory,
  type MenuItem,
  type InsertMenuItem,
  type UpsellOption,
  type InsertUpsellOption,
  type Customer,
  type InsertCustomer,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type Review,
  type InsertReview,
  type SiteSetting,
  type InsertSiteSetting,
  type AdminUser,
  type InsertAdminUser,
  type CrossSellProduct,
  type InsertCrossSellProduct,
  type Neighborhood,
  type InsertNeighborhood,
  type ProfitChannel,
  type InsertProfitChannel,
  type DailyChannelRevenue,
  type InsertDailyChannelRevenue,
  type Tenant,
  type InsertTenant,
  type SuperadminUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte, and, sql, lt } from "drizzle-orm";

export interface IStorage {
  // Tenants
  getTenants(): Promise<Tenant[]>;
  getTenantById(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined>;
  deleteTenant(id: string): Promise<boolean>;
  getTenantsByStatus(status: string): Promise<Tenant[]>;

  // Superadmin
  getSuperadminByUsername(username: string): Promise<SuperadminUser | undefined>;
  createSuperadmin(username: string, password: string): Promise<SuperadminUser>;
  updateSuperadminPassword(id: string, hashedPassword: string): Promise<void>;

  // Categories
  getCategories(tenantId?: string): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>, tenantId?: string): Promise<Category | undefined>;
  deleteCategory(id: string, tenantId?: string): Promise<boolean>;

  // Menu Items
  getMenuItems(tenantId?: string): Promise<MenuItem[]>;
  getMenuItemById(id: string, tenantId?: string): Promise<MenuItem | undefined>;
  getMenuItemsByCategory(categoryId: string, tenantId?: string): Promise<MenuItem[]>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, menuItem: Partial<InsertMenuItem>, tenantId?: string): Promise<MenuItem | undefined>;
  deleteMenuItem(id: string, tenantId?: string): Promise<boolean>;

  // Upsell Options
  getUpsellOptions(tenantId?: string): Promise<UpsellOption[]>;
  getUpsellOptionsByMenuItem(menuItemId: string, tenantId?: string): Promise<UpsellOption[]>;
  createUpsellOption(upsellOption: InsertUpsellOption): Promise<UpsellOption>;

  // Customers
  getCustomers(tenantId?: string): Promise<Customer[]>;
  getCustomerById(id: string, tenantId?: string): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string, tenantId?: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>, tenantId?: string): Promise<Customer | undefined>;
  deleteCustomer(id: string, tenantId?: string): Promise<boolean>;
  getCustomersWithStats(tenantId?: string): Promise<(Customer & { orderCount: number; lastOrderDate: Date | null })[]>;

  // Orders
  getOrders(tenantId?: string): Promise<Order[]>;
  getOrderById(id: string, tenantId?: string): Promise<Order | undefined>;
  getOrdersByCustomer(customerId: string, tenantId?: string): Promise<Order[]>;
  getOrdersByStatus(status: string, tenantId?: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string, tenantId?: string): Promise<Order | undefined>;
  deleteOrder(id: string, tenantId?: string): Promise<boolean>;

  // Order Items
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;

  // Reviews
  getReviews(tenantId?: string): Promise<Review[]>;
  getApprovedReviews(tenantId?: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;

  // Site Settings
  getSetting(key: string, tenantId?: string): Promise<SiteSetting | undefined>;
  getAllSettings(tenantId?: string): Promise<SiteSetting[]>;
  setSetting(key: string, value: string, tenantId?: string): Promise<SiteSetting>;

  // Admin Users
  getAdminByUsername(username: string, tenantId?: string): Promise<AdminUser | undefined>;
  getAllAdminUsers(tenantId?: string): Promise<AdminUser[]>;
  getAdminUserById(id: string): Promise<AdminUser | undefined>;
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  updateAdminUser(id: string, data: Partial<InsertAdminUser>): Promise<AdminUser | undefined>;
  deleteAdminUser(id: string): Promise<boolean>;
  updateAdminLastLogin(id: string): Promise<void>;

  // Admin Tokens
  getAdminToken(token: string): Promise<{ adminId: string; username: string; tenantId: string | null; expiresAt: Date } | undefined>;
  createAdminToken(token: string, adminId: string, username: string, expiresAt: Date, tenantId?: string): Promise<void>;
  deleteAdminToken(token: string): Promise<void>;
  cleanupExpiredTokens(): Promise<void>;

  // Reviews - Admin
  updateReview(id: string, data: Partial<InsertReview>, tenantId?: string): Promise<Review | undefined>;
  deleteReview(id: string, tenantId?: string): Promise<boolean>;
  getAllReviews(tenantId?: string): Promise<Review[]>;

  // Dashboard Stats
  getDashboardStats(tenantId?: string): Promise<{
    todayOrders: number;
    confirmedOrders: number;
    deliveredOrders: number;
    todayRevenue: number;
    weekRevenue: number;
    monthRevenue: number;
    totalCustomers: number;
  }>;

  // Cross-sell Products
  getCrossSellProducts(tenantId?: string): Promise<(CrossSellProduct & { menuItem: MenuItem })[]>;
  getActiveCrossSellProducts(tenantId?: string): Promise<(CrossSellProduct & { menuItem: MenuItem })[]>;
  addCrossSellProduct(data: InsertCrossSellProduct): Promise<CrossSellProduct>;
  removeCrossSellProduct(id: string, tenantId?: string): Promise<boolean>;
  updateCrossSellProduct(id: string, data: Partial<InsertCrossSellProduct>, tenantId?: string): Promise<CrossSellProduct | undefined>;

  // Neighborhoods
  getNeighborhoods(tenantId?: string): Promise<Neighborhood[]>;
  getActiveNeighborhoods(tenantId?: string): Promise<Neighborhood[]>;
  getNeighborhoodById(id: string): Promise<Neighborhood | undefined>;
  createNeighborhood(neighborhood: InsertNeighborhood): Promise<Neighborhood>;
  updateNeighborhood(id: string, neighborhood: Partial<InsertNeighborhood>, tenantId?: string): Promise<Neighborhood | undefined>;
  deleteNeighborhood(id: string, tenantId?: string): Promise<boolean>;

  // Profit Channels
  getProfitChannels(tenantId?: string): Promise<ProfitChannel[]>;
  getProfitChannelById(id: string): Promise<ProfitChannel | undefined>;
  createProfitChannel(channel: InsertProfitChannel): Promise<ProfitChannel>;
  updateProfitChannel(id: string, channel: Partial<InsertProfitChannel>, tenantId?: string): Promise<ProfitChannel | undefined>;
  deleteProfitChannel(id: string, tenantId?: string): Promise<boolean>;

  // Daily Channel Revenues
  getDailyRevenues(date: string, tenantId?: string): Promise<DailyChannelRevenue[]>;
  getDailyRevenuesByRange(startDate: string, endDate: string, tenantId?: string): Promise<DailyChannelRevenue[]>;
  upsertDailyRevenue(data: InsertDailyChannelRevenue): Promise<DailyChannelRevenue>;
  deleteDailyRevenue(id: string, tenantId?: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Tenants
  async getTenants(): Promise<Tenant[]> {
    return db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async getTenantById(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant || undefined;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [created] = await db.insert(tenants).values(tenant as any).returning();
    return created;
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const updateData = { ...data, updatedAt: new Date() } as any;
    const [updated] = await db.update(tenants).set(updateData).where(eq(tenants.id, id)).returning();
    return updated || undefined;
  }

  async deleteTenant(id: string): Promise<boolean> {
    const result = await db.delete(tenants).where(eq(tenants.id, id)).returning();
    return result.length > 0;
  }

  async getTenantsByStatus(status: string): Promise<Tenant[]> {
    return db.select().from(tenants).where(eq(tenants.status, status as any)).orderBy(desc(tenants.createdAt));
  }

  // Superadmin
  async getSuperadminByUsername(username: string): Promise<SuperadminUser | undefined> {
    const [admin] = await db.select().from(superadminUsers).where(eq(superadminUsers.username, username));
    return admin || undefined;
  }

  async updateSuperadminPassword(id: string, hashedPassword: string): Promise<void> {
    await db.update(superadminUsers).set({ password: hashedPassword }).where(eq(superadminUsers.id, id));
  }

  async createSuperadmin(username: string, password: string): Promise<SuperadminUser> {
    const [created] = await db.insert(superadminUsers).values({ username, password }).returning();
    return created;
  }

  // Categories
  async getCategories(tenantId?: string): Promise<Category[]> {
    if (tenantId) {
      return db.select().from(categories).where(eq(categories.tenantId, tenantId)).orderBy(categories.sortOrder);
    }
    return db.select().from(categories).orderBy(categories.sortOrder);
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>, tenantId?: string): Promise<Category | undefined> {
    const whereClause = tenantId ? and(eq(categories.id, id), eq(categories.tenantId, tenantId)) : eq(categories.id, id);
    const [updated] = await db.update(categories).set(category).where(whereClause).returning();
    return updated || undefined;
  }

  async deleteCategory(id: string, tenantId?: string): Promise<boolean> {
    const whereClause = tenantId ? and(eq(categories.id, id), eq(categories.tenantId, tenantId)) : eq(categories.id, id);
    const result = await db.delete(categories).where(whereClause);
    return true;
  }

  // Menu Items
  async getMenuItems(tenantId?: string): Promise<MenuItem[]> {
    if (tenantId) {
      return db.select().from(menuItems).where(eq(menuItems.tenantId, tenantId)).orderBy(menuItems.sortOrder);
    }
    return db.select().from(menuItems).orderBy(menuItems.sortOrder);
  }

  async getMenuItemById(id: string, tenantId?: string): Promise<MenuItem | undefined> {
    const whereClause = tenantId ? and(eq(menuItems.id, id), eq(menuItems.tenantId, tenantId)) : eq(menuItems.id, id);
    const [item] = await db.select().from(menuItems).where(whereClause);
    return item || undefined;
  }

  async getMenuItemsByCategory(categoryId: string, tenantId?: string): Promise<MenuItem[]> {
    if (tenantId) {
      return db.select().from(menuItems).where(and(eq(menuItems.categoryId, categoryId), eq(menuItems.tenantId, tenantId))).orderBy(menuItems.sortOrder);
    }
    return db.select().from(menuItems).where(eq(menuItems.categoryId, categoryId)).orderBy(menuItems.sortOrder);
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const [created] = await db.insert(menuItems).values(menuItem).returning();
    return created;
  }

  async updateMenuItem(id: string, menuItem: Partial<InsertMenuItem>, tenantId?: string): Promise<MenuItem | undefined> {
    const whereClause = tenantId ? and(eq(menuItems.id, id), eq(menuItems.tenantId, tenantId)) : eq(menuItems.id, id);
    const [updated] = await db.update(menuItems).set(menuItem).where(whereClause).returning();
    return updated || undefined;
  }

  async deleteMenuItem(id: string, tenantId?: string): Promise<boolean> {
    await db.update(orderItems).set({ menuItemId: null }).where(eq(orderItems.menuItemId, id));
    await db.delete(upsellOptions).where(eq(upsellOptions.menuItemId, id));
    await db.delete(crossSellProducts).where(eq(crossSellProducts.menuItemId, id));
    const whereClause = tenantId ? and(eq(menuItems.id, id), eq(menuItems.tenantId, tenantId)) : eq(menuItems.id, id);
    await db.delete(menuItems).where(whereClause);
    return true;
  }

  // Upsell Options
  async getUpsellOptions(tenantId?: string): Promise<UpsellOption[]> {
    if (tenantId) {
      return db.select().from(upsellOptions).where(eq(upsellOptions.tenantId, tenantId));
    }
    return db.select().from(upsellOptions);
  }

  async getUpsellOptionsByMenuItem(menuItemId: string, tenantId?: string): Promise<UpsellOption[]> {
    if (tenantId) {
      return db.select().from(upsellOptions).where(and(eq(upsellOptions.menuItemId, menuItemId), eq(upsellOptions.tenantId, tenantId)));
    }
    return db.select().from(upsellOptions).where(eq(upsellOptions.menuItemId, menuItemId));
  }

  async createUpsellOption(upsellOption: InsertUpsellOption): Promise<UpsellOption> {
    const [created] = await db.insert(upsellOptions).values(upsellOption).returning();
    return created;
  }

  // Customers
  async getCustomers(tenantId?: string): Promise<Customer[]> {
    if (tenantId) {
      return db.select().from(customers).where(eq(customers.tenantId, tenantId)).orderBy(desc(customers.createdAt));
    }
    return db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomerById(id: string, tenantId?: string): Promise<Customer | undefined> {
    const whereClause = tenantId ? and(eq(customers.id, id), eq(customers.tenantId, tenantId)) : eq(customers.id, id);
    const [customer] = await db.select().from(customers).where(whereClause);
    return customer || undefined;
  }

  async getCustomerByPhone(phone: string, tenantId?: string): Promise<Customer | undefined> {
    if (tenantId) {
      const [customer] = await db.select().from(customers).where(and(eq(customers.phone, phone), eq(customers.tenantId, tenantId)));
      return customer || undefined;
    }
    const [customer] = await db.select().from(customers).where(eq(customers.phone, phone));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>, tenantId?: string): Promise<Customer | undefined> {
    const whereClause = tenantId ? and(eq(customers.id, id), eq(customers.tenantId, tenantId)) : eq(customers.id, id);
    const [updated] = await db.update(customers).set(customer).where(whereClause).returning();
    return updated || undefined;
  }

  async deleteCustomer(id: string, tenantId?: string): Promise<boolean> {
    const customerOrders = await db.select().from(orders).where(eq(orders.customerId, id));
    for (const order of customerOrders) {
      await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
    }
    await db.delete(orders).where(eq(orders.customerId, id));
    const whereClause = tenantId ? and(eq(customers.id, id), eq(customers.tenantId, tenantId)) : eq(customers.id, id);
    await db.delete(customers).where(whereClause);
    return true;
  }

  async getCustomersWithStats(tenantId?: string): Promise<(Customer & { orderCount: number; lastOrderDate: Date | null })[]> {
    const allCustomers = tenantId
      ? await db.select().from(customers).where(eq(customers.tenantId, tenantId)).orderBy(desc(customers.createdAt))
      : await db.select().from(customers).orderBy(desc(customers.createdAt));
    const allOrders = tenantId
      ? await db.select().from(orders).where(eq(orders.tenantId, tenantId))
      : await db.select().from(orders);
    
    return allCustomers.map(customer => {
      const customerOrders = allOrders.filter(o => o.customerId === customer.id);
      const lastOrder = customerOrders.sort((a, b) => 
        (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
      )[0];
      
      return {
        ...customer,
        orderCount: customerOrders.length,
        lastOrderDate: lastOrder?.createdAt || null,
      };
    });
  }

  // Orders
  async getOrders(tenantId?: string): Promise<Order[]> {
    if (tenantId) {
      return db.select().from(orders).where(eq(orders.tenantId, tenantId)).orderBy(desc(orders.createdAt));
    }
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrderById(id: string, tenantId?: string): Promise<Order | undefined> {
    const whereClause = tenantId ? and(eq(orders.id, id), eq(orders.tenantId, tenantId)) : eq(orders.id, id);
    const [order] = await db.select().from(orders).where(whereClause);
    return order || undefined;
  }

  async getOrdersByCustomer(customerId: string, tenantId?: string): Promise<Order[]> {
    if (tenantId) {
      return db.select().from(orders).where(and(eq(orders.customerId, customerId), eq(orders.tenantId, tenantId))).orderBy(desc(orders.createdAt));
    }
    return db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt));
  }

  async getOrdersByStatus(status: string, tenantId?: string): Promise<Order[]> {
    if (tenantId) {
      return db.select().from(orders).where(and(eq(orders.status, status as any), eq(orders.tenantId, tenantId))).orderBy(desc(orders.createdAt));
    }
    return db.select().from(orders).where(eq(orders.status, status as any)).orderBy(desc(orders.createdAt));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  async updateOrderStatus(id: string, status: string, tenantId?: string): Promise<Order | undefined> {
    const updateData: any = { status };
    if (status === "confirmed") {
      updateData.confirmedAt = new Date();
    } else if (status === "delivered") {
      updateData.deliveredAt = new Date();
    }
    const whereClause = tenantId ? and(eq(orders.id, id), eq(orders.tenantId, tenantId)) : eq(orders.id, id);
    const [updated] = await db.update(orders).set(updateData).where(whereClause).returning();
    return updated || undefined;
  }

  async deleteOrder(id: string, tenantId?: string): Promise<boolean> {
    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    const whereClause = tenantId ? and(eq(orders.id, id), eq(orders.tenantId, tenantId)) : eq(orders.id, id);
    const result = await db.delete(orders).where(whereClause);
    return (result.rowCount ?? 0) > 0;
  }

  // Order Items
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const [created] = await db.insert(orderItems).values(orderItem).returning();
    return created;
  }

  // Reviews
  async getReviews(tenantId?: string): Promise<Review[]> {
    if (tenantId) {
      return db.select().from(reviews).where(eq(reviews.tenantId, tenantId)).orderBy(desc(reviews.createdAt));
    }
    return db.select().from(reviews).orderBy(desc(reviews.createdAt));
  }

  async getApprovedReviews(tenantId?: string): Promise<Review[]> {
    if (tenantId) {
      return db.select().from(reviews).where(and(eq(reviews.isApproved, true), eq(reviews.tenantId, tenantId))).orderBy(desc(reviews.createdAt));
    }
    return db.select().from(reviews).where(eq(reviews.isApproved, true)).orderBy(desc(reviews.createdAt));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [created] = await db.insert(reviews).values(review).returning();
    return created;
  }

  // Site Settings
  async getSetting(key: string, tenantId?: string): Promise<SiteSetting | undefined> {
    if (tenantId) {
      const [setting] = await db.select().from(siteSettings).where(and(eq(siteSettings.key, key), eq(siteSettings.tenantId, tenantId)));
      return setting || undefined;
    }
    const [setting] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return setting || undefined;
  }

  async getAllSettings(tenantId?: string): Promise<SiteSetting[]> {
    if (tenantId) {
      return db.select().from(siteSettings).where(eq(siteSettings.tenantId, tenantId));
    }
    return db.select().from(siteSettings);
  }

  async setSetting(key: string, value: string, tenantId?: string): Promise<SiteSetting> {
    const existing = await this.getSetting(key, tenantId);
    if (existing) {
      const [updated] = await db.update(siteSettings).set({ value }).where(eq(siteSettings.id, existing.id)).returning();
      return updated;
    }
    const insertData: any = { key, value };
    if (tenantId) {
      insertData.tenantId = tenantId;
    }
    const [created] = await db.insert(siteSettings).values(insertData).returning();
    return created;
  }

  // Admin Users
  async getAdminByUsername(username: string, tenantId?: string): Promise<AdminUser | undefined> {
    if (tenantId) {
      const [admin] = await db.select().from(adminUsers).where(and(eq(adminUsers.username, username), eq(adminUsers.tenantId, tenantId)));
      return admin || undefined;
    }
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
    return admin || undefined;
  }

  async getAllAdminUsers(tenantId?: string): Promise<AdminUser[]> {
    if (tenantId) {
      return await db.select().from(adminUsers).where(eq(adminUsers.tenantId, tenantId)).orderBy(adminUsers.createdAt);
    }
    return await db.select().from(adminUsers).orderBy(adminUsers.createdAt);
  }

  async getAdminUserById(id: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return admin || undefined;
  }

  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    const [created] = await db.insert(adminUsers).values(admin).returning();
    return created;
  }

  async updateAdminUser(id: string, data: Partial<InsertAdminUser>): Promise<AdminUser | undefined> {
    const [updated] = await db.update(adminUsers).set(data).where(eq(adminUsers.id, id)).returning();
    return updated || undefined;
  }

  async deleteAdminUser(id: string): Promise<boolean> {
    await db.delete(adminTokens).where(eq(adminTokens.adminId, id));
    const result = await db.delete(adminUsers).where(eq(adminUsers.id, id)).returning();
    return result.length > 0;
  }

  async updateAdminLastLogin(id: string): Promise<void> {
    await db.update(adminUsers).set({ lastLogin: new Date() }).where(eq(adminUsers.id, id));
  }

  // Admin Tokens
  async getAdminToken(token: string): Promise<{ adminId: string; username: string; tenantId: string | null; expiresAt: Date } | undefined> {
    const [tokenData] = await db.select().from(adminTokens).where(eq(adminTokens.token, token));
    if (!tokenData) return undefined;
    return {
      adminId: tokenData.adminId,
      username: tokenData.username,
      tenantId: tokenData.tenantId,
      expiresAt: tokenData.expiresAt,
    };
  }

  async createAdminToken(token: string, adminId: string, username: string, expiresAt: Date, tenantId?: string): Promise<void> {
    const tokenData: any = { token, adminId, username, expiresAt };
    if (tenantId) {
      tokenData.tenantId = tenantId;
    }
    await db.insert(adminTokens).values(tokenData);
  }

  async deleteAdminToken(token: string): Promise<void> {
    await db.delete(adminTokens).where(eq(adminTokens.token, token));
  }

  async cleanupExpiredTokens(): Promise<void> {
    await db.delete(adminTokens).where(lt(adminTokens.expiresAt, new Date()));
  }

  // Reviews - Admin
  async getAllReviews(tenantId?: string): Promise<Review[]> {
    if (tenantId) {
      return db.select().from(reviews).where(eq(reviews.tenantId, tenantId)).orderBy(desc(reviews.createdAt));
    }
    return db.select().from(reviews).orderBy(desc(reviews.createdAt));
  }

  async updateReview(id: string, data: Partial<InsertReview>, tenantId?: string): Promise<Review | undefined> {
    const whereClause = tenantId ? and(eq(reviews.id, id), eq(reviews.tenantId, tenantId)) : eq(reviews.id, id);
    const [updated] = await db.update(reviews).set(data).where(whereClause).returning();
    return updated || undefined;
  }

  async deleteReview(id: string, tenantId?: string): Promise<boolean> {
    const whereClause = tenantId ? and(eq(reviews.id, id), eq(reviews.tenantId, tenantId)) : eq(reviews.id, id);
    await db.delete(reviews).where(whereClause);
    return true;
  }

  // Dashboard Stats
  async getDashboardStats(tenantId?: string): Promise<{
    todayOrders: number;
    confirmedOrders: number;
    deliveredOrders: number;
    todayRevenue: number;
    weekRevenue: number;
    monthRevenue: number;
    totalCustomers: number;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const allOrders = tenantId
      ? await db.select().from(orders).where(eq(orders.tenantId, tenantId))
      : await db.select().from(orders);
    const allCustomers = tenantId
      ? await db.select().from(customers).where(eq(customers.tenantId, tenantId))
      : await db.select().from(customers);

    const todayOrders = allOrders.filter(o => o.createdAt && new Date(o.createdAt) >= todayStart);
    const confirmedOrders = allOrders.filter(o => o.status === "confirmed" || o.status === "preparing");
    const deliveredOrders = allOrders.filter(o => o.status === "delivered");

    const todayDelivered = todayOrders.filter(o => o.status === "delivered");
    const weekDelivered = allOrders.filter(o => o.createdAt && new Date(o.createdAt) >= weekStart && o.status === "delivered");
    const monthDelivered = allOrders.filter(o => o.createdAt && new Date(o.createdAt) >= monthStart && o.status === "delivered");

    const todayRevenue = todayDelivered.reduce((sum, o) => sum + parseFloat(o.total), 0);
    const weekRevenue = weekDelivered.reduce((sum, o) => sum + parseFloat(o.total), 0);
    const monthRevenue = monthDelivered.reduce((sum, o) => sum + parseFloat(o.total), 0);

    return {
      todayOrders: todayOrders.length,
      confirmedOrders: confirmedOrders.length,
      deliveredOrders: deliveredOrders.length,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      totalCustomers: allCustomers.length,
    };
  }

  // Cross-sell Products
  async getCrossSellProducts(tenantId?: string): Promise<(CrossSellProduct & { menuItem: MenuItem })[]> {
    const query = db
      .select()
      .from(crossSellProducts)
      .leftJoin(menuItems, eq(crossSellProducts.menuItemId, menuItems.id));

    const results = tenantId
      ? await query.where(eq(crossSellProducts.tenantId, tenantId)).orderBy(crossSellProducts.sortOrder)
      : await query.orderBy(crossSellProducts.sortOrder);
    
    return results
      .filter(r => r.menu_items !== null)
      .map(r => ({
        ...r.cross_sell_products,
        menuItem: r.menu_items!,
      }));
  }

  async getActiveCrossSellProducts(tenantId?: string): Promise<(CrossSellProduct & { menuItem: MenuItem })[]> {
    const query = db
      .select()
      .from(crossSellProducts)
      .leftJoin(menuItems, eq(crossSellProducts.menuItemId, menuItems.id));

    const whereCondition = tenantId
      ? and(eq(crossSellProducts.isActive, true), eq(crossSellProducts.tenantId, tenantId))
      : eq(crossSellProducts.isActive, true);

    const results = await query.where(whereCondition).orderBy(crossSellProducts.sortOrder);
    
    return results
      .filter(r => r.menu_items !== null && r.menu_items.isAvailable)
      .map(r => ({
        ...r.cross_sell_products,
        menuItem: r.menu_items!,
      }));
  }

  async addCrossSellProduct(data: InsertCrossSellProduct): Promise<CrossSellProduct> {
    const [created] = await db.insert(crossSellProducts).values(data).returning();
    return created;
  }

  async removeCrossSellProduct(id: string, tenantId?: string): Promise<boolean> {
    const whereClause = tenantId ? and(eq(crossSellProducts.id, id), eq(crossSellProducts.tenantId, tenantId)) : eq(crossSellProducts.id, id);
    await db.delete(crossSellProducts).where(whereClause);
    return true;
  }

  async updateCrossSellProduct(id: string, data: Partial<InsertCrossSellProduct>, tenantId?: string): Promise<CrossSellProduct | undefined> {
    const whereClause = tenantId ? and(eq(crossSellProducts.id, id), eq(crossSellProducts.tenantId, tenantId)) : eq(crossSellProducts.id, id);
    const [updated] = await db.update(crossSellProducts).set(data).where(whereClause).returning();
    return updated || undefined;
  }

  // Neighborhoods
  async getNeighborhoods(tenantId?: string): Promise<Neighborhood[]> {
    if (tenantId) {
      return db.select().from(neighborhoods).where(eq(neighborhoods.tenantId, tenantId)).orderBy(neighborhoods.sortOrder);
    }
    return db.select().from(neighborhoods).orderBy(neighborhoods.sortOrder);
  }

  async getActiveNeighborhoods(tenantId?: string): Promise<Neighborhood[]> {
    if (tenantId) {
      return db.select().from(neighborhoods).where(and(eq(neighborhoods.isActive, true), eq(neighborhoods.tenantId, tenantId))).orderBy(neighborhoods.sortOrder);
    }
    return db.select().from(neighborhoods).where(eq(neighborhoods.isActive, true)).orderBy(neighborhoods.sortOrder);
  }

  async getNeighborhoodById(id: string): Promise<Neighborhood | undefined> {
    const [neighborhood] = await db.select().from(neighborhoods).where(eq(neighborhoods.id, id));
    return neighborhood || undefined;
  }

  async createNeighborhood(neighborhood: InsertNeighborhood): Promise<Neighborhood> {
    const [created] = await db.insert(neighborhoods).values(neighborhood).returning();
    return created;
  }

  async updateNeighborhood(id: string, neighborhood: Partial<InsertNeighborhood>, tenantId?: string): Promise<Neighborhood | undefined> {
    const whereClause = tenantId ? and(eq(neighborhoods.id, id), eq(neighborhoods.tenantId, tenantId)) : eq(neighborhoods.id, id);
    const [updated] = await db.update(neighborhoods).set(neighborhood).where(whereClause).returning();
    return updated || undefined;
  }

  async deleteNeighborhood(id: string, tenantId?: string): Promise<boolean> {
    const whereClause = tenantId ? and(eq(neighborhoods.id, id), eq(neighborhoods.tenantId, tenantId)) : eq(neighborhoods.id, id);
    await db.delete(neighborhoods).where(whereClause);
    return true;
  }

  // Profit Channels
  async getProfitChannels(tenantId?: string): Promise<ProfitChannel[]> {
    if (tenantId) {
      return db.select().from(profitChannels).where(eq(profitChannels.tenantId, tenantId)).orderBy(profitChannels.sortOrder);
    }
    return db.select().from(profitChannels).orderBy(profitChannels.sortOrder);
  }

  async getProfitChannelById(id: string): Promise<ProfitChannel | undefined> {
    const [channel] = await db.select().from(profitChannels).where(eq(profitChannels.id, id));
    return channel || undefined;
  }

  async createProfitChannel(channel: InsertProfitChannel): Promise<ProfitChannel> {
    const [created] = await db.insert(profitChannels).values(channel).returning();
    return created;
  }

  async updateProfitChannel(id: string, channel: Partial<InsertProfitChannel>, tenantId?: string): Promise<ProfitChannel | undefined> {
    const whereClause = tenantId ? and(eq(profitChannels.id, id), eq(profitChannels.tenantId, tenantId)) : eq(profitChannels.id, id);
    const [updated] = await db.update(profitChannels).set(channel).where(whereClause).returning();
    return updated || undefined;
  }

  async deleteProfitChannel(id: string, tenantId?: string): Promise<boolean> {
    const whereClause = tenantId ? and(eq(profitChannels.id, id), eq(profitChannels.tenantId, tenantId)) : eq(profitChannels.id, id);
    await db.delete(profitChannels).where(whereClause);
    return true;
  }

  // Daily Channel Revenues
  async getDailyRevenues(date: string, tenantId?: string): Promise<DailyChannelRevenue[]> {
    if (tenantId) {
      return db.select().from(dailyChannelRevenues).where(and(eq(dailyChannelRevenues.date, date), eq(dailyChannelRevenues.tenantId, tenantId)));
    }
    return db.select().from(dailyChannelRevenues).where(eq(dailyChannelRevenues.date, date));
  }

  async getDailyRevenuesByRange(startDate: string, endDate: string, tenantId?: string): Promise<DailyChannelRevenue[]> {
    if (tenantId) {
      return db.select().from(dailyChannelRevenues)
        .where(and(
          gte(dailyChannelRevenues.date, startDate),
          lt(dailyChannelRevenues.date, endDate),
          eq(dailyChannelRevenues.tenantId, tenantId)
        ));
    }
    return db.select().from(dailyChannelRevenues)
      .where(and(
        gte(dailyChannelRevenues.date, startDate),
        lt(dailyChannelRevenues.date, endDate)
      ));
  }

  async upsertDailyRevenue(data: InsertDailyChannelRevenue): Promise<DailyChannelRevenue> {
    const conditions = [
      eq(dailyChannelRevenues.channelId, data.channelId),
      eq(dailyChannelRevenues.date, data.date),
    ];
    if (data.tenantId) {
      conditions.push(eq(dailyChannelRevenues.tenantId, data.tenantId));
    }
    const existing = await db.select().from(dailyChannelRevenues)
      .where(and(...conditions));
    if (existing.length > 0) {
      const [updated] = await db.update(dailyChannelRevenues)
        .set({ revenue: data.revenue, orderCount: data.orderCount })
        .where(eq(dailyChannelRevenues.id, existing[0].id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(dailyChannelRevenues).values(data).returning();
    return created;
  }

  async deleteDailyRevenue(id: string, tenantId?: string): Promise<boolean> {
    const whereClause = tenantId ? and(eq(dailyChannelRevenues.id, id), eq(dailyChannelRevenues.tenantId, tenantId)) : eq(dailyChannelRevenues.id, id);
    await db.delete(dailyChannelRevenues).where(whereClause);
    return true;
  }
}

export const storage = new DatabaseStorage();
