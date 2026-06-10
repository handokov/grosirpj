import { db, ensureDb, isTursoUrl } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/db/migrate - Check database schema status
export async function GET(request: Request) {
  try {
    await ensureDb();

    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json(
        { error: 'Anda harus login untuk mengakses fitur ini' },
        { status: 401 }
      );
    }

    // Check if we're using Turso
    const tursoUrl = process.env.TURSO_DATABASE_URL || '';
    const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
    const usingTurso = isTursoUrl(tursoUrl) || isTursoUrl(databaseUrl);

    // Check each table's columns
    const results: Record<string, string[]> = {};

    try {
      const userColumns = await db.$queryRawUnsafe(`PRAGMA table_info("User")`) as { name: string }[];
      results.User = userColumns.map(c => c.name);
    } catch {
      results.User = ['ERROR: Could not read table info'];
    }

    try {
      const orderColumns = await db.$queryRawUnsafe(`PRAGMA table_info("Order")`) as { name: string }[];
      results.Order = orderColumns.map(c => c.name);
    } catch {
      results.Order = ['ERROR: Could not read table info'];
    }

    try {
      const productColumns = await db.$queryRawUnsafe(`PRAGMA table_info("Product")`) as { name: string }[];
      results.Product = productColumns.map(c => c.name);
    } catch {
      results.Product = ['ERROR: Could not read table info'];
    }

    // Check for missing columns
    const requiredUserCols = ['sellerBalance', 'totalSales', 'bankName', 'bankAccount', 'bankHolder', 'storeAvatar', 'gender', 'dateOfBirth', 'province', 'postalCode', 'avatar'];
    const requiredOrderCols = ['marketplaceFee', 'sellerPayout', 'paymentProof', 'expedition', 'trackingNumber', 'paidAt', 'shippedAt', 'deliveredAt', 'shippingCost', 'shippingAddress', 'paymentMethod', 'notes'];
    const requiredProductCols = ['originalPrice', 'minOrder', 'weight', 'active', 'sold', 'rating'];

    const userMissing = requiredUserCols.filter(c => !results.User.includes(c));
    const orderMissing = requiredOrderCols.filter(c => !results.Order.includes(c));
    const productMissing = requiredProductCols.filter(c => !results.Product.includes(c));

    return Response.json({
      usingTurso,
      tables: results,
      missing: {
        User: userMissing,
        Order: orderMissing,
        Product: productMissing,
      },
      needsMigration: userMissing.length > 0 || orderMissing.length > 0 || productMissing.length > 0,
    });
  } catch (error) {
    console.error('Schema check error:', error);
    return Response.json(
      { error: 'Gagal mengecek schema database', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST /api/db/migrate - Run database migrations to add missing columns
export async function POST(request: Request) {
  try {
    await ensureDb();

    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json(
        { error: 'Anda harus login untuk mengakses fitur ini' },
        { status: 401 }
      );
    }

    const migrations: string[] = [];
    const errors: string[] = [];

    // User table migrations
    const userMigrations = [
      `ALTER TABLE "User" ADD COLUMN "sellerBalance" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "User" ADD COLUMN "totalSales" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "User" ADD COLUMN "bankName" TEXT`,
      `ALTER TABLE "User" ADD COLUMN "bankAccount" TEXT`,
      `ALTER TABLE "User" ADD COLUMN "bankHolder" TEXT`,
      `ALTER TABLE "User" ADD COLUMN "storeAvatar" TEXT`,
      `ALTER TABLE "User" ADD COLUMN "gender" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "User" ADD COLUMN "dateOfBirth" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "User" ADD COLUMN "province" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "User" ADD COLUMN "postalCode" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "User" ADD COLUMN "avatar" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "User" ADD COLUMN "phone" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "User" ADD COLUMN "address" TEXT NOT NULL DEFAULT ''`,
    ];

    // Order table migrations
    const orderMigrations = [
      `ALTER TABLE "Order" ADD COLUMN "marketplaceFee" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "Order" ADD COLUMN "sellerPayout" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "Order" ADD COLUMN "paymentProof" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "Order" ADD COLUMN "expedition" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "Order" ADD COLUMN "trackingNumber" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "Order" ADD COLUMN "paidAt" DATETIME`,
      `ALTER TABLE "Order" ADD COLUMN "shippedAt" DATETIME`,
      `ALTER TABLE "Order" ADD COLUMN "deliveredAt" DATETIME`,
      `ALTER TABLE "Order" ADD COLUMN "shippingCost" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "Order" ADD COLUMN "shippingAddress" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'cod'`,
      `ALTER TABLE "Order" ADD COLUMN "notes" TEXT NOT NULL DEFAULT ''`,
    ];

    // Product table migrations
    const productMigrations = [
      `ALTER TABLE "Product" ADD COLUMN "originalPrice" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "Product" ADD COLUMN "minOrder" INTEGER NOT NULL DEFAULT 1`,
      `ALTER TABLE "Product" ADD COLUMN "weight" INTEGER NOT NULL DEFAULT 500`,
      `ALTER TABLE "Product" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true`,
      `ALTER TABLE "Product" ADD COLUMN "sold" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "Product" ADD COLUMN "rating" REAL NOT NULL DEFAULT 0`,
      `ALTER TABLE "Product" ADD COLUMN "description" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "Product" ADD COLUMN "images" TEXT NOT NULL DEFAULT '[]'`,
      `ALTER TABLE "Product" ADD COLUMN "location" TEXT NOT NULL DEFAULT 'Jakarta'`,
    ];

    // Also ensure missing tables exist
    const tableCreations = [
      `CREATE TABLE IF NOT EXISTS "Wishlist" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS "CartItem" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "variants" TEXT NOT NULL DEFAULT '{}',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS "Notification" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'info',
        "read" BOOLEAN NOT NULL DEFAULT false,
        "link" TEXT NOT NULL DEFAULT '',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS "UserAddress" (
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
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS "ProductView" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "viewCount" INTEGER NOT NULL DEFAULT 1,
        "lastViewed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS "SearchHistory" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "query" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      )`,
    ];

    // Run table creations
    for (const sql of tableCreations) {
      try {
        await db.$executeRawUnsafe(sql);
        migrations.push(`Created table: ${sql.match(/"(\w+)"/)?.[1] || 'unknown'}`);
      } catch (err) {
        // Table already exists - that's fine
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('already exists')) {
          errors.push(`Table creation error: ${msg}`);
        }
      }
    }

    // Run all ALTER TABLE migrations (ignore "duplicate column" errors)
    const allMigrations = [
      ...userMigrations.map(sql => ({ sql, table: 'User' })),
      ...orderMigrations.map(sql => ({ sql, table: 'Order' })),
      ...productMigrations.map(sql => ({ sql, table: 'Product' })),
    ];

    for (const { sql, table } of allMigrations) {
      try {
        await db.$executeRawUnsafe(sql);
        const colName = sql.match(/ADD COLUMN\s+"?(\w+)"?/)?.[1] || 'unknown';
        migrations.push(`Added ${table}.${colName}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // "duplicate column name" means column already exists - that's fine
        if (!msg.includes('duplicate column') && !msg.includes('already exists')) {
          errors.push(`${table}: ${msg}`);
        }
      }
    }

    // Create missing indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS "Order_buyerId_idx" ON "Order"("buyerId")`,
      `CREATE INDEX IF NOT EXISTS "Order_sellerId_idx" ON "Order"("sellerId")`,
      `CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status")`,
      `CREATE INDEX IF NOT EXISTS "Product_sellerId_idx" ON "Product"("sellerId")`,
      `CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "Product"("category")`,
      `CREATE INDEX IF NOT EXISTS "Product_active_idx" ON "Product"("active")`,
      `CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read")`,
      `CREATE INDEX IF NOT EXISTS "Wishlist_userId_idx" ON "Wishlist"("userId")`,
      `CREATE INDEX IF NOT EXISTS "CartItem_userId_idx" ON "CartItem"("userId")`,
    ];

    for (const sql of indexes) {
      try {
        await db.$executeRawUnsafe(sql);
      } catch {
        // Ignore index errors
      }
    }

    return Response.json({
      success: true,
      message: `Migrasi selesai. ${migrations.length} perubahan diterapkan.`,
      migrations,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return Response.json(
      { error: 'Gagal menjalankan migrasi', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
