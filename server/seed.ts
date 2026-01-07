import { db } from "./db";
import { categories, menuItems, reviews, customers, orders, orderItems, siteProfile, socialLinks, whatsappSettings } from "@shared/schema";

export async function seedDatabase() {
  console.log("Seeding database...");

  // Check if data already exists
  const existingCategories = await db.select().from(categories);
  if (existingCategories.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  // Seed categories
  const categoryData = [
    { name: "Ana Yemekler", description: "Lezzetli ana yemekler", sortOrder: 1, isActive: true },
    { name: "Corbalar", description: "Sicak corbalar", sortOrder: 2, isActive: true },
    { name: "Salatalar", description: "Taze salatalar", sortOrder: 3, isActive: true },
    { name: "Tatlilar", description: "Tatli cesitleri", sortOrder: 4, isActive: true },
    { name: "Icecekler", description: "Soguk ve sicak icecekler", sortOrder: 5, isActive: true },
  ];

  const insertedCategories = await db.insert(categories).values(categoryData).returning();
  console.log(`Inserted ${insertedCategories.length} categories`);

  const categoryMap = new Map(insertedCategories.map(c => [c.name, c.id]));

  // Seed menu items
  const menuItemData = [
    { name: "Izgara Kofte", description: "El yapimi kofte, yaninda pilav ve salata ile", price: "85.00", image: "https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Ana Yemekler"), isAvailable: true, isPopular: true, sortOrder: 1 },
    { name: "Tavuk Sote", description: "Sebzeli tavuk sote, pilav esliginde", price: "75.00", image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Ana Yemekler"), isAvailable: true, isPopular: true, sortOrder: 2 },
    { name: "Et Doner", description: "Taze pide ekmegiyle et doner", price: "95.00", image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Ana Yemekler"), isAvailable: true, isPopular: false, sortOrder: 3 },
    { name: "Lahmacun", description: "Ince hamur, bol malzemeli lahmacun", price: "35.00", image: "https://images.unsplash.com/photo-1601924287811-e34f8e11585c?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Ana Yemekler"), isAvailable: true, isPopular: true, sortOrder: 4 },
    { name: "Pide Cesitleri", description: "Kiymali, kasarli veya karisik pide", price: "65.00", image: "https://images.unsplash.com/photo-1579888944880-d98341245702?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Ana Yemekler"), isAvailable: true, isPopular: false, sortOrder: 5 },
    { name: "Mercimek Corbasi", description: "Geleneksel ev yapimi mercimek corbasi", price: "25.00", image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Corbalar"), isAvailable: true, isPopular: true, sortOrder: 1 },
    { name: "Ezogelin Corbasi", description: "Baharatli, lezzetli ezogelin", price: "25.00", image: "https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Corbalar"), isAvailable: true, isPopular: false, sortOrder: 2 },
    { name: "Coban Salata", description: "Taze sebzelerle hazirlanan coban salata", price: "30.00", image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Salatalar"), isAvailable: true, isPopular: false, sortOrder: 1 },
    { name: "Sezar Salata", description: "Tavuklu sezar salata", price: "45.00", image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Salatalar"), isAvailable: true, isPopular: false, sortOrder: 2 },
    { name: "Kunefe", description: "Sicak servis edilen kunefe, kaymakli", price: "55.00", image: "https://images.unsplash.com/photo-1519676867240-f03562e64548?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Tatlilar"), isAvailable: true, isPopular: true, sortOrder: 1 },
    { name: "Sutlac", description: "Firinlanmis sutlac", price: "35.00", image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Tatlilar"), isAvailable: true, isPopular: false, sortOrder: 2 },
    { name: "Ayran", description: "Ev yapimi taze ayran", price: "10.00", image: "https://images.unsplash.com/photo-1571950006470-10a5a0b0a9ef?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Icecekler"), isAvailable: true, isPopular: false, sortOrder: 1 },
    { name: "Turk Kahvesi", description: "Geleneksel Turk kahvesi", price: "20.00", image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80", categoryId: categoryMap.get("Icecekler"), isAvailable: true, isPopular: false, sortOrder: 2 },
  ];

  const insertedMenuItems = await db.insert(menuItems).values(menuItemData).returning();
  console.log(`Inserted ${insertedMenuItems.length} menu items`);

  // Seed reviews
  const reviewData = [
    { customerName: "Ahmet Y.", rating: 5, comment: "Harika lezzetler! Ozellikle izgara kofte muhteseḿdi. Teslimat da cok hizliydi, 25 dakikada geldi.", menuItemName: "Izgara Kofte", isApproved: true },
    { customerName: "Fatma K.", rating: 5, comment: "Her hafta siparis veriyoruz. Hem lezzetli hem de fiyatlar uygun. WhatsApp'tan siparis vermek cok pratik.", menuItemName: "Lahmacun", isApproved: true },
    { customerName: "Mehmet A.", rating: 4, comment: "Kunefe gercekten ev yapimi lezzette. Ailece cok begendik, tekrar siparis verecegiz.", menuItemName: "Kunefe", isApproved: true },
    { customerName: "Zeynep D.", rating: 5, comment: "Is yerinde ogle yemegi icin ideal. Hizli teslimat ve lezzetli yemekler. Tesekkurler Lezzet Express!", menuItemName: "Tavuk Sote", isApproved: true },
    { customerName: "Ali R.", rating: 5, comment: "Corbalari muthis taze ve sicak geliyor. Mercimek corbasi favori yemegim oldu. Kesinlikle tavsiye ederim.", menuItemName: "Mercimek Corbasi", isApproved: true },
    { customerName: "Ayse B.", rating: 5, comment: "Misafirlerime ikram ettim, herkes bayildi. Sunum da cok guzeldi. En iyi tercihimiz!", menuItemName: "Et Doner", isApproved: true },
  ];

  const insertedReviews = await db.insert(reviews).values(reviewData).returning();
  console.log(`Inserted ${insertedReviews.length} reviews`);

  // Seed sample customers
  const customerData = [
    { name: "Ahmet Yilmaz", phone: "5321234567", address: "Cumhuriyet Mah. Ataturk Cad. No: 15, Corlu" },
    { name: "Fatma Demir", phone: "5329876543", address: "Kazimiye Mah. Istasyon Sok. No: 8/3, Corlu" },
    { name: "Mehmet Kaya", phone: "5335556677", address: "Nusratiye Mah. Universite Cad. No: 22, Corlu" },
  ];

  const insertedCustomers = await db.insert(customers).values(customerData).returning();
  console.log(`Inserted ${insertedCustomers.length} customers`);

  // Find menu item IDs for orders
  const kofte = insertedMenuItems.find(m => m.name === "Izgara Kofte");
  const lahmacun = insertedMenuItems.find(m => m.name === "Lahmacun");
  const mercimek = insertedMenuItems.find(m => m.name === "Mercimek Corbasi");
  const ayran = insertedMenuItems.find(m => m.name === "Ayran");

  // Seed sample orders with different statuses
  const now = new Date();
  const orderData = [
    {
      customerId: insertedCustomers[0].id,
      customerName: insertedCustomers[0].name,
      customerPhone: insertedCustomers[0].phone,
      customerAddress: insertedCustomers[0].address,
      paymentMethod: "cash" as const,
      status: "delivered" as const,
      subtotal: "120.00",
      total: "120.00",
      notes: null,
      confirmedAt: new Date(now.getTime() - 3600000),
      deliveredAt: new Date(now.getTime() - 1800000),
    },
    {
      customerId: insertedCustomers[1].id,
      customerName: insertedCustomers[1].name,
      customerPhone: insertedCustomers[1].phone,
      customerAddress: insertedCustomers[1].address,
      paymentMethod: "pos" as const,
      status: "confirmed" as const,
      subtotal: "95.00",
      total: "95.00",
      notes: "Aci olmasin",
      confirmedAt: new Date(),
      deliveredAt: null,
    },
    {
      customerId: insertedCustomers[2].id,
      customerName: insertedCustomers[2].name,
      customerPhone: insertedCustomers[2].phone,
      customerAddress: insertedCustomers[2].address,
      paymentMethod: "cash" as const,
      status: "pending" as const,
      subtotal: "75.00",
      total: "75.00",
      notes: null,
      confirmedAt: null,
      deliveredAt: null,
    },
  ];

  const insertedOrders = await db.insert(orders).values(orderData).returning();
  console.log(`Inserted ${insertedOrders.length} orders`);

  // Seed order items
  const orderItemData = [
    { orderId: insertedOrders[0].id, menuItemId: kofte!.id, menuItemName: kofte!.name, quantity: 1, unitPrice: kofte!.price, totalPrice: "85.00", upsells: null },
    { orderId: insertedOrders[0].id, menuItemId: lahmacun!.id, menuItemName: lahmacun!.name, quantity: 1, unitPrice: lahmacun!.price, totalPrice: "35.00", upsells: null },
    { orderId: insertedOrders[1].id, menuItemId: kofte!.id, menuItemName: kofte!.name, quantity: 1, unitPrice: kofte!.price, totalPrice: "85.00", upsells: null },
    { orderId: insertedOrders[1].id, menuItemId: ayran!.id, menuItemName: ayran!.name, quantity: 1, unitPrice: ayran!.price, totalPrice: "10.00", upsells: null },
    { orderId: insertedOrders[2].id, menuItemId: mercimek!.id, menuItemName: mercimek!.name, quantity: 2, unitPrice: mercimek!.price, totalPrice: "50.00", upsells: null },
    { orderId: insertedOrders[2].id, menuItemId: ayran!.id, menuItemName: ayran!.name, quantity: 1, unitPrice: ayran!.price, totalPrice: "10.00", upsells: null },
  ];

  await db.insert(orderItems).values(orderItemData);
  console.log(`Inserted ${orderItemData.length} order items`);

  // Seed site profile (CMS)
  const siteProfileData = {
    restaurantName: "Lezzet Express",
    tagline: "Corlu'nun En Lezzetli Adresi",
    aboutText: "Lezzet Express olarak, geleneksel Turk mutfaginin en guzel lezzetlerini evinize getiriyoruz. Taze malzemeler ve ozenle hazirlanan yemeklerimizle sizlere hizmet vermekten mutluluk duyuyoruz.",
    heroTitle: "Ev Yapimi Lezzetler Kapiinizda",
    heroSubtitle: "Taze malzemeler, ozenle hazirlanan yemekler. WhatsApp'tan kolay siparis verin.",
    address: "Cumhuriyet Mah. Merkez Cad. No: 42, Corlu/Tekirdag",
    phone: "0282 123 45 67",
    email: "info@lezzetexpress.com",
  };

  await db.insert(siteProfile).values(siteProfileData);
  console.log("Inserted site profile");

  // Seed social links (CMS)
  const socialLinksData = [
    { platform: "instagram", url: "https://instagram.com/lezzetexpress", isVisible: true, sortOrder: 1 },
    { platform: "facebook", url: "https://facebook.com/lezzetexpress", isVisible: true, sortOrder: 2 },
    { platform: "twitter", url: "https://twitter.com/lezzetexpress", isVisible: false, sortOrder: 3 },
    { platform: "youtube", url: "", isVisible: false, sortOrder: 4 },
  ];

  await db.insert(socialLinks).values(socialLinksData);
  console.log(`Inserted ${socialLinksData.length} social links`);

  // Seed WhatsApp settings (CMS)
  const whatsappSettingsData = {
    businessPhone: "905551234567",
    defaultMessage: "Merhaba, Lezzet Express'ten siparis vermek istiyorum.",
    orderConfirmationTemplate: "Sayin {customerName}, siparisini aldik! Siparis No: {orderId}. En kisa surede hazirlanip adresinize teslim edilecektir.",
    isEnabled: true,
  };

  await db.insert(whatsappSettings).values(whatsappSettingsData);
  console.log("Inserted WhatsApp settings");

  console.log("Database seeded successfully!");
}
