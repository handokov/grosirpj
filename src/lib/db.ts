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
    // Create all tables with proper foreign keys and indexes matching Prisma schema

    // --- User ---
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "password" TEXT NOT NULL,
          "phone" TEXT NOT NULL DEFAULT '',
          "city" TEXT NOT NULL DEFAULT 'Jakarta',
          "address" TEXT NOT NULL DEFAULT '',
          "province" TEXT NOT NULL DEFAULT '',
          "postalCode" TEXT NOT NULL DEFAULT '',
          "avatar" TEXT NOT NULL DEFAULT '',
          "gender" TEXT NOT NULL DEFAULT '',
          "dateOfBirth" TEXT NOT NULL DEFAULT '',
          "role" TEXT NOT NULL DEFAULT 'buyer',
          "storeName" TEXT,
          "storeDescription" TEXT,
          "storeAvatar" TEXT,
          "bankName" TEXT,
          "bankAccount" TEXT,
          "bankHolder" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`);

    // --- UserAddress ---
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserAddress" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "label" TEXT NOT NULL,
          "recipient" TEXT NOT NULL,
          "phone" TEXT NOT NULL,
          "address" TEXT NOT NULL,
          "city" TEXT NOT NULL,
          "province" TEXT NOT NULL DEFAULT '',
          "postalCode" TEXT NOT NULL DEFAULT '',
          "isDefault" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "UserAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UserAddress_userId_idx" ON "UserAddress"("userId")`);

    // --- Product ---
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
          "weight" INTEGER NOT NULL DEFAULT 500,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "sellerId" TEXT NOT NULL,
          CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "Product"("category")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_sellerId_idx" ON "Product"("sellerId")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_active_idx" ON "Product"("active")`);

    // --- VariantGroup ---
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

    // --- VariantOption ---
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VariantOption" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "value" TEXT NOT NULL,
          "variantGroupId" TEXT NOT NULL,
          CONSTRAINT "VariantOption_variantGroupId_fkey" FOREIGN KEY ("variantGroupId") REFERENCES "VariantGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "VariantOption_variantGroupId_idx" ON "VariantOption"("variantGroupId")`);

    // --- Order ---
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
          "notes" TEXT NOT NULL DEFAULT '',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_buyerId_idx" ON "Order"("buyerId")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_sellerId_idx" ON "Order"("sellerId")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status")`);

    // --- OrderItem ---
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

    // --- Review ---
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

    // --- Chat ---
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

    // --- Wishlist ---
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

    // --- Notification ---
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

    // --- CartItem ---
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CartItem" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "productId" TEXT NOT NULL,
          "quantity" INTEGER NOT NULL DEFAULT 1,
          "variants" TEXT NOT NULL DEFAULT '{}',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_userId_productId_variants_key" ON "CartItem"("userId", "productId", "variants")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CartItem_userId_idx" ON "CartItem"("userId")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CartItem_productId_idx" ON "CartItem"("productId")`);

    // --- ProductView ---
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ProductView" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "productId" TEXT NOT NULL,
          "viewCount" INTEGER NOT NULL DEFAULT 1,
          "lastViewed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ProductView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "ProductView_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "ProductView_userId_productId_key" ON "ProductView"("userId", "productId")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProductView_userId_lastViewed_idx" ON "ProductView"("userId", "lastViewed")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProductView_productId_idx" ON "ProductView"("productId")`);

    // --- SearchHistory ---
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SearchHistory" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "query" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SearchHistory_userId_createdAt_idx" ON "SearchHistory"("userId", "createdAt")`);

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

  // =====================
  // 1. CREATE USERS
  // =====================
  const seller1 = await db.user.create({
    data: {
      email: 'seller1@grosirpj.id',
      name: 'CV Garment Prima',
      password: simpleHash('password123'),
      phone: '021-5551234',
      city: 'Jakarta',
      address: 'Jl. Tanah Abang Blok A No. 12, Jakarta Pusat, DKI Jakarta 10150',
      province: 'DKI Jakarta',
      postalCode: '10150',
      gender: '',
      role: 'seller',
      storeName: 'CV Garment Prima',
      storeDescription: 'Supplier fashion grosir terpercaya sejak 2015',
      bankName: 'BCA',
      bankAccount: '1234567890',
      bankHolder: 'CV Garment Prima',
    },
  });

  const seller2 = await db.user.create({
    data: {
      email: 'seller2@grosirpj.id',
      name: 'Elektronik Surabaya',
      password: simpleHash('password123'),
      phone: '031-7779876',
      city: 'Surabaya',
      address: 'Jl. Genteng Kali No. 45, Surabaya, Jawa Timur 60275',
      province: 'Jawa Timur',
      postalCode: '60275',
      gender: '',
      role: 'seller',
      storeName: 'Elektronik Surabaya',
      storeDescription: 'Pusat grosir elektronik terlengkap',
      bankName: 'Mandiri',
      bankAccount: '0987654321',
      bankHolder: 'Elektronik Surabaya',
    },
  });

  const buyer1 = await db.user.create({
    data: {
      email: 'buyer@grosirpj.id',
      name: 'Budi Santoso',
      password: simpleHash('password123'),
      phone: '0812-3456-7890',
      city: 'Bandung',
      address: 'Jl. Dago No. 88, Bandung, Jawa Barat 40135',
      province: 'Jawa Barat',
      postalCode: '40135',
      gender: 'pria',
      dateOfBirth: '1990-05-15',
      role: 'buyer',
    },
  });

  const buyer2 = await db.user.create({
    data: {
      email: 'buyer2@grosirpj.id',
      name: 'Siti Aminah',
      password: simpleHash('password123'),
      phone: '0878-9012-3456',
      city: 'Yogyakarta',
      address: 'Jl. Malioboro No. 25, Yogyakarta, DIY 55271',
      province: 'DI Yogyakarta',
      postalCode: '55271',
      gender: 'wanita',
      dateOfBirth: '1995-08-22',
      role: 'buyer',
    },
  });

  const buyer3 = await db.user.create({
    data: {
      email: 'buyer3@grosirpj.id',
      name: 'Dewi Lestari',
      password: simpleHash('password123'),
      phone: '0856-7890-1234',
      city: 'Semarang',
      address: 'Jl. Pandanaran No. 10, Semarang, Jawa Tengah 50134',
      province: 'Jawa Tengah',
      postalCode: '50134',
      gender: 'wanita',
      dateOfBirth: '1992-11-03',
      role: 'buyer',
    },
  });

  const buyer4 = await db.user.create({
    data: {
      email: 'buyer4@grosirpj.id',
      name: 'Ahmad Rizki',
      password: simpleHash('password123'),
      phone: '0813-5678-9012',
      city: 'Medan',
      address: 'Jl. Gatot Subroto No. 55, Medan, Sumatera Utara 20112',
      province: 'Sumatera Utara',
      postalCode: '20112',
      gender: 'pria',
      dateOfBirth: '1988-03-18',
      role: 'buyer',
    },
  });

  const seller3 = await db.user.create({
    data: {
      email: 'seller3@grosirpj.id',
      name: 'Batik Solo Collection',
      password: simpleHash('password123'),
      phone: '0271-667788',
      city: 'Solo',
      address: 'Jl. Slamet Riyadi No. 200, Solo, Jawa Tengah 57141',
      province: 'Jawa Tengah',
      postalCode: '57141',
      gender: '',
      role: 'seller',
      storeName: 'Batik Solo Collection',
      storeDescription: 'Koleksi batik tulis dan cap asli Solo',
      bankName: 'BRI',
      bankAccount: '1122334455',
      bankHolder: 'Batik Solo Collection',
    },
  });

  // =====================
  // 2. CREATE PRODUCTS (30 total)
  // =====================
  const productsData = [
    // ===== SELLER 1 - CV Garment Prima (17 products) =====
    {
      name: 'Kaos Polos Premium Cotton Combed 30s',
      description: 'Kaos polos premium berbahan cotton combed 30s, nyaman dipakai sehari-hari. Tersedia dalam berbagai ukuran dan warna. Cocok untuk reseller dan sablon.',
      price: 35000,
      originalPrice: 50000,
      category: 'fashion',
      images: JSON.stringify([img(FASHION_IMGS[0]), img(FASHION_IMGS[1])]),
      minOrder: 12,
      stock: 500,
      location: 'Jakarta',
      active: true,
      sold: 1250,
      rating: 4.7,
      weight: 200,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['S', 'M', 'L', 'XL', 'XXL'] },
        { name: 'Warna', order: 1, options: ['Hitam', 'Putih', 'Navy', 'Merah', 'Abu-abu'] },
      ],
    },
    {
      name: 'Kemeja Batik Pria Lengan Panjang',
      description: 'Kemeja batik pria lengan panjang dengan motif klasik Indonesia. Bahan katun premium yang halus dan nyaman.',
      price: 85000,
      originalPrice: 120000,
      category: 'fashion',
      images: JSON.stringify([img(FASHION_IMGS[2]), img(FASHION_IMGS[3])]),
      minOrder: 6,
      stock: 200,
      location: 'Jakarta',
      active: true,
      sold: 540,
      rating: 4.5,
      weight: 300,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['M', 'L', 'XL', 'XXL'] },
        { name: 'Motif', order: 1, options: ['Parang', 'Kawung', 'Mega Mendung', 'Truntum'] },
      ],
    },
    {
      name: 'Celana Jeans Slim Fit Pria',
      description: 'Celana jeans slim fit pria dengan bahan denim stretch yang nyaman. Potongan modern yang mengikuti kontur tubuh.',
      price: 110000,
      originalPrice: 165000,
      category: 'fashion',
      images: JSON.stringify([img(FASHION_IMGS[4])]),
      minOrder: 6,
      stock: 300,
      location: 'Jakarta',
      active: true,
      sold: 780,
      rating: 4.6,
      weight: 500,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['28', '29', '30', '31', '32', '33', '34'] },
        { name: 'Warna', order: 1, options: ['Biru Tua', 'Biru Muda', 'Hitam'] },
      ],
    },
    {
      name: 'Gaun Muslimah Premium',
      description: 'Gaun muslimah premium dengan bahan crepe yang jatuh dan tidak menerawang. Desain elegan dengan detail bros di dada.',
      price: 135000,
      originalPrice: 185000,
      category: 'fashion',
      images: JSON.stringify([img(FASHION_IMGS[5]), img(FASHION_IMGS[6])]),
      minOrder: 3,
      stock: 150,
      location: 'Jakarta',
      active: true,
      sold: 320,
      rating: 4.8,
      weight: 400,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['S', 'M', 'L', 'XL'] },
        { name: 'Warna', order: 1, options: ['Maroon', 'Navy', 'Dusty Pink', 'Hijau Sage'] },
      ],
    },
    {
      name: 'Hoodie Oversize Unisex',
      description: 'Hoodie oversize unisex dengan bahan fleece tebal 280gsm. Hangat dan nyaman untuk cuaca dingin.',
      price: 95000,
      originalPrice: 140000,
      category: 'fashion',
      images: JSON.stringify([img(FASHION_IMGS[7]), img(FASHION_IMGS[8])]),
      minOrder: 6,
      stock: 250,
      location: 'Jakarta',
      active: true,
      sold: 650,
      rating: 4.7,
      weight: 450,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['M', 'L', 'XL', 'XXL'] },
        { name: 'Warna', order: 1, options: ['Hitam', 'Abu Muda', 'Sage', 'Coklat'] },
      ],
    },
    {
      name: 'Rok Plisket Anak Sekolah',
      description: 'Rok plisket untuk anak sekolah dengan bahan premium yang tidak mudah kusut. Lipatan rapi dan tahan lama.',
      price: 42000,
      originalPrice: 55000,
      category: 'fashion',
      images: JSON.stringify([img(FASHION_IMGS[1])]),
      minOrder: 24,
      stock: 600,
      location: 'Jakarta',
      active: true,
      sold: 2100,
      rating: 4.4,
      weight: 200,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['S', 'M', 'L', 'XL'] },
      ],
    },
    {
      name: 'Jaket Parasut Waterproof',
      description: 'Jaket parasut waterproof ringan dan tahan air. Dilengkapi hoodie dan saku resleting.',
      price: 75000,
      originalPrice: 110000,
      category: 'fashion',
      images: JSON.stringify([img(FASHION_IMGS[4]), img(FASHION_IMGS[7])]),
      minOrder: 12,
      stock: 400,
      location: 'Jakarta',
      active: true,
      sold: 890,
      rating: 4.5,
      weight: 350,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['M', 'L', 'XL', 'XXL'] },
        { name: 'Warna', order: 1, options: ['Hitam', 'Navy', 'Merah Maroon'] },
      ],
    },
    {
      name: 'Daster Rumah Wanita Katun Rayon',
      description: 'Daster rumah wanita berbahan katun rayon yang adem dan menyerap keringat. Motif cantik dan trendy.',
      price: 28000,
      originalPrice: 40000,
      category: 'fashion',
      images: JSON.stringify([img(FASHION_IMGS[5])]),
      minOrder: 24,
      stock: 800,
      location: 'Jakarta',
      active: true,
      sold: 3500,
      rating: 4.3,
      weight: 180,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['M', 'L', 'XL', 'XXL'] },
      ],
    },

    // KESEHATAN (2 products from seller1)
    {
      name: 'Masker Medis 3 Ply Box 50pcs',
      description: 'Masker medis 3 ply untuk perlindungan harian. Bahan non-woven yang lembut dan nyaman.',
      price: 25000,
      originalPrice: 35000,
      category: 'kesehatan',
      images: JSON.stringify([img(KESEHATAN_IMGS[0])]),
      minOrder: 10,
      stock: 1000,
      location: 'Jakarta',
      active: true,
      sold: 4200,
      rating: 4.2,
      weight: 150,
      sellerId: seller1.id,
      variants: [
        { name: 'Warna', order: 0, options: ['Biru', 'Hitam', 'Putih'] },
      ],
    },
    {
      name: 'Vitamin C 1000mg - Botol 60 Tablet',
      description: 'Vitamin C 1000mg dengan formula enhanced absorption. Membantu meningkatkan daya tahan tubuh.',
      price: 45000,
      originalPrice: 65000,
      category: 'kesehatan',
      images: JSON.stringify([img(KESEHATAN_IMGS[0])]),
      minOrder: 12,
      stock: 500,
      location: 'Jakarta',
      active: true,
      sold: 1800,
      rating: 4.6,
      weight: 100,
      sellerId: seller1.id,
      variants: [],
    },

    // KECANTIKAN (2 products from seller1)
    {
      name: 'Serum Vitamin C untuk Wajah',
      description: 'Serum vitamin C konsentrasi tinggi untuk mencerahkan wajah. Mengandung niacinamide dan hyaluronic acid.',
      price: 55000,
      originalPrice: 85000,
      category: 'kecantikan',
      images: JSON.stringify([img(KECANTIKAN_IMGS[0])]),
      minOrder: 12,
      stock: 350,
      location: 'Jakarta',
      active: true,
      sold: 2200,
      rating: 4.7,
      weight: 80,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['20ml', '30ml'] },
      ],
    },
    {
      name: 'Paket Skincare Lengkap 5 in 1',
      description: 'Paket skincare lengkap berisi cleanser, toner, serum, moisturizer, dan sunscreen.',
      price: 125000,
      originalPrice: 200000,
      category: 'kecantikan',
      images: JSON.stringify([img(KECANTIKAN_IMGS[0])]),
      minOrder: 6,
      stock: 200,
      location: 'Jakarta',
      active: true,
      sold: 950,
      rating: 4.5,
      weight: 500,
      sellerId: seller1.id,
      variants: [
        { name: 'Tipe Kulit', order: 0, options: ['Berminyak', 'Kering', 'Normal', 'Sensitif'] },
      ],
    },

    // MAKANAN (2 products from seller1)
    {
      name: 'Kopi Arabica Gayo Premium 1kg',
      description: 'Kopi arabica Gayo premium dari dataran tinggi Aceh. Roasting medium dengan rasa fruity dan nutty.',
      price: 85000,
      originalPrice: 110000,
      category: 'makanan',
      images: JSON.stringify([img(MAKANAN_IMGS[0])]),
      minOrder: 5,
      stock: 300,
      location: 'Jakarta',
      active: true,
      sold: 680,
      rating: 4.8,
      weight: 1000,
      sellerId: seller1.id,
      variants: [
        { name: 'Roast Level', order: 0, options: ['Light', 'Medium', 'Dark'] },
        { name: 'Grind', order: 1, options: ['Whole Bean', 'Coarse', 'Medium', 'Fine'] },
      ],
    },
    {
      name: 'Keripik Singkong Pedas Original 250g',
      description: 'Keripik singkong renyah dengan bumbu pedas original. Digoreng dengan minyak berkualitas tanpa pengawet.',
      price: 15000,
      originalPrice: 20000,
      category: 'makanan',
      images: JSON.stringify([img(MAKANAN_IMGS[0])]),
      minOrder: 24,
      stock: 1000,
      location: 'Jakarta',
      active: true,
      sold: 5600,
      rating: 4.3,
      weight: 250,
      sellerId: seller1.id,
      variants: [
        { name: 'Rasa', order: 0, options: ['Pedas Original', 'BBQ', 'Keju', 'Balado'] },
      ],
    },

    // MAINAN (1 product from seller1)
    {
      name: 'Boneka Plush Bear 50cm',
      description: 'Boneka plush bear lembut dan menggemaskan berukuran 50cm. Bahan super soft yang aman untuk anak-anak.',
      price: 35000,
      originalPrice: 50000,
      category: 'mainan',
      images: JSON.stringify([img(MAINAN_IMGS[0])]),
      minOrder: 12,
      stock: 400,
      location: 'Jakarta',
      active: true,
      sold: 1500,
      rating: 4.4,
      weight: 300,
      sellerId: seller1.id,
      variants: [
        { name: 'Warna', order: 0, options: ['Coklat', 'Putih', 'Pink', 'Abu-abu'] },
      ],
    },

    // OLAHRAGA (2 products from seller1)
    {
      name: 'Sepatu Running Olahraga Unisex',
      description: 'Sepatu running olahraga unisex dengan teknologi cushion yang nyaman. Sol karet anti-slip.',
      price: 125000,
      originalPrice: 200000,
      category: 'olahraga',
      images: JSON.stringify([img(OLAHRAGA_IMGS[0])]),
      minOrder: 6,
      stock: 200,
      location: 'Jakarta',
      active: true,
      sold: 420,
      rating: 4.5,
      weight: 600,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['39', '40', '41', '42', '43', '44'] },
        { name: 'Warna', order: 1, options: ['Hitam', 'Putih', 'Merah', 'Navy'] },
      ],
    },
    {
      name: 'Yoga Mat Premium 8mm',
      description: 'Yoga mat premium tebal 8mm untuk kenyamanan maksimal. Permukaan anti-slip pada kedua sisi.',
      price: 65000,
      originalPrice: 95000,
      category: 'olahraga',
      images: JSON.stringify([img(OLAHRAGA_IMGS[0])]),
      minOrder: 10,
      stock: 250,
      location: 'Jakarta',
      active: true,
      sold: 310,
      rating: 4.6,
      weight: 1200,
      sellerId: seller1.id,
      variants: [
        { name: 'Warna', order: 0, options: ['Ungu', 'Biru', 'Hijau', 'Hitam', 'Pink'] },
      ],
    },

    // ===== SELLER 2 - Elektronik Surabaya (13 products) =====
    {
      name: 'TWS Earbuds Bluetooth 5.3',
      description: 'TWS earbuds dengan Bluetooth 5.3 untuk koneksi stabil dan cepat. Bass yang powerful dan suara jernih.',
      price: 75000,
      originalPrice: 120000,
      category: 'elektronik',
      images: JSON.stringify([img(ELEKTRONIK_IMGS[0]), img(ELEKTRONIK_IMGS[1])]),
      minOrder: 10,
      stock: 400,
      location: 'Surabaya',
      active: true,
      sold: 2100,
      rating: 4.4,
      weight: 50,
      sellerId: seller2.id,
      variants: [
        { name: 'Warna', order: 0, options: ['Hitam', 'Putih', 'Navy'] },
      ],
    },
    {
      name: 'Speaker Bluetooth Portable',
      description: 'Speaker bluetooth portable dengan suara bass yang kuat. Tahan air IPX5.',
      price: 95000,
      originalPrice: 150000,
      category: 'elektronik',
      images: JSON.stringify([img(ELEKTRONIK_IMGS[2])]),
      minOrder: 6,
      stock: 250,
      location: 'Surabaya',
      active: true,
      sold: 980,
      rating: 4.5,
      weight: 400,
      sellerId: seller2.id,
      variants: [
        { name: 'Warna', order: 0, options: ['Hitam', 'Merah', 'Biru'] },
      ],
    },
    {
      name: 'Powerbank 20000mAh Fast Charging',
      description: 'Powerbank kapasitas besar 20000mAh dengan fast charging 22.5W. Bisa mengisi 3 perangkat sekaligus.',
      price: 110000,
      originalPrice: 165000,
      category: 'elektronik',
      images: JSON.stringify([img(ELEKTRONIK_IMGS[3])]),
      minOrder: 6,
      stock: 300,
      location: 'Surabaya',
      active: true,
      sold: 1450,
      rating: 4.6,
      weight: 350,
      sellerId: seller2.id,
      variants: [
        { name: 'Warna', order: 0, options: ['Hitam', 'Putih'] },
      ],
    },
    {
      name: 'Smartwatch Sport Waterproof IP68',
      description: 'Smartwatch sport dengan sertifikasi waterproof IP68. Dilengkapi heart rate monitor dan step counter.',
      price: 145000,
      originalPrice: 220000,
      category: 'elektronik',
      images: JSON.stringify([img(ELEKTRONIK_IMGS[4])]),
      minOrder: 6,
      stock: 200,
      location: 'Surabaya',
      active: true,
      sold: 760,
      rating: 4.3,
      weight: 60,
      sellerId: seller2.id,
      variants: [
        { name: 'Warna Strap', order: 0, options: ['Hitam', 'Putih', 'Merah', 'Hijau'] },
      ],
    },
    {
      name: 'Kabel USB-C Fast Charging 1.5m',
      description: 'Kabel USB-C fast charging mendukung arus hingga 3A dan transfer data hingga 480Mbps.',
      price: 18000,
      originalPrice: 28000,
      category: 'elektronik',
      images: JSON.stringify([img(ELEKTRONIK_IMGS[1])]),
      minOrder: 50,
      stock: 2000,
      location: 'Surabaya',
      active: true,
      sold: 8500,
      rating: 4.2,
      weight: 30,
      sellerId: seller2.id,
      variants: [
        { name: 'Tipe', order: 0, options: ['USB-C to USB-C', 'USB-A to USB-C', 'USB-C to Lightning'] },
        { name: 'Panjang', order: 1, options: ['1m', '1.5m', '2m'] },
      ],
    },
    {
      name: 'Charger Wall 33W GaN',
      description: 'Charger wall GaN 33W dengan ukuran compact. Mendukung fast charging PD3.0 dan QC4.0.',
      price: 55000,
      originalPrice: 85000,
      category: 'elektronik',
      images: JSON.stringify([img(ELEKTRONIK_IMGS[5])]),
      minOrder: 12,
      stock: 500,
      location: 'Surabaya',
      active: true,
      sold: 3200,
      rating: 4.7,
      weight: 80,
      sellerId: seller2.id,
      variants: [
        { name: 'Port', order: 0, options: ['1 USB-C', '2 USB-C', '1C+1A', '2C+1A'] },
      ],
    },

    // RUMAH TANGGA (3 products from seller2)
    {
      name: 'Lampu LED Strip 5m RGB Remote',
      description: 'Lampu LED strip sepanjang 5 meter dengan kontrol remote dan 16 juta warna.',
      price: 35000,
      originalPrice: 55000,
      category: 'rumah',
      images: JSON.stringify([img(RUMAH_IMGS[0])]),
      minOrder: 12,
      stock: 600,
      location: 'Surabaya',
      active: true,
      sold: 2800,
      rating: 4.3,
      weight: 200,
      sellerId: seller2.id,
      variants: [
        { name: 'Panjang', order: 0, options: ['1m', '2m', '5m', '10m'] },
      ],
    },
    {
      name: 'Rak Serbaguna 5 Tingkat',
      description: 'Rak serbaguna 5 tingkat yang bisa dibongkar pasang. Bahan besi kokoh dengan coating anti karat.',
      price: 85000,
      originalPrice: 125000,
      category: 'rumah',
      images: JSON.stringify([img(RUMAH_IMGS[1])]),
      minOrder: 5,
      stock: 150,
      location: 'Surabaya',
      active: true,
      sold: 420,
      rating: 4.5,
      weight: 5000,
      sellerId: seller2.id,
      variants: [],
    },
    {
      name: 'Diffuser Aromatherapy 300ml',
      description: 'Diffuser aromatherapy ultrasonik kapasitas 300ml. Dilengkapi LED 7 warna dan timer auto-off.',
      price: 65000,
      originalPrice: 95000,
      category: 'rumah',
      images: JSON.stringify([img(RUMAH_IMGS[2])]),
      minOrder: 10,
      stock: 350,
      location: 'Surabaya',
      active: true,
      sold: 1100,
      rating: 4.6,
      weight: 500,
      sellerId: seller2.id,
      variants: [
        { name: 'Warna', order: 0, options: ['Putih', 'Kayu Natural', 'Hitam'] },
      ],
    },

    // MAINAN (2 products from seller2)
    {
      name: 'Set Balok Building Blocks 500pcs',
      description: 'Set balok building blocks 500pcs untuk kreativitas anak-anak. Bahan plastik ABS aman dan berkualitas.',
      price: 55000,
      originalPrice: 80000,
      category: 'mainan',
      images: JSON.stringify([img(MAINAN_IMGS[0])]),
      minOrder: 12,
      stock: 300,
      location: 'Surabaya',
      active: true,
      sold: 920,
      rating: 4.4,
      weight: 800,
      sellerId: seller2.id,
      variants: [],
    },
    {
      name: 'Remote Control Mobil Drift 1:16',
      description: 'Mobil remote control drift skala 1:16 dengan kecepatan tinggi. Dilengkapi lampu LED.',
      price: 95000,
      originalPrice: 145000,
      category: 'mainan',
      images: JSON.stringify([img(MAINAN_IMGS[0])]),
      minOrder: 6,
      stock: 200,
      location: 'Surabaya',
      active: true,
      sold: 580,
      rating: 4.3,
      weight: 600,
      sellerId: seller2.id,
      variants: [
        { name: 'Warna', order: 0, options: ['Merah', 'Biru', 'Hitam', 'Putih'] },
      ],
    },

    // OLAHRAGA (1 product from seller2)
    {
      name: 'Resistance Band Set 5 Level',
      description: 'Resistance band set 5 level ketebalan untuk latihan dari pemula hingga lanjutan.',
      price: 45000,
      originalPrice: 70000,
      category: 'olahraga',
      images: JSON.stringify([img(OLAHRAGA_IMGS[0])]),
      minOrder: 12,
      stock: 400,
      location: 'Surabaya',
      active: true,
      sold: 1350,
      rating: 4.5,
      weight: 400,
      sellerId: seller2.id,
      variants: [],
    },

    // MAKANAN (1 product from seller2)
    {
      name: 'Sambal Bawang Crispy Jar 250ml',
      description: 'Sambal bawang crispy homemade dalam jar 250ml. Pedasnya nampol tapi nagih!',
      price: 25000,
      originalPrice: 35000,
      category: 'makanan',
      images: JSON.stringify([img(MAKANAN_IMGS[0])]),
      minOrder: 24,
      stock: 500,
      location: 'Surabaya',
      active: true,
      sold: 3800,
      rating: 4.7,
      weight: 300,
      sellerId: seller2.id,
      variants: [
        { name: 'Level Pedas', order: 0, options: ['Original', 'Extra Pedas', 'Super Pedas'] },
      ],
    },
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

  // =====================
  // 3. CREATE ORDERS (7 orders)
  // =====================
  const seller1Products = createdProducts.filter(p => p.sellerId === seller1.id);
  const seller2Products = createdProducts.filter(p => p.sellerId === seller2.id);

  const ordersData = [
    {
      buyerId: buyer1.id, sellerId: seller1.id, status: 'delivered', totalAmount: 420000, shippingCost: 15000,
      shippingAddress: 'Jl. Dago No. 88, Bandung, Jawa Barat 40135', paymentMethod: 'transfer', notes: '',
      items: [{ productId: seller1Products[0].id, productName: seller1Products[0].name, quantity: 12, price: 35000, variants: JSON.stringify({ Ukuran: 'L', Warna: 'Hitam' }) }],
    },
    {
      buyerId: buyer1.id, sellerId: seller2.id, status: 'shipped', totalAmount: 370000, shippingCost: 20000,
      shippingAddress: 'Jl. Dago No. 88, Bandung, Jawa Barat 40135', paymentMethod: 'ewallet', notes: 'Tolong pakai bubble wrap',
      items: [
        { productId: seller2Products[0].id, productName: seller2Products[0].name, quantity: 3, price: 75000, variants: JSON.stringify({ Warna: 'Hitam' }) },
        { productId: seller2Products[3].id, productName: seller2Products[3].name, quantity: 1, price: 145000, variants: JSON.stringify({ 'Warna Strap': 'Hitam' }) },
      ],
    },
    {
      buyerId: buyer2.id, sellerId: seller1.id, status: 'paid', totalAmount: 510000, shippingCost: 18000,
      shippingAddress: 'Jl. Malioboro No. 25, Yogyakarta, DIY 55271', paymentMethod: 'transfer', notes: '',
      items: [{ productId: seller1Products[1].id, productName: seller1Products[1].name, quantity: 6, price: 85000, variants: JSON.stringify({ Ukuran: 'L', Motif: 'Parang' }) }],
    },
    {
      buyerId: buyer2.id, sellerId: seller2.id, status: 'delivered', totalAmount: 245000, shippingCost: 22000,
      shippingAddress: 'Jl. Malioboro No. 25, Yogyakarta, DIY 55271', paymentMethod: 'cod', notes: '',
      items: [
        { productId: seller2Products[1].id, productName: seller2Products[1].name, quantity: 2, price: 95000, variants: JSON.stringify({ Warna: 'Hitam' }) },
        { productId: seller2Products[5].id, productName: seller2Products[5].name, quantity: 1, price: 55000, variants: JSON.stringify({ Port: '1C+1A' }) },
      ],
    },
    {
      buyerId: buyer1.id, sellerId: seller1.id, status: 'pending', totalAmount: 285000, shippingCost: 15000,
      shippingAddress: 'Jl. Dago No. 88, Bandung, Jawa Barat 40135', paymentMethod: 'ewallet', notes: 'Ukuran L warna Hitam ya',
      items: [{ productId: seller1Products[4].id, productName: seller1Products[4].name, quantity: 3, price: 95000, variants: JSON.stringify({ Ukuran: 'L', Warna: 'Hitam' }) }],
    },
    {
      buyerId: buyer2.id, sellerId: seller1.id, status: 'cancelled', totalAmount: 135000, shippingCost: 18000,
      shippingAddress: 'Jl. Malioboro No. 25, Yogyakarta, DIY 55271', paymentMethod: 'transfer', notes: 'Batal karena salah pesan',
      items: [{ productId: seller1Products[9].id, productName: seller1Products[9].name, quantity: 1, price: 135000, variants: JSON.stringify({ Ukuran: 'S', Warna: 'Maroon' }) }],
    },
    {
      buyerId: buyer1.id, sellerId: seller2.id, status: 'shipped', totalAmount: 200000, shippingCost: 20000,
      shippingAddress: 'Jl. Dago No. 88, Bandung, Jawa Barat 40135', paymentMethod: 'transfer', notes: '',
      items: [
        { productId: seller2Products[2].id, productName: seller2Products[2].name, quantity: 1, price: 110000, variants: JSON.stringify({ Warna: 'Hitam' }) },
        { productId: seller2Products[4].id, productName: seller2Products[4].name, quantity: 5, price: 18000, variants: JSON.stringify({ Tipe: 'USB-C to USB-C', Panjang: '1.5m' }) },
      ],
    },
  ];

  for (const orderData of ordersData) {
    const { items, ...orderFields } = orderData;
    await db.order.create({ data: { ...orderFields, items: { create: items } } });
  }

  // =====================
  // 4. CREATE REVIEWS
  // =====================
  const reviewsData = [
    { productId: seller1Products[0].id, userId: buyer1.id, rating: 5, comment: 'Kaos nyaman banget, bahan adem dan tidak panas. Sudah langganan beli disini. Packing juga rapi.' },
    { productId: seller1Products[0].id, userId: buyer2.id, rating: 4, comment: 'Bahan bagus, tapi ukurannya agak besar dari yang saya kira. Overall puas dengan kualitasnya.' },
    { productId: seller1Products[1].id, userId: buyer2.id, rating: 5, comment: 'Batiknya cantik banget! Motifnya detail dan bahan halus. Cocok untuk acara formal.' },
    { productId: seller1Products[2].id, userId: buyer1.id, rating: 4, comment: 'Jeans nyaman dan stretchy. Potongannya pas. Cuma warnanya agak beda sedikit dari foto.' },
    { productId: seller1Products[3].id, userId: buyer2.id, rating: 5, comment: 'Gaunnya elegan banget, bahannya jatuh dan tidak menerawang. Puas banget!' },
    { productId: seller1Products[4].id, userId: buyer1.id, rating: 5, comment: 'Hoodie-nya tebal dan hangat, bahan fleece berkualitas. Warna sage-nya cantik banget.' },
    { productId: seller1Products[8].id, userId: buyer1.id, rating: 4, comment: 'Vitamin C-nya bagus, saya minum rutin dan badan jadi lebih fit.' },
    { productId: seller1Products[10].id, userId: buyer2.id, rating: 5, comment: 'Serum vitamin C-nya luar biasa! Kulit saya jadi lebih cerah setelah 2 minggu pemakaian.' },
    { productId: seller2Products[0].id, userId: buyer1.id, rating: 4, comment: 'TWS-nya bagus untuk harga segini. Bass-nya oke dan koneksi bluetooth stabil.' },
    { productId: seller2Products[1].id, userId: buyer2.id, rating: 5, comment: 'Speaker-nya kenceng banget untuk ukuran portable. Bass-nya nendang!' },
    { productId: seller2Products[2].id, userId: buyer1.id, rating: 5, comment: 'Powerbank kualitas terbaik! Fast charging beneran works.' },
    { productId: seller2Products[6].id, userId: buyer2.id, rating: 4, comment: 'LED strip-nya terang dan warnanya variatif. Remote-nya juga responsif.' },
  ];

  for (const reviewData of reviewsData) {
    await db.review.create({ data: reviewData });
  }

  // =====================
  // 5. CREATE CHATS
  // =====================
  const chatsData = [
    { senderId: buyer1.id, receiverId: seller1.id, message: 'Halo kak, kaos polos ini apakah ready stock semua warna?', read: true },
    { senderId: seller1.id, receiverId: buyer1.id, message: 'Halo! Ready stock kak. Warna hitam, putih, dan navy paling banyak stoknya.', read: true },
    { senderId: buyer1.id, receiverId: seller1.id, message: 'Kalau beli 12 pcs bisa dapat harga berapa ya? Apakah masih bisa nego?', read: true },
    { senderId: seller1.id, receiverId: buyer1.id, message: 'Untuk 12 pcs harga sudah yang tertera kak. 24 pcs bisa diskon!', read: false },
    { senderId: buyer2.id, receiverId: seller2.id, message: 'Mas, TWS earbuds ini garansi berapa lama?', read: true },
    { senderId: seller2.id, receiverId: buyer2.id, message: 'Garansi 6 bulan kak, klaim garansi langsung ke kami.', read: false },
    { senderId: buyer2.id, receiverId: seller2.id, message: 'Oke siap mas. Saya mau order 10 pcs TWS warna hitam.', read: false },
    { senderId: seller1.id, receiverId: buyer2.id, message: 'Kak, gaun muslimah motif hijau sage sudah restock ya. Mau cek di katalog kami?', read: false },
  ];

  for (const chatData of chatsData) {
    await db.chat.create({ data: chatData });
  }

  // =====================
  // 6. CREATE NOTIFICATIONS
  // =====================
  const notificationsData = [
    { userId: buyer1.id, title: 'Pesanan Dikirim', message: 'Pesanan #ORD-001 dari CV Garment Prima sedang dalam pengiriman', type: 'order', read: false, link: '' },
    { userId: buyer1.id, title: 'Flash Sale Dimulai!', message: 'Jangan lewatkan diskon hingga 70% untuk produk pilihan', type: 'promo', read: false, link: '' },
    { userId: buyer1.id, title: 'Pesan Baru', message: 'CV Garment Prima mengirim pesan baru', type: 'chat', read: true, link: '' },
    { userId: buyer2.id, title: 'Pesanan Selesai', message: 'Pesanan dari Elektronik Surabaya telah diterima', type: 'order', read: false, link: '' },
    { userId: buyer2.id, title: 'Selamat Datang!', message: 'Terima kasih telah bergabung di GrosirPJ. Selamat berbelanja!', type: 'info', read: true, link: '' },
    { userId: seller1.id, title: 'Pesanan Baru', message: 'Anda mendapat pesanan baru dari Siti Aminah', type: 'new_order', read: false, link: '' },
    { userId: seller1.id, title: 'Pesanan Baru', message: 'Anda mendapat pesanan baru dari Budi Santoso', type: 'new_order', read: false, link: '' },
    { userId: seller1.id, title: 'Pembayaran Diterima', message: 'Pembayaran dari Siti Aminah telah diterima. Segera proses pesanan!', type: 'order', read: false, link: '' },
    { userId: seller1.id, title: 'Pesanan Baru', message: 'Anda mendapat pesanan baru dari Dewi Lestari', type: 'new_order', read: false, link: '' },
    { userId: seller2.id, title: 'Pesanan Baru', message: 'Anda mendapat pesanan baru dari Siti Aminah', type: 'new_order', read: false, link: '' },
    { userId: seller2.id, title: 'Pembayaran Diterima', message: 'Pembayaran dari Budi Santoso telah diterima', type: 'order', read: false, link: '' },
  ];

  for (const notifData of notificationsData) {
    await db.notification.create({ data: notifData });
  }

  // =====================
  // 7. CREATE USER ADDRESSES
  // =====================
  const addressesData = [
    { userId: buyer1.id, label: 'Rumah', recipient: 'Budi Santoso', phone: '0812-3456-7890', address: 'Jl. Dago No. 88, Bandung, Jawa Barat 40135', city: 'Bandung', province: 'Jawa Barat', postalCode: '40135', isDefault: true },
    { userId: buyer1.id, label: 'Kantor', recipient: 'Budi Santoso', phone: '022-4455667', address: 'Jl. Asia Afrika No. 15, Bandung, Jawa Barat 40261', city: 'Bandung', province: 'Jawa Barat', postalCode: '40261', isDefault: false },
    { userId: buyer2.id, label: 'Rumah', recipient: 'Siti Aminah', phone: '0878-9012-3456', address: 'Jl. Malioboro No. 25, Yogyakarta, DIY 55271', city: 'Yogyakarta', province: 'DI Yogyakarta', postalCode: '55271', isDefault: true },
    { userId: buyer3.id, label: 'Rumah', recipient: 'Dewi Lestari', phone: '0856-7890-1234', address: 'Jl. Pandanaran No. 10, Semarang, Jawa Tengah 50134', city: 'Semarang', province: 'Jawa Tengah', postalCode: '50134', isDefault: true },
    { userId: buyer4.id, label: 'Rumah', recipient: 'Ahmad Rizki', phone: '0813-5678-9012', address: 'Jl. Gatot Subroto No. 55, Medan, Sumatera Utara 20112', city: 'Medan', province: 'Sumatera Utara', postalCode: '20112', isDefault: true },
    { userId: seller1.id, label: 'Gudang', recipient: 'CV Garment Prima', phone: '021-5551234', address: 'Jl. Tanah Abang Blok A No. 12, Jakarta Pusat, DKI Jakarta 10150', city: 'Jakarta', province: 'DKI Jakarta', postalCode: '10150', isDefault: true },
    { userId: seller2.id, label: 'Toko', recipient: 'Elektronik Surabaya', phone: '031-7779876', address: 'Jl. Genteng Kali No. 45, Surabaya, Jawa Timur 60275', city: 'Surabaya', province: 'Jawa Timur', postalCode: '60275', isDefault: true },
  ];

  for (const addrData of addressesData) {
    await db.userAddress.create({ data: addrData });
  }

  // =====================
  // 8. CREATE CART ITEMS
  // =====================
  const cartItemsData = [
    { userId: buyer1.id, productId: seller1Products[1].id, quantity: 6, variants: JSON.stringify({ Ukuran: 'L', Motif: 'Parang' }) },
    { userId: buyer1.id, productId: seller2Products[0].id, quantity: 3, variants: JSON.stringify({ Warna: 'Hitam' }) },
    { userId: buyer2.id, productId: seller1Products[4].id, quantity: 2, variants: JSON.stringify({ Ukuran: 'M', Warna: 'Sage' }) },
    { userId: buyer3.id, productId: seller1Products[0].id, quantity: 24, variants: JSON.stringify({ Ukuran: 'L', Warna: 'Hitam' }) },
    { userId: buyer3.id, productId: seller2Products[2].id, quantity: 1, variants: JSON.stringify({ Warna: 'Hitam' }) },
  ];

  for (const cartData of cartItemsData) {
    await db.cartItem.create({ data: cartData });
  }

  // =====================
  // 9. CREATE PRODUCT VIEWS
  // =====================
  const productViewsData = [
    { userId: buyer1.id, productId: seller1Products[0].id, viewCount: 5, lastViewed: new Date(Date.now() - 1000 * 60 * 30) },
    { userId: buyer1.id, productId: seller1Products[1].id, viewCount: 3, lastViewed: new Date(Date.now() - 1000 * 60 * 60 * 2) },
    { userId: buyer1.id, productId: seller2Products[0].id, viewCount: 2, lastViewed: new Date(Date.now() - 1000 * 60 * 60 * 5) },
    { userId: buyer1.id, productId: seller2Products[2].id, viewCount: 1, lastViewed: new Date(Date.now() - 1000 * 60 * 60 * 24) },
    { userId: buyer2.id, productId: seller1Products[4].id, viewCount: 4, lastViewed: new Date(Date.now() - 1000 * 60 * 15) },
    { userId: buyer2.id, productId: seller1Products[3].id, viewCount: 2, lastViewed: new Date(Date.now() - 1000 * 60 * 60) },
    { userId: buyer2.id, productId: seller2Products[1].id, viewCount: 3, lastViewed: new Date(Date.now() - 1000 * 60 * 60 * 3) },
    { userId: buyer3.id, productId: seller1Products[0].id, viewCount: 7, lastViewed: new Date(Date.now() - 1000 * 60 * 5) },
    { userId: buyer3.id, productId: seller2Products[2].id, viewCount: 2, lastViewed: new Date(Date.now() - 1000 * 60 * 60 * 8) },
    { userId: buyer4.id, productId: seller1Products[2].id, viewCount: 1, lastViewed: new Date(Date.now() - 1000 * 60 * 60 * 48) },
    { userId: buyer4.id, productId: seller2Products[3].id, viewCount: 1, lastViewed: new Date(Date.now() - 1000 * 60 * 60 * 72) },
  ];

  for (const viewData of productViewsData) {
    await db.productView.create({ data: viewData });
  }

  // =====================
  // 10. CREATE SEARCH HISTORY
  // =====================
  const searchHistoryData = [
    { userId: buyer1.id, query: 'kaos polos grosir' },
    { userId: buyer1.id, query: 'batik pria' },
    { userId: buyer1.id, query: 'earbuds bluetooth' },
    { userId: buyer2.id, query: 'hoodie oversize' },
    { userId: buyer2.id, query: 'gaun muslimah' },
    { userId: buyer2.id, query: 'speaker portable' },
    { userId: buyer3.id, query: 'kaos polos' },
    { userId: buyer3.id, query: 'powerbank fast charging' },
    { userId: buyer4.id, query: 'celana jeans' },
    { userId: buyer4.id, query: 'smartwatch sport' },
  ];

  for (const searchData of searchHistoryData) {
    await db.searchHistory.create({ data: searchData });
  }

  console.log('[ensureDb] Demo data seeded successfully');
}
