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
 * tables before any query.
 */
export async function ensureDb(): Promise<void> {
  if (dbTablesEnsured) return;

  // Deduplicate concurrent calls
  if (!dbEnsurePromise) {
    dbEnsurePromise = createTablesIfNeeded().finally(() => {
      dbEnsurePromise = null;
    });
  }

  await dbEnsurePromise;
}

async function createTablesIfNeeded(): Promise<void> {
  // Quick check: if tables already exist, skip
  try {
    await db.user.count();
    dbTablesEnsured = true;
    return;
  } catch {
    // Tables don't exist yet, continue to create them
  }

  console.log('[ensureDb] Creating database tables on Vercel /tmp...');

  try {
    // Create all tables with proper foreign keys and indexes
    // This matches the Prisma schema exactly
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

    // Verify tables were created successfully
    const userCount = await db.user.count();
    console.log(`[ensureDb] All database tables created successfully. User count: ${userCount}`);

    dbTablesEnsured = true;
  } catch (error) {
    console.error('[ensureDb] Failed to create tables:', error);
    throw error;
  }
}
