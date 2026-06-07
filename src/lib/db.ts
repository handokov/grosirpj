import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ============================================================
// Database URL Resolution for Vercel Serverless
// ============================================================
function getDatabaseUrl() {
  const defaultUrl = process.env.DATABASE_URL || 'file:./dev.db';

  // If running on Vercel and DATABASE_URL is a relative path, redirect to /tmp
  if (process.env.VERCEL && defaultUrl.startsWith('file:./')) {
    // Use triple-slash for absolute path in SQLite URI format
    return `file:///tmp/${defaultUrl.replace('file:./', '')}`;
  }

  return defaultUrl;
}

// On Vercel, we MUST set process.env.DATABASE_URL at runtime
// because Prisma reads from env vars during query execution,
// not just at client initialization time.
const resolvedUrl = getDatabaseUrl();
if (process.env.VERCEL) {
  process.env.DATABASE_URL = resolvedUrl;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
    datasources: {
      db: {
        url: resolvedUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ============================================================
// Database Table Initialization (for Vercel /tmp ephemeral DB)
// ============================================================
let dbTablesEnsured = false;
let dbEnsurePromise: Promise<void> | null = null;

/**
 * Ensures all database tables exist. On Vercel, the /tmp database is
 * ephemeral and starts empty on each cold start, so we need to create
 * tables AND seed demo data before any query.
 */
export async function ensureDb(): Promise<void> {
  if (dbTablesEnsured) return;

  // Deduplicate concurrent calls
  if (!dbEnsurePromise) {
    dbEnsurePromise = createTablesAndSeedIfNeeded().finally(() => {
      dbEnsurePromise = null;
    });
  }

  await dbEnsurePromise;
}

// Simple hash function (must match seed route)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

async function createTablesAndSeedIfNeeded(): Promise<void> {
  // Quick check: if tables already exist with data, skip
  try {
    const userCount = await db.user.count();
    if (userCount > 0) {
      dbTablesEnsured = true;
      return;
    }
    // Tables exist but empty — need to seed
    console.log('[ensureDb] Tables exist but empty, seeding...');
    await seedDemoData();
    dbTablesEnsured = true;
    return;
  } catch {
    // Tables don't exist yet, continue to create them
  }

  console.log('[ensureDb] Creating database tables on Vercel /tmp...');

  try {
    // Create all tables with proper foreign keys and indexes
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "password" TEXT NOT NULL,
          "phone" TEXT NOT NULL DEFAULT '',
          "city" TEXT NOT NULL DEFAULT 'Jakarta',
          "address" TEXT NOT NULL DEFAULT '',
          "role" TEXT NOT NULL DEFAULT 'buyer',
          "storeName" TEXT,
          "storeDescription" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Product" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "description" TEXT NOT NULL DEFAULT '',
          "price" INTEGER NOT NULL,
          "originalPrice" INTEGER NOT NULL DEFAULT 0,
          "category" TEXT NOT NULL,
          "images" TEXT NOT NULL DEFAULT '[]',
          "minOrder" INTEGER NOT NULL DEFAULT 1,
          "stock" INTEGER NOT NULL DEFAULT 0,
          "location" TEXT NOT NULL DEFAULT 'Jakarta',
          "active" BOOLEAN NOT NULL DEFAULT true,
          "sold" INTEGER NOT NULL DEFAULT 0,
          "rating" REAL NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "sellerId" TEXT NOT NULL,
          CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "Product"("category")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_sellerId_idx" ON "Product"("sellerId")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_active_idx" ON "Product"("active")`);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VariantGroup" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "order" INTEGER NOT NULL DEFAULT 0,
          "productId" TEXT NOT NULL,
          CONSTRAINT "VariantGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "VariantGroup_productId_idx" ON "VariantGroup"("productId")`);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VariantOption" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "value" TEXT NOT NULL,
          "variantGroupId" TEXT NOT NULL,
          CONSTRAINT "VariantOption_variantGroupId_fkey" FOREIGN KEY ("variantGroupId") REFERENCES "VariantGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "VariantOption_variantGroupId_idx" ON "VariantOption"("variantGroupId")`);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Order" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "buyerId" TEXT NOT NULL,
          "sellerId" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'pending',
          "totalAmount" INTEGER NOT NULL,
          "shippingCost" INTEGER NOT NULL DEFAULT 0,
          "shippingAddress" TEXT NOT NULL DEFAULT '',
          "paymentMethod" TEXT NOT NULL DEFAULT 'cod',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_buyerId_idx" ON "Order"("buyerId")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_sellerId_idx" ON "Order"("sellerId")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status")`);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OrderItem" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "orderId" TEXT NOT NULL,
          "productId" TEXT NOT NULL,
          "productName" TEXT NOT NULL,
          "quantity" INTEGER NOT NULL,
          "price" INTEGER NOT NULL,
          "variants" TEXT NOT NULL DEFAULT '{}',
          CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId")`);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Review" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "productId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "rating" INTEGER NOT NULL,
          "comment" TEXT NOT NULL DEFAULT '',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Review_productId_idx" ON "Review"("productId")`);
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Review_productId_userId_key" ON "Review"("productId", "userId")`);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Chat" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "senderId" TEXT NOT NULL,
          "receiverId" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "read" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Chat_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT "Chat_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Chat_senderId_receiverId_idx" ON "Chat"("senderId", "receiverId")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Chat_receiverId_read_idx" ON "Chat"("receiverId", "read")`);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Wishlist" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "productId" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "Wishlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Wishlist_userId_idx" ON "Wishlist"("userId")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Wishlist_productId_idx" ON "Wishlist"("productId")`);
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Wishlist_userId_productId_key" ON "Wishlist"("userId", "productId")`);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Notification" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'info',
          "read" BOOLEAN NOT NULL DEFAULT false,
          "link" TEXT NOT NULL DEFAULT '',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt")`);

    console.log('[ensureDb] All database tables created successfully');

    // Auto-seed demo data after creating tables (especially for Vercel ephemeral DB)
    await seedDemoData();

    dbTablesEnsured = true;
  } catch (error) {
    console.error('[ensureDb] Failed to create tables:', error);
    throw error;
  }
}

// ============================================================
// Auto-seed demo data (for Vercel ephemeral DB cold starts)
// ============================================================
async function seedDemoData(): Promise<void> {
  // Check if already seeded
  const existingUsers = await db.user.count();
  if (existingUsers > 0) {
    return; // Already seeded, skip
  }

  console.log('[ensureDb] Seeding demo data...');

  const img = (url: string) => `${url}?w=400&h=400&fit=crop`;

  const FASHION_IMGS = [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab',
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35',
    'https://images.unsplash.com/photo-1473966968600-fa801b869a1a',
    'https://images.unsplash.com/photo-1551028719-00167b16eac5',
    'https://images.unsplash.com/photo-1583391733956-6c78276477e2',
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8',
    'https://images.unsplash.com/photo-1612423284934-2850a4ea6b0f',
    'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62',
  ];

  const ELEKTRONIK_IMGS = [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1',
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3',
    'https://images.unsplash.com/photo-1590658268037-6bf12f032f55',
    'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5',
  ];

  const RUMAH_IMGS = [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af',
    'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2',
  ];

  const KECANTIKAN_IMGS = ['https://images.unsplash.com/photo-1596462502278-27bfdc403348'];
  const KESEHATAN_IMGS = ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae'];
  const OLAHRAGA_IMGS = ['https://images.unsplash.com/photo-1542291026-7eec264c27ff'];
  const MAINAN_IMGS = ['https://images.unsplash.com/photo-1558060370-d644479cb6f7'];
  const MAKANAN_IMGS = ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e'];

  // Create users
  const seller1 = await db.user.create({
    data: { email: 'seller1@grosirpj.id', name: 'CV Garment Prima', password: simpleHash('password123'), phone: '021-5551234', city: 'Jakarta', address: 'Jl. Tanah Abang Blok A No. 12, Jakarta Pusat', role: 'seller', storeName: 'CV Garment Prima', storeDescription: 'Supplier fashion grosir terpercaya sejak 2015' },
  });
  const seller2 = await db.user.create({
    data: { email: 'seller2@grosirpj.id', name: 'Elektronik Surabaya', password: simpleHash('password123'), phone: '031-7779876', city: 'Surabaya', address: 'Jl. Genteng Kali No. 45, Surabaya', role: 'seller', storeName: 'Elektronik Surabaya', storeDescription: 'Pusat grosir elektronik terlengkap' },
  });
  const buyer1 = await db.user.create({
    data: { email: 'buyer@grosirpj.id', name: 'Budi Santoso', password: simpleHash('password123'), phone: '022-3334455', city: 'Bandung', address: 'Jl. Dago No. 88, Bandung', role: 'buyer' },
  });
  const buyer2 = await db.user.create({
    data: { email: 'buyer2@grosirpj.id', name: 'Siti Aminah', password: simpleHash('password123'), phone: '0274-556677', city: 'Yogyakarta', address: 'Jl. Malioboro No. 25, Yogyakarta', role: 'buyer' },
  });

  // Create products
  const productsData = [
    { name: 'Kaos Polos Premium Cotton Combed 30s', price: 35000, originalPrice: 50000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[0]), img(FASHION_IMGS[1])]), minOrder: 12, stock: 500, location: 'Jakarta', sold: 1250, rating: 4.7, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['S', 'M', 'L', 'XL', 'XXL'] }, { name: 'Warna', order: 1, options: ['Hitam', 'Putih', 'Navy', 'Merah'] }] },
    { name: 'Kemeja Batik Pria Lengan Panjang', price: 85000, originalPrice: 120000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[2]), img(FASHION_IMGS[3])]), minOrder: 6, stock: 200, location: 'Jakarta', sold: 540, rating: 4.5, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['M', 'L', 'XL', 'XXL'] }] },
    { name: 'Celana Jeans Slim Fit Pria', price: 110000, originalPrice: 165000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[4])]), minOrder: 6, stock: 300, location: 'Jakarta', sold: 780, rating: 4.6, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['28', '30', '32', '34'] }] },
    { name: 'Gaun Muslimah Premium', price: 135000, originalPrice: 185000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[5]), img(FASHION_IMGS[6])]), minOrder: 3, stock: 150, location: 'Jakarta', sold: 320, rating: 4.8, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['S', 'M', 'L', 'XL'] }, { name: 'Warna', order: 1, options: ['Maroon', 'Navy', 'Dusty Pink'] }] },
    { name: 'Hoodie Oversize Unisex', price: 95000, originalPrice: 140000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[7]), img(FASHION_IMGS[8])]), minOrder: 6, stock: 250, location: 'Jakarta', sold: 650, rating: 4.7, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['M', 'L', 'XL', 'XXL'] }, { name: 'Warna', order: 1, options: ['Hitam', 'Abu Muda', 'Sage'] }] },
    { name: 'Rok Plisket Anak Sekolah', price: 42000, originalPrice: 55000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[1])]), minOrder: 24, stock: 600, location: 'Jakarta', sold: 2100, rating: 4.4, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['S', 'M', 'L', 'XL'] }] },
    { name: 'Jaket Parasut Waterproof', price: 75000, originalPrice: 110000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[4])]), minOrder: 12, stock: 400, location: 'Jakarta', sold: 890, rating: 4.5, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['M', 'L', 'XL'] }] },
    { name: 'Daster Rumah Wanita Katun Rayon', price: 28000, originalPrice: 40000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[5])]), minOrder: 24, stock: 800, location: 'Jakarta', sold: 3500, rating: 4.3, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['M', 'L', 'XL'] }] },
    { name: 'Masker Medis 3 Ply Box 50pcs', price: 25000, originalPrice: 35000, category: 'kesehatan', images: JSON.stringify([img(KESEHATAN_IMGS[0])]), minOrder: 10, stock: 1000, location: 'Jakarta', sold: 4200, rating: 4.2, sellerId: seller1.id, variants: [{ name: 'Warna', order: 0, options: ['Biru', 'Hitam', 'Putih'] }] },
    { name: 'Vitamin C 1000mg - Botol 60 Tablet', price: 45000, originalPrice: 65000, category: 'kesehatan', images: JSON.stringify([img(KESEHATAN_IMGS[0])]), minOrder: 12, stock: 500, location: 'Jakarta', sold: 1800, rating: 4.6, sellerId: seller1.id, variants: [] },
    { name: 'Serum Vitamin C untuk Wajah', price: 55000, originalPrice: 85000, category: 'kecantikan', images: JSON.stringify([img(KECANTIKAN_IMGS[0])]), minOrder: 12, stock: 350, location: 'Jakarta', sold: 2200, rating: 4.7, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['20ml', '30ml'] }] },
    { name: 'Paket Skincare Lengkap 5 in 1', price: 125000, originalPrice: 200000, category: 'kecantikan', images: JSON.stringify([img(KECANTIKAN_IMGS[0])]), minOrder: 6, stock: 200, location: 'Jakarta', sold: 950, rating: 4.5, sellerId: seller1.id, variants: [{ name: 'Tipe Kulit', order: 0, options: ['Berminyak', 'Kering', 'Normal'] }] },
    { name: 'Kopi Arabica Gayo Premium 1kg', price: 85000, originalPrice: 110000, category: 'makanan', images: JSON.stringify([img(MAKANAN_IMGS[0])]), minOrder: 5, stock: 300, location: 'Jakarta', sold: 680, rating: 4.8, sellerId: seller1.id, variants: [{ name: 'Roast Level', order: 0, options: ['Light', 'Medium', 'Dark'] }] },
    { name: 'Keripik Singkong Pedas Original 250g', price: 15000, originalPrice: 20000, category: 'makanan', images: JSON.stringify([img(MAKANAN_IMGS[0])]), minOrder: 24, stock: 1000, location: 'Jakarta', sold: 5600, rating: 4.3, sellerId: seller1.id, variants: [{ name: 'Rasa', order: 0, options: ['Pedas Original', 'BBQ', 'Keju'] }] },
    { name: 'Boneka Plush Bear 50cm', price: 35000, originalPrice: 50000, category: 'mainan', images: JSON.stringify([img(MAINAN_IMGS[0])]), minOrder: 12, stock: 400, location: 'Jakarta', sold: 1500, rating: 4.4, sellerId: seller1.id, variants: [{ name: 'Warna', order: 0, options: ['Coklat', 'Putih', 'Pink'] }] },
    { name: 'Sepatu Running Olahraga Unisex', price: 125000, originalPrice: 200000, category: 'olahraga', images: JSON.stringify([img(OLAHRAGA_IMGS[0])]), minOrder: 6, stock: 200, location: 'Jakarta', sold: 420, rating: 4.5, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['39', '40', '41', '42', '43'] }] },
    { name: 'Yoga Mat Premium 8mm', price: 65000, originalPrice: 95000, category: 'olahraga', images: JSON.stringify([img(OLAHRAGA_IMGS[0])]), minOrder: 10, stock: 250, location: 'Jakarta', sold: 310, rating: 4.6, sellerId: seller1.id, variants: [{ name: 'Warna', order: 0, options: ['Ungu', 'Biru', 'Hijau', 'Hitam'] }] },
    { name: 'TWS Earbuds Bluetooth 5.3', price: 75000, originalPrice: 120000, category: 'elektronik', images: JSON.stringify([img(ELEKTRONIK_IMGS[0]), img(ELEKTRONIK_IMGS[1])]), minOrder: 10, stock: 400, location: 'Surabaya', sold: 2100, rating: 4.4, sellerId: seller2.id, variants: [{ name: 'Warna', order: 0, options: ['Hitam', 'Putih', 'Navy'] }] },
    { name: 'Speaker Bluetooth Portable', price: 95000, originalPrice: 150000, category: 'elektronik', images: JSON.stringify([img(ELEKTRONIK_IMGS[2])]), minOrder: 6, stock: 250, location: 'Surabaya', sold: 980, rating: 4.5, sellerId: seller2.id, variants: [{ name: 'Warna', order: 0, options: ['Hitam', 'Merah', 'Biru'] }] },
    { name: 'Powerbank 20000mAh Fast Charging', price: 110000, originalPrice: 165000, category: 'elektronik', images: JSON.stringify([img(ELEKTRONIK_IMGS[3])]), minOrder: 6, stock: 300, location: 'Surabaya', sold: 1450, rating: 4.6, sellerId: seller2.id, variants: [{ name: 'Warna', order: 0, options: ['Hitam', 'Putih'] }] },
    { name: 'Smartwatch Sport Waterproof IP68', price: 145000, originalPrice: 220000, category: 'elektronik', images: JSON.stringify([img(ELEKTRONIK_IMGS[4])]), minOrder: 6, stock: 200, location: 'Surabaya', sold: 760, rating: 4.3, sellerId: seller2.id, variants: [{ name: 'Warna Strap', order: 0, options: ['Hitam', 'Putih', 'Merah'] }] },
    { name: 'Kabel USB-C Fast Charging 1.5m', price: 18000, originalPrice: 28000, category: 'elektronik', images: JSON.stringify([img(ELEKTRONIK_IMGS[1])]), minOrder: 50, stock: 2000, location: 'Surabaya', sold: 8500, rating: 4.2, sellerId: seller2.id, variants: [{ name: 'Tipe', order: 0, options: ['USB-C to USB-C', 'USB-A to USB-C'] }] },
    { name: 'Charger Wall 33W GaN', price: 55000, originalPrice: 85000, category: 'elektronik', images: JSON.stringify([img(ELEKTRONIK_IMGS[5])]), minOrder: 12, stock: 500, location: 'Surabaya', sold: 3200, rating: 4.7, sellerId: seller2.id, variants: [{ name: 'Port', order: 0, options: ['1 USB-C', '2 USB-C', '1C+1A'] }] },
    { name: 'Lampu LED Strip 5m RGB Remote', price: 35000, originalPrice: 55000, category: 'rumah', images: JSON.stringify([img(RUMAH_IMGS[0])]), minOrder: 12, stock: 600, location: 'Surabaya', sold: 2800, rating: 4.3, sellerId: seller2.id, variants: [{ name: 'Panjang', order: 0, options: ['1m', '2m', '5m', '10m'] }] },
    { name: 'Rak Serbaguna 5 Tingkat', price: 85000, originalPrice: 125000, category: 'rumah', images: JSON.stringify([img(RUMAH_IMGS[1])]), minOrder: 5, stock: 150, location: 'Surabaya', sold: 420, rating: 4.5, sellerId: seller2.id, variants: [] },
    { name: 'Diffuser Aromatherapy 300ml', price: 65000, originalPrice: 95000, category: 'rumah', images: JSON.stringify([img(RUMAH_IMGS[2])]), minOrder: 10, stock: 350, location: 'Surabaya', sold: 1100, rating: 4.6, sellerId: seller2.id, variants: [{ name: 'Warna', order: 0, options: ['Putih', 'Kayu Natural', 'Hitam'] }] },
    { name: 'Set Balok Building Blocks 500pcs', price: 55000, originalPrice: 80000, category: 'mainan', images: JSON.stringify([img(MAINAN_IMGS[0])]), minOrder: 12, stock: 300, location: 'Surabaya', sold: 920, rating: 4.4, sellerId: seller2.id, variants: [] },
    { name: 'Remote Control Mobil Drift 1:16', price: 95000, originalPrice: 145000, category: 'mainan', images: JSON.stringify([img(MAINAN_IMGS[0])]), minOrder: 6, stock: 200, location: 'Surabaya', sold: 580, rating: 4.3, sellerId: seller2.id, variants: [{ name: 'Warna', order: 0, options: ['Merah', 'Biru', 'Hitam'] }] },
    { name: 'Resistance Band Set 5 Level', price: 45000, originalPrice: 70000, category: 'olahraga', images: JSON.stringify([img(OLAHRAGA_IMGS[0])]), minOrder: 12, stock: 400, location: 'Surabaya', sold: 1350, rating: 4.5, sellerId: seller2.id, variants: [] },
    { name: 'Sambal Bawang Crispy Jar 250ml', price: 25000, originalPrice: 35000, category: 'makanan', images: JSON.stringify([img(MAKANAN_IMGS[0])]), minOrder: 24, stock: 500, location: 'Surabaya', sold: 3800, rating: 4.7, sellerId: seller2.id, variants: [{ name: 'Level Pedas', order: 0, options: ['Original', 'Extra Pedas', 'Super Pedas'] }] },
  ];

  const createdProducts: { id: string; name: string; sellerId: string; price: number; category: string }[] = [];

  for (const pData of productsData) {
    const { variants, ...productFields } = pData;
    const product = await db.product.create({
      data: {
        ...productFields,
        variantGroups: {
          create: variants.map((v: { name: string; order: number; options: string[] }) => ({
            name: v.name,
            order: v.order,
            options: { create: v.options.map((opt: string) => ({ value: opt })) },
          })),
        },
      },
    });
    createdProducts.push({ id: product.id, name: product.name, sellerId: product.sellerId, price: product.price, category: product.category });
  }

  // Create some orders
  const seller1Products = createdProducts.filter(p => p.sellerId === seller1.id);
  const seller2Products = createdProducts.filter(p => p.sellerId === seller2.id);

  const ordersData = [
    { buyerId: buyer1.id, sellerId: seller1.id, status: 'delivered', totalAmount: 420000, shippingCost: 15000, shippingAddress: 'Jl. Dago No. 88, Bandung', paymentMethod: 'transfer', items: [{ productId: seller1Products[0].id, productName: seller1Products[0].name, quantity: 12, price: 35000, variants: '{}' }] },
    { buyerId: buyer1.id, sellerId: seller2.id, status: 'shipped', totalAmount: 370000, shippingCost: 20000, shippingAddress: 'Jl. Dago No. 88, Bandung', paymentMethod: 'ewallet', items: [{ productId: seller2Products[0].id, productName: seller2Products[0].name, quantity: 3, price: 75000, variants: '{}' }, { productId: seller2Products[3].id, productName: seller2Products[3].name, quantity: 1, price: 145000, variants: '{}' }] },
    { buyerId: buyer2.id, sellerId: seller1.id, status: 'paid', totalAmount: 510000, shippingCost: 18000, shippingAddress: 'Jl. Malioboro No. 25, Yogyakarta', paymentMethod: 'transfer', items: [{ productId: seller1Products[1].id, productName: seller1Products[1].name, quantity: 6, price: 85000, variants: '{}' }] },
    { buyerId: buyer2.id, sellerId: seller2.id, status: 'delivered', totalAmount: 245000, shippingCost: 22000, shippingAddress: 'Jl. Malioboro No. 25, Yogyakarta', paymentMethod: 'cod', items: [{ productId: seller2Products[1].id, productName: seller2Products[1].name, quantity: 2, price: 95000, variants: '{}' }] },
    { buyerId: buyer1.id, sellerId: seller1.id, status: 'pending', totalAmount: 285000, shippingCost: 15000, shippingAddress: 'Jl. Dago No. 88, Bandung', paymentMethod: 'ewallet', items: [{ productId: seller1Products[4].id, productName: seller1Products[4].name, quantity: 3, price: 95000, variants: '{}' }] },
  ];

  for (const orderData of ordersData) {
    const { items, ...orderFields } = orderData;
    await db.order.create({ data: { ...orderFields, items: { create: items } } });
  }

  // Create some reviews
  const reviewsData = [
    { productId: seller1Products[0].id, userId: buyer1.id, rating: 5, comment: 'Kaos nyaman banget, bahan adem!' },
    { productId: seller1Products[0].id, userId: buyer2.id, rating: 4, comment: 'Bahan bagus, ukuran agak besar.' },
    { productId: seller1Products[1].id, userId: buyer2.id, rating: 5, comment: 'Batiknya cantik banget!' },
    { productId: seller1Products[4].id, userId: buyer1.id, rating: 5, comment: 'Hoodie-nya tebal dan hangat!' },
    { productId: seller2Products[0].id, userId: buyer1.id, rating: 4, comment: 'TWS bagus untuk harga segini.' },
    { productId: seller2Products[2].id, userId: buyer1.id, rating: 5, comment: 'Powerbank kualitas terbaik!' },
  ];

  for (const reviewData of reviewsData) {
    await db.review.create({ data: reviewData });
  }

  // Create some chats
  const chatsData = [
    { senderId: buyer1.id, receiverId: seller1.id, message: 'Halo kak, kaos polos ready stock?', read: true },
    { senderId: seller1.id, receiverId: buyer1.id, message: 'Ready stock kak! Warna hitam dan putih paling banyak.', read: true },
    { senderId: buyer1.id, receiverId: seller1.id, message: 'Kalau beli 12 pcs bisa nego?', read: true },
    { senderId: seller1.id, receiverId: buyer1.id, message: 'Untuk 12 pcs harga sudah tertera kak. 24 pcs bisa diskon!', read: false },
    { senderId: buyer2.id, receiverId: seller2.id, message: 'Mas, TWS ini garansi berapa lama?', read: true },
    { senderId: seller2.id, receiverId: buyer2.id, message: 'Garansi 6 bulan kak, klaim langsung ke kami.', read: false },
  ];

  for (const chatData of chatsData) {
    await db.chat.create({ data: chatData });
  }

  // Create some notifications
  const notificationsData = [
    { userId: buyer1.id, title: 'Pesanan Dikirim', message: 'Pesanan dari CV Garment Prima sedang dikirim', type: 'order', read: false },
    { userId: buyer1.id, title: 'Flash Sale Dimulai!', message: 'Diskon hingga 70% untuk produk pilihan', type: 'promo', read: false },
    { userId: buyer2.id, title: 'Pesanan Selesai', message: 'Pesanan dari Elektronik Surabaya telah diterima', type: 'order', read: false },
    { userId: seller1.id, title: 'Pesanan Baru', message: 'Anda mendapat pesanan baru dari Budi Santoso', type: 'order', read: false },
  ];

  for (const notifData of notificationsData) {
    await db.notification.create({ data: notifData });
  }

  console.log('[ensureDb] Demo data seeded successfully');
}
