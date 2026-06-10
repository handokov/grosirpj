import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Use TURSO_DATABASE_URL for Turso connection if available (runtime),
  // fall back to DATABASE_URL (which Prisma CLI also uses for db push etc.)
  const tursoUrl = process.env.TURSO_DATABASE_URL || ''
  const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db'
  const isTurso = tursoUrl.startsWith('libsql://') || tursoUrl.startsWith('https://') || databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('https://')

  if (isTurso) {
    // Turso / libSQL connection
    // PrismaLibSQL in v6 is a FACTORY that takes config, not a client instance
    const url = tursoUrl || databaseUrl
    const authToken = process.env.TURSO_AUTH_TOKEN || ''

    console.log(`[db] Connecting to Turso: ${url.substring(0, 30)}...`)

    const adapter = new PrismaLibSQL({ url, authToken })

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
    })
  } else {
    // Local SQLite connection
    let resolvedUrl = databaseUrl

    // On Vercel, always use /tmp for SQLite (it's the only writable directory)
    // The DATABASE_URL might point to a local dev path that doesn't exist on Vercel
    if (process.env.VERCEL) {
      resolvedUrl = 'file:///tmp/grosirpj.db'
      console.log(`[db] Vercel detected, using ephemeral SQLite: ${resolvedUrl}`)
    }

    console.log(`[db] Connecting to local SQLite: ${resolvedUrl.substring(0, 40)}`)

    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
      datasources: {
        db: {
          url: resolvedUrl,
        },
      },
    })
  }
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ============================================================
// Database Table Initialization (for Vercel /tmp ephemeral DB)
// Only used when NOT using Turso (local SQLite on Vercel)
// ============================================================
let dbTablesEnsured = false;
let dbEnsurePromise: Promise<void> | null = null;

/**
 * Ensures all database tables exist. On Vercel with local SQLite, the /tmp
 * database is ephemeral and starts empty on each cold start, so we need to
 * create tables AND seed demo data before any query.
 *
 * When using Turso, this function is a no-op since Turso persists data.
 */
export async function ensureDb(): Promise<void> {
  // If using Turso, skip ensureDb - data is persisted
  const tursoUrl = process.env.TURSO_DATABASE_URL || ''
  const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db'
  const isTurso = tursoUrl.startsWith('libsql://') || tursoUrl.startsWith('https://') || databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('https://')
  if (isTurso) return

  if (dbTablesEnsured) return;

  // Deduplicate concurrent calls
  if (!dbEnsurePromise) {
    dbEnsurePromise = createTablesAndSeedIfNeeded()
      .then(() => {
        dbTablesEnsured = true;
      })
      .catch((error) => {
        console.error('[ensureDb] Failed (will retry next request):', error?.message || error);
        dbTablesEnsured = false;
        // Don't throw - allow the app to continue (tables might exist from a previous attempt)
      })
      .finally(() => {
        dbEnsurePromise = null;
      });
  }

  await dbEnsurePromise;
}

// Import bcrypt for password hashing in seed data
import { hashPassword } from './auth';

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
          "paymentProof" TEXT NOT NULL DEFAULT '',
          "expedition" TEXT NOT NULL DEFAULT '',
          "trackingNumber" TEXT NOT NULL DEFAULT '',
          "paidAt" DATETIME,
          "shippedAt" DATETIME,
          "deliveredAt" DATETIME,
          "notes" TEXT NOT NULL DEFAULT '',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    // Add new columns if they don't exist (for existing databases)
    try { await db.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "expedition" TEXT NOT NULL DEFAULT ''`); } catch {}
    try { await db.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "trackingNumber" TEXT NOT NULL DEFAULT ''`); } catch {}
    try { await db.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "notes" TEXT NOT NULL DEFAULT ''`); } catch {}
    try { await db.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "shippedAt" DATETIME`); } catch {}
    try { await db.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "deliveredAt" DATETIME`); } catch {}
    try { await db.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "paidAt" DATETIME`); } catch {}
    try { await db.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'cod'`); } catch {}
    try { await db.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "paymentProof" TEXT NOT NULL DEFAULT ''`); } catch {}
    try { await db.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "shippingAddress" TEXT NOT NULL DEFAULT ''`); } catch {}
    try { await db.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN "shippingCost" INTEGER NOT NULL DEFAULT 0`); } catch {}

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
      id: 'seed-seller-1',
      email: 'seller1@grosirpj.id',
      name: 'CV Garment Prima',
      password: await hashPassword('password123'),
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
      id: 'seed-seller-2',
      email: 'seller2@grosirpj.id',
      name: 'Elektronik Surabaya',
      password: await hashPassword('password123'),
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
      id: 'seed-buyer-1',
      email: 'buyer@grosirpj.id',
      name: 'Budi Santoso',
      password: await hashPassword('password123'),
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
      id: 'seed-buyer-2',
      email: 'buyer2@grosirpj.id',
      name: 'Siti Aminah',
      password: await hashPassword('password123'),
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
      id: 'seed-buyer-3',
      email: 'buyer3@grosirpj.id',
      name: 'Dewi Lestari',
      password: await hashPassword('password123'),
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
      id: 'seed-buyer-4',
      email: 'buyer4@grosirpj.id',
      name: 'Ahmad Rizki',
      password: await hashPassword('password123'),
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
      id: 'seed-seller-3',
      email: 'seller3@grosirpj.id',
      name: 'Batik Solo Collection',
      password: await hashPassword('password123'),
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
    // ===== SELLER 1 - CV Garment Prima =====
    {
      id: 'seed-product-01',
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
      id: 'seed-product-02',
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
      id: 'seed-product-03',
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
      id: 'seed-product-04',
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
      id: 'seed-product-05',
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
      id: 'seed-product-06',
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
      id: 'seed-product-07',
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
      id: 'seed-product-08',
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
    {
      id: 'seed-product-09',
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
      id: 'seed-product-10',
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
    {
      id: 'seed-product-11',
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
      id: 'seed-product-12',
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
    {
      id: 'seed-product-13',
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
      id: 'seed-product-14',
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
    {
      id: 'seed-product-15',
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
    {
      id: 'seed-product-16',
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
      id: 'seed-product-17',
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

    // ===== SELLER 2 - Elektronik Surabaya =====
    {
      id: 'seed-product-18',
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
      id: 'seed-product-19',
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
      id: 'seed-product-20',
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
      id: 'seed-product-21',
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
      id: 'seed-product-22',
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
      id: 'seed-product-23',
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
    {
      id: 'seed-product-24',
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
      id: 'seed-product-25',
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
      id: 'seed-product-26',
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
    {
      id: 'seed-product-27',
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
      id: 'seed-product-28',
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
    {
      id: 'seed-product-29',
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
      weight: 300,
      sellerId: seller2.id,
      variants: [],
    },
    {
      id: 'seed-product-30',
      name: 'Sambal Bawang Crispy Jar 250ml',
      description: 'Sambal bawang crispy dalam jar 250ml. Renyah dan pedas, cocok untuk lauk atau oleh-oleh.',
      price: 25000,
      originalPrice: 35000,
      category: 'makanan',
      images: JSON.stringify([img(MAKANAN_IMGS[0])]),
      minOrder: 24,
      stock: 800,
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

  // =====================
  // 3. INSERT PRODUCTS WITH VARIANTS
  // =====================
  for (const [pIdx, p] of productsData.entries()) {
    const { variants, ...productFields } = p;
    const product = await db.product.create({
      data: productFields as any,
    });

    const productNum = String(pIdx + 1).padStart(2, '0');

    if (variants && variants.length > 0) {
      for (const [vIdx, v] of variants.entries()) {
        const variantGroup = await db.variantGroup.create({
          data: {
            id: `seed-vg-${productNum}-${vIdx}`,
            name: v.name,
            order: v.order,
            productId: product.id,
          },
        });

        await db.variantOption.createMany({
          data: v.options.map((option: string, oIdx: number) => ({
            id: `seed-vo-${productNum}-${vIdx}-${oIdx}`,
            value: option,
            variantGroupId: variantGroup.id,
          })),
        });
      }
    }
  }

  // =====================
  // 4. CREATE CHAT DATA
  // =====================
  await db.chat.createMany({
    data: [
      {
        id: 'seed-chat-01',
        senderId: buyer1.id,
        receiverId: seller1.id,
        message: 'Halo, apakah kaos polos tersedia warna navy ukuran XL?',
        read: true,
      },
      {
        id: 'seed-chat-02',
        senderId: seller1.id,
        receiverId: buyer1.id,
        message: 'Halo! Ya tersedia, kak. Stok masih banyak. Minimum order 12 pcs ya.',
        read: true,
      },
      {
        id: 'seed-chat-03',
        senderId: buyer1.id,
        receiverId: seller1.id,
        message: 'Oke, saya mau order 24 pcs. Bisa diskon ga?',
        read: true,
      },
      {
        id: 'seed-chat-04',
        senderId: seller1.id,
        receiverId: buyer1.id,
        message: 'Bisa dong, untuk 24 pcs saya kasih harga Rp 32.000/pcs ya. Mau lanjut?',
        read: false,
      },
      {
        id: 'seed-chat-05',
        senderId: buyer2.id,
        receiverId: seller2.id,
        message: 'Mas, charger GaN 33W yang 1C+1A ada stok?',
        read: true,
      },
      {
        id: 'seed-chat-06',
        senderId: seller2.id,
        receiverId: buyer2.id,
        message: 'Ada kak, stok masih 50 pcs. Langsung order aja ya!',
        read: true,
      },
      {
        id: 'seed-chat-07',
        senderId: buyer2.id,
        receiverId: seller2.id,
        message: 'Sip, saya order 12 pcs ya. Kirim ke Yogyakarta bisa?',
        read: false,
      },
    ],
  });

  // =====================
  // 5. CREATE NOTIFICATIONS
  // =====================
  await db.notification.createMany({
    data: [
      {
        id: 'seed-notif-01',
        userId: seller1.id,
        title: 'Pesanan Baru',
        message: 'Anda menerima pesanan baru dari Budi Santoso',
        type: 'new_order',
        read: false,
      },
      {
        id: 'seed-notif-02',
        userId: seller1.id,
        title: 'Pembayaran Diterima',
        message: 'Pembayaran untuk pesanan #ORD-001 telah diterima',
        type: 'payment',
        read: true,
      },
      {
        id: 'seed-notif-03',
        userId: seller2.id,
        title: 'Chat Baru',
        message: 'Anda menerima pesan baru dari Siti Aminah',
        type: 'chat',
        read: false,
      },
      {
        id: 'seed-notif-04',
        userId: buyer1.id,
        title: 'Pesanan Dikirim',
        message: 'Pesanan #ORD-001 telah dikirim oleh CV Garment Prima',
        type: 'shipping',
        read: false,
      },
      {
        id: 'seed-notif-05',
        userId: buyer1.id,
        title: 'Promo Flash Sale',
        message: 'Flash Sale mulai pukul 12.00! Diskon hingga 90%',
        type: 'promo',
        read: true,
      },
    ],
  });

  // =====================
  // 6. CREATE WISHLIST
  // =====================
  const topProducts = await db.product.findMany({ take: 5, orderBy: { sold: 'desc' } });
  await db.wishlist.createMany({
    data: topProducts.map((p, i) => ({
      id: `seed-wish-${String(i + 1).padStart(2, '0')}`,
      userId: buyer1.id,
      productId: p.id,
    })),
  });

  // =====================
  // 7. CREATE ORDERS
  // =====================
  const product1 = await db.product.findFirst({ where: { name: 'Kaos Polos Premium Cotton Combed 30s' } });
  const product2 = await db.product.findFirst({ where: { name: 'Kabel USB-C Fast Charging 1.5m' } });
  const product3 = await db.product.findFirst({ where: { name: 'Sambal Bawang Crispy Jar 250ml' } });

  if (product1 && product2 && product3) {
    await db.order.createMany({
      data: [
        {
          id: 'seed-order-01',
          buyerId: buyer1.id,
          sellerId: seller1.id,
          status: 'delivered',
          totalAmount: 768000,
          shippingCost: 25000,
          shippingAddress: 'Jl. Dago No. 88, Bandung, Jawa Barat 40135',
          paymentMethod: 'transfer',
          paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          notes: 'Tolong packing yang rapi ya',
        },
        {
          id: 'seed-order-02',
          buyerId: buyer2.id,
          sellerId: seller2.id,
          status: 'shipped',
          totalAmount: 660000,
          shippingCost: 30000,
          shippingAddress: 'Jl. Malioboro No. 25, Yogyakarta, DIY 55271',
          paymentMethod: 'transfer',
          paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          expedition: 'JNE',
          trackingNumber: 'JNE1234567890',
        },
        {
          id: 'seed-order-03',
          buyerId: buyer1.id,
          sellerId: seller2.id,
          status: 'paid',
          totalAmount: 165000,
          shippingCost: 15000,
          shippingAddress: 'Jl. Dago No. 88, Bandung, Jawa Barat 40135',
          paymentMethod: 'transfer',
          paymentProof: 'Bukti transfer dari Budi Santoso',
          paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          notes: 'Mohon dicek varian sebelum dikirim',
        },
        {
          id: 'seed-order-04',
          buyerId: buyer3.id,
          sellerId: seller1.id,
          status: 'pending',
          totalAmount: 420000,
          shippingAddress: 'Jl. Pandanaran No. 10, Semarang, Jawa Tengah 50134',
          paymentMethod: 'cod',
        },
      ],
    });

    // Order Items
    const orders = await db.order.findMany({ orderBy: { createdAt: 'asc' } });
    if (orders.length >= 4) {
      await db.orderItem.createMany({
        data: [
          // Order 1: delivered (buyer1 from seller1)
          { id: 'seed-oi-01', orderId: orders[0].id, productId: product1.id, productName: product1.name, quantity: 24, price: 32000, variants: '{"Ukuran":"XL","Warna":"Navy"}' },
          // Order 2: shipped (buyer2 from seller2)
          { id: 'seed-oi-02', orderId: orders[1].id, productId: product2.id, productName: product2.name, quantity: 12, price: 55000, variants: '{"Tipe":"USB-C to USB-C","Panjang":"1.5m"}' },
          // Order 3: paid (buyer1 from seller2)
          { id: 'seed-oi-03', orderId: orders[2].id, productId: product2.id, productName: product2.name, quantity: 3, price: 55000, variants: '{"Tipe":"USB-A to USB-C","Panjang":"1m"}' },
          // Order 4: pending (buyer3 from seller1)
          { id: 'seed-oi-04', orderId: orders[3].id, productId: product1.id, productName: product1.name, quantity: 12, price: 35000, variants: '{"Ukuran":"L","Warna":"Hitam"}' },
        ],
      });
    }
  }

  console.log('[ensureDb] Demo data seeded successfully');
}
