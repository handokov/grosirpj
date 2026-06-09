import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://grosirpj-handokov.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODEwMDA1NjUsImlkIjoiMDE5ZWFiZTYtNGYwMS03YmRiLThiN2QtMzhhY2I2OGYzZWNiIiwicmlkIjoiMjc3N2ZkZGYtMzEzYy00NzA2LTk2M2MtN2UzODcwYTZkMWQ5In0.sGMpmDFztDN2J7ccGEjwm89aU-U-rkZHPC1FfaYaYCoKWP4jXmWv0d5FseEX74mekeEPJ6Rb6A1WLlfYwErtBQ',
});

async function setup() {
  console.log('Creating tables on Turso...');

  // User
  await client.execute(`
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
  await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")');
  console.log('✓ User table');

  // UserAddress
  await client.execute(`
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
  await client.execute('CREATE INDEX IF NOT EXISTS "UserAddress_userId_idx" ON "UserAddress"("userId")');
  console.log('✓ UserAddress table');

  // Product
  await client.execute(`
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
  await client.execute('CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "Product"("category")');
  await client.execute('CREATE INDEX IF NOT EXISTS "Product_sellerId_idx" ON "Product"("sellerId")');
  await client.execute('CREATE INDEX IF NOT EXISTS "Product_active_idx" ON "Product"("active")');
  console.log('✓ Product table');

  // VariantGroup
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "VariantGroup" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        "productId" TEXT NOT NULL,
        CONSTRAINT "VariantGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await client.execute('CREATE INDEX IF NOT EXISTS "VariantGroup_productId_idx" ON "VariantGroup"("productId")');
  console.log('✓ VariantGroup table');

  // VariantOption
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "VariantOption" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "value" TEXT NOT NULL,
        "variantGroupId" TEXT NOT NULL,
        CONSTRAINT "VariantOption_variantGroupId_fkey" FOREIGN KEY ("variantGroupId") REFERENCES "VariantGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await client.execute('CREATE INDEX IF NOT EXISTS "VariantOption_variantGroupId_idx" ON "VariantOption"("variantGroupId")');
  console.log('✓ VariantOption table');

  // Order
  await client.execute(`
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
        "paidAt" DATETIME,
        "notes" TEXT NOT NULL DEFAULT '',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);
  await client.execute('CREATE INDEX IF NOT EXISTS "Order_buyerId_idx" ON "Order"("buyerId")');
  await client.execute('CREATE INDEX IF NOT EXISTS "Order_sellerId_idx" ON "Order"("sellerId")');
  await client.execute('CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status")');
  console.log('✓ Order table');

  // OrderItem
  await client.execute(`
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
  await client.execute('CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId")');
  console.log('✓ OrderItem table');

  // Review
  await client.execute(`
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
  await client.execute('CREATE INDEX IF NOT EXISTS "Review_productId_idx" ON "Review"("productId")');
  await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS "Review_productId_userId_key" ON "Review"("productId", "userId")');
  console.log('✓ Review table');

  // Chat
  await client.execute(`
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
  await client.execute('CREATE INDEX IF NOT EXISTS "Chat_senderId_receiverId_idx" ON "Chat"("senderId", "receiverId")');
  await client.execute('CREATE INDEX IF NOT EXISTS "Chat_receiverId_read_idx" ON "Chat"("receiverId", "read")');
  console.log('✓ Chat table');

  // Wishlist
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "Wishlist" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Wishlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await client.execute('CREATE INDEX IF NOT EXISTS "Wishlist_userId_idx" ON "Wishlist"("userId")');
  await client.execute('CREATE INDEX IF NOT EXISTS "Wishlist_productId_idx" ON "Wishlist"("productId")');
  await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS "Wishlist_userId_productId_key" ON "Wishlist"("userId", "productId")');
  console.log('✓ Wishlist table');

  // Notification
  await client.execute(`
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
  await client.execute('CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read")');
  await client.execute('CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt")');
  console.log('✓ Notification table');

  // CartItem
  await client.execute(`
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
  await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_userId_productId_variants_key" ON "CartItem"("userId", "productId", "variants")');
  await client.execute('CREATE INDEX IF NOT EXISTS "CartItem_userId_idx" ON "CartItem"("userId")');
  await client.execute('CREATE INDEX IF NOT EXISTS "CartItem_productId_idx" ON "CartItem"("productId")');
  console.log('✓ CartItem table');

  // ProductView
  await client.execute(`
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
  await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS "ProductView_userId_productId_key" ON "ProductView"("userId", "productId")');
  await client.execute('CREATE INDEX IF NOT EXISTS "ProductView_userId_lastViewed_idx" ON "ProductView"("userId", "lastViewed")');
  await client.execute('CREATE INDEX IF NOT EXISTS "ProductView_productId_idx" ON "ProductView"("productId")');
  console.log('✓ ProductView table');

  // SearchHistory
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "SearchHistory" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "query" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await client.execute('CREATE INDEX IF NOT EXISTS "SearchHistory_userId_createdAt_idx" ON "SearchHistory"("userId", "createdAt")');
  console.log('✓ SearchHistory table');

  console.log('\n✅ All tables created successfully on Turso!');
}

setup().catch(console.error);
