#!/usr/bin/env node
/**
 * Push Prisma schema to Turso database using libsql client.
 * Usage: node scripts/turso-push-schema.mjs
 */
import { createClient } from '@libsql/client';

const databaseUrl = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!databaseUrl || !databaseUrl.startsWith('libsql://')) {
  console.error('ERROR: DATABASE_URL must be a libsql:// URL');
  process.exit(1);
}
if (!authToken) {
  console.error('ERROR: TURSO_AUTH_TOKEN is required');
  process.exit(1);
}

const client = createClient({ url: databaseUrl, authToken });

const statements = [
  // -- CreateTable: User
  `CREATE TABLE IF NOT EXISTS "User" (
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
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,

  // -- CreateTable: UserAddress
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
      CONSTRAINT "UserAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS "UserAddress_userId_idx" ON "UserAddress"("userId")`,

  // -- CreateTable: Product
  `CREATE TABLE IF NOT EXISTS "Product" (
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
  )`,

  `CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "Product"("category")`,
  `CREATE INDEX IF NOT EXISTS "Product_sellerId_idx" ON "Product"("sellerId")`,
  `CREATE INDEX IF NOT EXISTS "Product_active_idx" ON "Product"("active")`,

  // -- CreateTable: VariantGroup
  `CREATE TABLE IF NOT EXISTS "VariantGroup" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      "productId" TEXT NOT NULL,
      CONSTRAINT "VariantGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS "VariantGroup_productId_idx" ON "VariantGroup"("productId")`,

  // -- CreateTable: VariantOption
  `CREATE TABLE IF NOT EXISTS "VariantOption" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "value" TEXT NOT NULL,
      "variantGroupId" TEXT NOT NULL,
      CONSTRAINT "VariantOption_variantGroupId_fkey" FOREIGN KEY ("variantGroupId") REFERENCES "VariantGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS "VariantOption_variantGroupId_idx" ON "VariantOption"("variantGroupId")`,

  // -- CreateTable: Order
  `CREATE TABLE IF NOT EXISTS "Order" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "buyerId" TEXT NOT NULL,
      "sellerId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "totalAmount" INTEGER NOT NULL,
      "shippingCost" INTEGER NOT NULL DEFAULT 0,
      "shippingAddress" TEXT NOT NULL DEFAULT '',
      "paymentMethod" TEXT NOT NULL DEFAULT 'cod',
      "paymentProof" TEXT NOT NULL DEFAULT '',
      "paidAt" DATETIME,
      "notes" TEXT NOT NULL DEFAULT '',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS "Order_buyerId_idx" ON "Order"("buyerId")`,
  `CREATE INDEX IF NOT EXISTS "Order_sellerId_idx" ON "Order"("sellerId")`,
  `CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status")`,

  // -- CreateTable: OrderItem
  `CREATE TABLE IF NOT EXISTS "OrderItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orderId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "productName" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "price" INTEGER NOT NULL,
      "variants" TEXT NOT NULL DEFAULT '{}',
      CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId")`,

  // -- CreateTable: Review
  `CREATE TABLE IF NOT EXISTS "Review" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "productId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "rating" INTEGER NOT NULL,
      "comment" TEXT NOT NULL DEFAULT '',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS "Review_productId_idx" ON "Review"("productId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Review_productId_userId_key" ON "Review"("productId", "userId")`,

  // -- CreateTable: Chat
  `CREATE TABLE IF NOT EXISTS "Chat" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "senderId" TEXT NOT NULL,
      "receiverId" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "read" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Chat_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "Chat_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS "Chat_senderId_receiverId_idx" ON "Chat"("senderId", "receiverId")`,
  `CREATE INDEX IF NOT EXISTS "Chat_receiverId_read_idx" ON "Chat"("receiverId", "read")`,

  // -- CreateTable: Wishlist
  `CREATE TABLE IF NOT EXISTS "Wishlist" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Wishlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS "Wishlist_userId_idx" ON "Wishlist"("userId")`,
  `CREATE INDEX IF NOT EXISTS "Wishlist_productId_idx" ON "Wishlist"("productId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Wishlist_userId_productId_key" ON "Wishlist"("userId", "productId")`,

  // -- CreateTable: Notification
  `CREATE TABLE IF NOT EXISTS "Notification" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'info',
      "read" BOOLEAN NOT NULL DEFAULT false,
      "link" TEXT NOT NULL DEFAULT '',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read")`,
  `CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt")`,

  // -- CreateTable: CartItem
  `CREATE TABLE IF NOT EXISTS "CartItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "variants" TEXT NOT NULL DEFAULT '{}',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS "CartItem_userId_idx" ON "CartItem"("userId")`,
  `CREATE INDEX IF NOT EXISTS "CartItem_productId_idx" ON "CartItem"("productId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_userId_productId_variants_key" ON "CartItem"("userId", "productId", "variants")`,

  // -- CreateTable: ProductView
  `CREATE TABLE IF NOT EXISTS "ProductView" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "viewCount" INTEGER NOT NULL DEFAULT 1,
      "lastViewed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProductView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ProductView_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS "ProductView_userId_lastViewed_idx" ON "ProductView"("userId", "lastViewed")`,
  `CREATE INDEX IF NOT EXISTS "ProductView_productId_idx" ON "ProductView"("productId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ProductView_userId_productId_key" ON "ProductView"("userId", "productId")`,

  // -- CreateTable: SearchHistory
  `CREATE TABLE IF NOT EXISTS "SearchHistory" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "query" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS "SearchHistory_userId_createdAt_idx" ON "SearchHistory"("userId", "createdAt")`,
];

async function main() {
  console.log(`Connecting to Turso: ${databaseUrl}`);
  
  // Check existing tables first
  try {
    const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    const existingTables = result.rows.map(r => r.name);
    console.log(`Existing tables: ${existingTables.join(', ')}`);
    
    if (existingTables.includes('User')) {
      console.log('Tables already exist! Skipping schema creation.');
      return;
    }
  } catch (e) {
    console.log('No tables found, creating schema...');
  }

  console.log(`Executing ${statements.length} SQL statements...`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await client.execute(stmt);
      if (stmt.includes('CREATE TABLE')) {
        const match = stmt.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/);
        console.log(`  [${i + 1}/${statements.length}] Created table: ${match?.[1] || 'unknown'}`);
      }
    } catch (error) {
      console.error(`  [${i + 1}/${statements.length}] ERROR: ${error.message}`);
      console.error(`  Statement: ${stmt.substring(0, 100)}...`);
    }
  }

  // Verify
  const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log(`\nAll tables after migration: ${result.rows.map(r => r.name).join(', ')}`);
  
  console.log('\n✅ Schema push to Turso completed!');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
