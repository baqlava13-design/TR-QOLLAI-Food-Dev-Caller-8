import { db } from "./db";
import { categories, menuItems, reviews, customers, orders, orderItems, adminUsers, tenants, superadminUsers } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function ensureSuperadmin() {
  const existing = await db.select().from(superadminUsers).where(eq(superadminUsers.username, "superadmin"));
  const defaultPassword = process.env.SUPERADMIN_PASSWORD || "qollai2024";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  if (existing.length === 0) {
    await db.insert(superadminUsers).values({
      username: "superadmin",
      password: hashedPassword,
    });
    console.log("Created superadmin user: superadmin/" + defaultPassword);
  } else if (process.env.SUPERADMIN_RESET === "true") {
    await db.update(superadminUsers)
      .set({ password: hashedPassword })
      .where(eq(superadminUsers.username, "superadmin"));
    console.log("Superadmin password reset to: " + defaultPassword);
  }
}

async function ensureDefaultTenant(): Promise<string> {
  const existing = await db.select().from(tenants).where(eq(tenants.slug, "default"));
  if (existing.length > 0) {
    return existing[0].id;
  }
  const [tenant] = await db.insert(tenants).values({
    name: "Default Restaurant",
    slug: "default",
    status: "customer",
    source: "other",
    isActive: true,
  } as any).returning();
  console.log("Created default tenant");
  return tenant.id;
}

async function ensureAdminUser(tenantId: string) {
  const existingAdmin = await db.select().from(adminUsers).where(eq(adminUsers.username, "admin"));

  const hashedPassword = await bcrypt.hash("admin123", 10);

  if (existingAdmin.length === 0) {
    await db.insert(adminUsers).values({
      username: "admin",
      password: hashedPassword,
      isActive: true,
      tenantId,
    });
    console.log("Created admin user: admin/admin123");
  } else {
    await db.update(adminUsers)
      .set({ password: hashedPassword, isActive: true, tenantId })
      .where(eq(adminUsers.username, "admin"));
    console.log("Updated admin user password to admin123");
  }
}

async function backfillTenantId(tenantId: string) {
  const tables = [
    { table: categories, col: categories.tenantId },
    { table: menuItems, col: menuItems.tenantId },
    { table: customers, col: customers.tenantId },
    { table: orders, col: orders.tenantId },
    { table: orderItems, col: orderItems.tenantId },
    { table: reviews, col: reviews.tenantId },
  ];

  for (const { table, col } of tables) {
    try {
      await db.update(table as any).set({ tenantId } as any).where(eq(col as any, null as any));
    } catch (e) {
      // Column might not exist yet during initial migration
    }
  }
}

export async function seedDatabase() {
  console.log("Seeding database...");

  await ensureSuperadmin();
  const tenantId = await ensureDefaultTenant();
  await ensureAdminUser(tenantId);
  await backfillTenantId(tenantId);

  const existingCategories = await db.select().from(categories);
  if (existingCategories.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  const categoryData = [
    { name: "Ana Yemekler", description: "Lezzetli ana yemekler", sortOrder: 1, isActive: true, tenantId },
    { name: "Çorbalar", description: "Sıcak çorbalar", sortOrder: 2, isActive: true, tenantId },
    { name: "Salatalar", description: "Taze salatalar", sortOrder: 3, isActive: true, tenantId },
    { name: "Tatlılar", description: "Tatlı çeşitleri", sortOrder: 4, isActive: true, tenantId },
    { name: "İçecekler", description: "Soğuk ve sıcak içecekler", sortOrder: 5, isActive: true, tenantId },
  ];

  const insertedCategories = await db.insert(categories).values(categoryData).returning();
  console.log(`Inserted ${insertedCategories.length} categories`);

  const categoryMap = new Map(insertedCategories.map(c => [c.name, c.id]));

  const menuItemData = [
    { name: "Izgara Köfte", description: "El yapımı köfte, yanında pilav ve salata ile", price: "85.00", image: "https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Ana Yemekler"), isAvailable: true, isPopular: true, sortOrder: 1, tenantId },
    { name: "Tavuk Sote", description: "Sebzeli tavuk sote, pilav eşliğinde", price: "75.00", image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Ana Yemekler"), isAvailable: true, isPopular: true, sortOrder: 2, tenantId },
    { name: "Et Döner", description: "Taze pide ekmeğiyle et döner", price: "95.00", image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Ana Yemekler"), isAvailable: true, isPopular: false, sortOrder: 3, tenantId },
    { name: "Lahmacun", description: "İnce hamur, bol malzemeli lahmacun", price: "35.00", image: "https://images.unsplash.com/photo-1601924287811-e34f8e11585c?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Ana Yemekler"), isAvailable: true, isPopular: true, sortOrder: 4, tenantId },
    { name: "Pide Çeşitleri", description: "Kıymalı, kaşarlı veya karışık pide", price: "65.00", image: "https://images.unsplash.com/photo-1579888944880-d98341245702?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Ana Yemekler"), isAvailable: true, isPopular: false, sortOrder: 5, tenantId },
    { name: "Mercimek Çorbası", description: "Geleneksel ev yapımı mercimek çorbası", price: "25.00", image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Çorbalar"), isAvailable: true, isPopular: true, sortOrder: 1, tenantId },
    { name: "Ezogelin Çorbası", description: "Baharatlı, lezzetli ezogelin", price: "25.00", image: "https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Çorbalar"), isAvailable: true, isPopular: false, sortOrder: 2, tenantId },
    { name: "Çoban Salata", description: "Taze sebzelerle hazırlanan çoban salata", price: "30.00", image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Salatalar"), isAvailable: true, isPopular: false, sortOrder: 1, tenantId },
    { name: "Sezar Salata", description: "Tavuklu sezar salata", price: "45.00", image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Salatalar"), isAvailable: true, isPopular: false, sortOrder: 2, tenantId },
    { name: "Künefe", description: "Sıcak servis edilen künefe, kaymaklı", price: "55.00", image: "https://images.unsplash.com/photo-1519676867240-f03562e64548?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Tatlılar"), isAvailable: true, isPopular: true, sortOrder: 1, tenantId },
    { name: "Sütlaç", description: "Fırınlanmış sütlaç", price: "35.00", image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Tatlılar"), isAvailable: true, isPopular: false, sortOrder: 2, tenantId },
    { name: "Ayran", description: "Ev yapımı taze ayran", price: "10.00", image: "https://images.unsplash.com/photo-1571950006470-10a5a0b0a9ef?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("İçecekler"), isAvailable: true, isPopular: false, sortOrder: 1, tenantId },
    { name: "Türk Kahvesi", description: "Geleneksel Türk kahvesi", price: "20.00", image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("İçecekler"), isAvailable: true, isPopular: false, sortOrder: 2, tenantId },
  ];

  const insertedMenuItems = await db.insert(menuItems).values(menuItemData).returning();
  console.log(`Inserted ${insertedMenuItems.length} menu items`);

  const reviewData = [
    { customerName: "Ahmet Y.", rating: 5, comment: "Harika lezzetler!", menuItemName: "Izgara Köfte", isApproved: true, tenantId },
    { customerName: "Fatma K.", rating: 5, comment: "Her hafta sipariş veriyoruz.", menuItemName: "Lahmacun", isApproved: true, tenantId },
    { customerName: "Mehmet A.", rating: 4, comment: "Künefe gerçekten ev yapımı lezzette.", menuItemName: "Künefe", isApproved: true, tenantId },
    { customerName: "Zeynep D.", rating: 5, comment: "Hızlı teslimat ve lezzetli yemekler.", menuItemName: "Tavuk Sote", isApproved: true, tenantId },
    { customerName: "Ali R.", rating: 5, comment: "Çorbaları müthiş taze.", menuItemName: "Mercimek Çorbası", isApproved: true, tenantId },
    { customerName: "Ayşe B.", rating: 5, comment: "Misafirlerime ikram ettim, herkes bayıldı.", menuItemName: "Et Döner", isApproved: true, tenantId },
  ];

  const insertedReviews = await db.insert(reviews).values(reviewData).returning();
  console.log(`Inserted ${insertedReviews.length} reviews`);

  const customerData = [
    { name: "Ahmet Yılmaz", phone: "5321234567", address: "Cumhuriyet Mah. Atatürk Cad. No: 15, Çorlu", tenantId },
    { name: "Fatma Demir", phone: "5329876543", address: "Kazımiye Mah. İstasyon Sok. No: 8/3, Çorlu", tenantId },
    { name: "Mehmet Kaya", phone: "5335556677", address: "Nusratiye Mah. Üniversite Cad. No: 22, Çorlu", tenantId },
  ];

  const insertedCustomers = await db.insert(customers).values(customerData).returning();
  console.log(`Inserted ${insertedCustomers.length} customers`);

  const kofte = insertedMenuItems.find(m => m.name === "Izgara Köfte");
  const lahmacun = insertedMenuItems.find(m => m.name === "Lahmacun");
  const mercimek = insertedMenuItems.find(m => m.name === "Mercimek Çorbası");
  const ayran = insertedMenuItems.find(m => m.name === "Ayran");

  const now = new Date();
  const orderData = [
    { customerId: insertedCustomers[0].id, customerName: insertedCustomers[0].name, customerPhone: insertedCustomers[0].phone, customerAddress: insertedCustomers[0].address!, paymentMethod: "cash" as const, status: "delivered" as const, subtotal: "120.00", total: "120.00", notes: null, confirmedAt: new Date(now.getTime() - 3600000), deliveredAt: new Date(now.getTime() - 1800000), tenantId },
    { customerId: insertedCustomers[1].id, customerName: insertedCustomers[1].name, customerPhone: insertedCustomers[1].phone, customerAddress: insertedCustomers[1].address!, paymentMethod: "pos" as const, status: "confirmed" as const, subtotal: "95.00", total: "95.00", notes: "Aci olmasin", confirmedAt: new Date(), deliveredAt: null, tenantId },
    { customerId: insertedCustomers[2].id, customerName: insertedCustomers[2].name, customerPhone: insertedCustomers[2].phone, customerAddress: insertedCustomers[2].address!, paymentMethod: "cash" as const, status: "pending" as const, subtotal: "75.00", total: "75.00", notes: null, confirmedAt: null, deliveredAt: null, tenantId },
  ];

  const insertedOrders = await db.insert(orders).values(orderData).returning();
  console.log(`Inserted ${insertedOrders.length} orders`);

  const orderItemData = [
    { orderId: insertedOrders[0].id, menuItemId: kofte!.id, menuItemName: kofte!.name, quantity: 1, unitPrice: kofte!.price, totalPrice: "85.00", upsells: null, tenantId },
    { orderId: insertedOrders[0].id, menuItemId: lahmacun!.id, menuItemName: lahmacun!.name, quantity: 1, unitPrice: lahmacun!.price, totalPrice: "35.00", upsells: null, tenantId },
    { orderId: insertedOrders[1].id, menuItemId: kofte!.id, menuItemName: kofte!.name, quantity: 1, unitPrice: kofte!.price, totalPrice: "85.00", upsells: null, tenantId },
    { orderId: insertedOrders[1].id, menuItemId: ayran!.id, menuItemName: ayran!.name, quantity: 1, unitPrice: ayran!.price, totalPrice: "10.00", upsells: null, tenantId },
    { orderId: insertedOrders[2].id, menuItemId: mercimek!.id, menuItemName: mercimek!.name, quantity: 2, unitPrice: mercimek!.price, totalPrice: "50.00", upsells: null, tenantId },
    { orderId: insertedOrders[2].id, menuItemId: ayran!.id, menuItemName: ayran!.name, quantity: 1, unitPrice: ayran!.price, totalPrice: "10.00", upsells: null, tenantId },
  ];

  await db.insert(orderItems).values(orderItemData);
  console.log(`Inserted ${orderItemData.length} order items`);

  console.log("Database seeded successfully!");
}
