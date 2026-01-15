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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte, and, sql, lt } from "drizzle-orm";

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // Menu Items
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItemById(id: string): Promise<MenuItem | undefined>;
  getMenuItemsByCategory(categoryId: string): Promise<MenuItem[]>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, menuItem: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: string): Promise<boolean>;

  // Upsell Options
  getUpsellOptions(): Promise<UpsellOption[]>;
  getUpsellOptionsByMenuItem(menuItemId: string): Promise<UpsellOption[]>;
  createUpsellOption(upsellOption: InsertUpsellOption): Promise<UpsellOption>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomerById(id: string): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  getCustomersWithStats(): Promise<(Customer & { orderCount: number; lastOrderDate: Date | null })[]>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  getOrdersByCustomer(customerId: string): Promise<Order[]>;
  getOrdersByStatus(status: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;

  // Order Items
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;

  // Reviews
  getReviews(): Promise<Review[]>;
  getApprovedReviews(): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;

  // Site Settings
  getSetting(key: string): Promise<SiteSetting | undefined>;
  getAllSettings(): Promise<SiteSetting[]>;
  setSetting(key: string, value: string): Promise<SiteSetting>;

  // Admin Users
  getAdminByUsername(username: string): Promise<AdminUser | undefined>;
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  updateAdminLastLogin(id: string): Promise<void>;

  // Admin Tokens
  getAdminToken(token: string): Promise<{ adminId: string; username: string; expiresAt: Date } | undefined>;
  createAdminToken(token: string, adminId: string, username: string, expiresAt: Date): Promise<void>;
  deleteAdminToken(token: string): Promise<void>;
  cleanupExpiredTokens(): Promise<void>;

  // Reviews - Admin
  updateReview(id: string, data: Partial<InsertReview>): Promise<Review | undefined>;
  deleteReview(id: string): Promise<boolean>;
  getAllReviews(): Promise<Review[]>;

  // Dashboard Stats
  getDashboardStats(): Promise<{
    todayOrders: number;
    confirmedOrders: number;
    deliveredOrders: number;
    todayRevenue: number;
    weekRevenue: number;
    monthRevenue: number;
    totalCustomers: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Categories
  async getCategories(): Promise<Category[]> {
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

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories).set(category).where(eq(categories.id, id)).returning();
    return updated || undefined;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return true;
  }

  // Menu Items
  async getMenuItems(): Promise<MenuItem[]> {
    return db.select().from(menuItems).orderBy(menuItems.sortOrder);
  }

  async getMenuItemById(id: string): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item || undefined;
  }

  async getMenuItemsByCategory(categoryId: string): Promise<MenuItem[]> {
    return db.select().from(menuItems).where(eq(menuItems.categoryId, categoryId)).orderBy(menuItems.sortOrder);
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const [created] = await db.insert(menuItems).values(menuItem).returning();
    return created;
  }

  async updateMenuItem(id: string, menuItem: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const [updated] = await db.update(menuItems).set(menuItem).where(eq(menuItems.id, id)).returning();
    return updated || undefined;
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    // First, set menuItemId to null in order_items that reference this menu item
    await db.update(orderItems).set({ menuItemId: null }).where(eq(orderItems.menuItemId, id));
    // Delete upsell options associated with this menu item
    await db.delete(upsellOptions).where(eq(upsellOptions.menuItemId, id));
    // Now delete the menu item
    await db.delete(menuItems).where(eq(menuItems.id, id));
    return true;
  }

  // Upsell Options
  async getUpsellOptions(): Promise<UpsellOption[]> {
    return db.select().from(upsellOptions);
  }

  async getUpsellOptionsByMenuItem(menuItemId: string): Promise<UpsellOption[]> {
    return db.select().from(upsellOptions).where(eq(upsellOptions.menuItemId, menuItemId));
  }

  async createUpsellOption(upsellOption: InsertUpsellOption): Promise<UpsellOption> {
    const [created] = await db.insert(upsellOptions).values(upsellOption).returning();
    return created;
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomerById(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.phone, phone));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return updated || undefined;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    // First delete order items for orders belonging to this customer
    const customerOrders = await db.select().from(orders).where(eq(orders.customerId, id));
    for (const order of customerOrders) {
      await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
    }
    // Then delete the orders
    await db.delete(orders).where(eq(orders.customerId, id));
    // Finally delete the customer
    await db.delete(customers).where(eq(customers.id, id));
    return true;
  }

  async getCustomersWithStats(): Promise<(Customer & { orderCount: number; lastOrderDate: Date | null })[]> {
    const allCustomers = await db.select().from(customers).orderBy(desc(customers.createdAt));
    const allOrders = await db.select().from(orders);
    
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
  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt));
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.status, status as any)).orderBy(desc(orders.createdAt));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const updateData: any = { status };
    if (status === "confirmed") {
      updateData.confirmedAt = new Date();
    } else if (status === "delivered") {
      updateData.deliveredAt = new Date();
    }
    const [updated] = await db.update(orders).set(updateData).where(eq(orders.id, id)).returning();
    return updated || undefined;
  }

  async deleteOrder(id: string): Promise<boolean> {
    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    const result = await db.delete(orders).where(eq(orders.id, id));
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
  async getReviews(): Promise<Review[]> {
    return db.select().from(reviews).orderBy(desc(reviews.createdAt));
  }

  async getApprovedReviews(): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.isApproved, true)).orderBy(desc(reviews.createdAt));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [created] = await db.insert(reviews).values(review).returning();
    return created;
  }

  // Site Settings
  async getSetting(key: string): Promise<SiteSetting | undefined> {
    const [setting] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return setting || undefined;
  }

  async getAllSettings(): Promise<SiteSetting[]> {
    return db.select().from(siteSettings);
  }

  async setSetting(key: string, value: string): Promise<SiteSetting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [updated] = await db.update(siteSettings).set({ value }).where(eq(siteSettings.key, key)).returning();
      return updated;
    }
    const [created] = await db.insert(siteSettings).values({ key, value }).returning();
    return created;
  }

  // Admin Users
  async getAdminByUsername(username: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
    return admin || undefined;
  }

  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    const [created] = await db.insert(adminUsers).values(admin).returning();
    return created;
  }

  async updateAdminLastLogin(id: string): Promise<void> {
    await db.update(adminUsers).set({ lastLogin: new Date() }).where(eq(adminUsers.id, id));
  }

  // Admin Tokens
  async getAdminToken(token: string): Promise<{ adminId: string; username: string; expiresAt: Date } | undefined> {
    const [tokenData] = await db.select().from(adminTokens).where(eq(adminTokens.token, token));
    if (!tokenData) return undefined;
    return {
      adminId: tokenData.adminId,
      username: tokenData.username,
      expiresAt: tokenData.expiresAt,
    };
  }

  async createAdminToken(token: string, adminId: string, username: string, expiresAt: Date): Promise<void> {
    await db.insert(adminTokens).values({ token, adminId, username, expiresAt });
  }

  async deleteAdminToken(token: string): Promise<void> {
    await db.delete(adminTokens).where(eq(adminTokens.token, token));
  }

  async cleanupExpiredTokens(): Promise<void> {
    await db.delete(adminTokens).where(lt(adminTokens.expiresAt, new Date()));
  }

  // Reviews - Admin
  async getAllReviews(): Promise<Review[]> {
    return db.select().from(reviews).orderBy(desc(reviews.createdAt));
  }

  async updateReview(id: string, data: Partial<InsertReview>): Promise<Review | undefined> {
    const [updated] = await db.update(reviews).set(data).where(eq(reviews.id, id)).returning();
    return updated || undefined;
  }

  async deleteReview(id: string): Promise<boolean> {
    await db.delete(reviews).where(eq(reviews.id, id));
    return true;
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<{
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

    // Get all orders for calculations
    const allOrders = await db.select().from(orders);
    const allCustomers = await db.select().from(customers);

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
}

export const storage = new DatabaseStorage();
