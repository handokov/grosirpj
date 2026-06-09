/**
 * Script to push schema and seed data to Turso database.
 * Uses @libsql/client directly since Prisma CLI doesn't support libsql:// URLs.
 * 
 * Usage: bun run scripts/turso-setup.ts
 */

import { createClient } from '@libsql/client'

const TURSO_URL = process.env.TURSO_DATABASE_URL || 'libsql://grosirpj-handokov.aws-ap-northeast-1.turso.io'
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || ''

if (!TURSO_TOKEN) {
  console.error('❌ TURSO_AUTH_TOKEN is required')
  process.exit(1)
}

const client = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
})

async function main() {
  console.log('🚀 Connecting to Turso:', TURSO_URL.substring(0, 35) + '...')

  // Check existing tables
  try {
    const result = await client.execute('SELECT count(*) as cnt FROM User')
    if (result.rows[0]?.cnt && Number(result.rows[0].cnt) > 0) {
      console.log(`✅ Database already has ${result.rows[0].cnt} users. Skipping schema creation.`)
      console.log('💡 If you want to reset, drop tables first then re-run this script.')
      return
    }
  } catch {
    // Tables don't exist yet, continue
  }

  console.log('📦 Creating database schema...')

  // Create tables in order (respecting foreign keys)
  const schema = [
    // User
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

    // UserAddress
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

    // Product
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

    // VariantGroup
    `CREATE TABLE IF NOT EXISTS "VariantGroup" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      "productId" TEXT NOT NULL,
      CONSTRAINT "VariantGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS "VariantGroup_productId_idx" ON "VariantGroup"("productId")`,

    // VariantOption
    `CREATE TABLE IF NOT EXISTS "VariantOption" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "value" TEXT NOT NULL,
      "variantGroupId" TEXT NOT NULL,
      CONSTRAINT "VariantOption_variantGroupId_fkey" FOREIGN KEY ("variantGroupId") REFERENCES "VariantGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS "VariantOption_variantGroupId_idx" ON "VariantOption"("variantGroupId")`,

    // Order
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

    // OrderItem
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

    // Review
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

    // Chat
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

    // Wishlist
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

    // Notification
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

    // CartItem
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
    `CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_userId_productId_variants_key" ON "CartItem"("userId", "productId", "variants")`,
    `CREATE INDEX IF NOT EXISTS "CartItem_userId_idx" ON "CartItem"("userId")`,
    `CREATE INDEX IF NOT EXISTS "CartItem_productId_idx" ON "CartItem"("productId")`,

    // ProductView
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
    `CREATE UNIQUE INDEX IF NOT EXISTS "ProductView_userId_productId_key" ON "ProductView"("userId", "productId")`,
    `CREATE INDEX IF NOT EXISTS "ProductView_userId_lastViewed_idx" ON "ProductView"("userId", "lastViewed")`,
    `CREATE INDEX IF NOT EXISTS "ProductView_productId_idx" ON "ProductView"("productId")`,

    // SearchHistory
    `CREATE TABLE IF NOT EXISTS "SearchHistory" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "query" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS "SearchHistory_userId_createdAt_idx" ON "SearchHistory"("userId", "createdAt")`,
  ]

  // Execute schema creation
  for (const sql of schema) {
    try {
      await client.execute(sql)
    } catch (err: any) {
      console.error('❌ Schema error:', err.message)
      console.error('   SQL:', sql.substring(0, 80) + '...')
    }
  }

  console.log('✅ Schema created successfully!')

  // Seed demo data
  console.log('🌱 Seeding demo data...')

  function simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash |= 0
    }
    return Math.abs(hash).toString(36)
  }

  function cuid(): string {
    const ts = Date.now().toString(36)
    const rand = Math.random().toString(36).substring(2, 8)
    return `${ts}${rand}`
  }

  const img = (url: string) => `${url}?w=400&h=400&fit=crop`

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
  ]

  const ELEKTRONIK_IMGS = [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1',
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3',
    'https://images.unsplash.com/photo-1590658268037-6bf12f032f55',
    'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5',
  ]

  const RUMAH_IMGS = [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af',
    'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2',
  ]

  const KECANTIKAN_IMGS = ['https://images.unsplash.com/photo-1596462502278-27bfdc403348']
  const KESEHATAN_IMGS = ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae']
  const OLAHRAGA_IMGS = ['https://images.unsplash.com/photo-1542291026-7eec264c27ff']
  const MAINAN_IMGS = ['https://images.unsplash.com/photo-1558060370-d644479cb6f7']
  const MAKANAN_IMGS = ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e']

  // Insert users
  const users = [
    { id: cuid(), email: 'seller1@grosirpj.id', name: 'CV Garment Prima', password: simpleHash('password123'), phone: '021-5551234', city: 'Jakarta', address: 'Jl. Tanah Abang Blok A No. 12, Jakarta Pusat, DKI Jakarta 10150', province: 'DKI Jakarta', postalCode: '10150', role: 'seller', storeName: 'CV Garment Prima', storeDescription: 'Supplier fashion grosir terpercaya sejak 2015', bankName: 'BCA', bankAccount: '1234567890', bankHolder: 'CV Garment Prima' },
    { id: cuid(), email: 'seller2@grosirpj.id', name: 'Elektronik Surabaya', password: simpleHash('password123'), phone: '031-7779876', city: 'Surabaya', address: 'Jl. Genteng Kali No. 45, Surabaya, Jawa Timur 60275', province: 'Jawa Timur', postalCode: '60275', role: 'seller', storeName: 'Elektronik Surabaya', storeDescription: 'Pusat grosir elektronik terlengkap', bankName: 'Mandiri', bankAccount: '0987654321', bankHolder: 'Elektronik Surabaya' },
    { id: cuid(), email: 'buyer@grosirpj.id', name: 'Budi Santoso', password: simpleHash('password123'), phone: '0812-3456-7890', city: 'Bandung', address: 'Jl. Dago No. 88, Bandung, Jawa Barat 40135', province: 'Jawa Barat', postalCode: '40135', gender: 'pria', dateOfBirth: '1990-05-15', role: 'buyer' },
    { id: cuid(), email: 'buyer2@grosirpj.id', name: 'Siti Aminah', password: simpleHash('password123'), phone: '0878-9012-3456', city: 'Yogyakarta', address: 'Jl. Malioboro No. 25, Yogyakarta, DIY 55271', province: 'DI Yogyakarta', postalCode: '55271', gender: 'wanita', dateOfBirth: '1995-08-22', role: 'buyer' },
    { id: cuid(), email: 'buyer3@grosirpj.id', name: 'Dewi Lestari', password: simpleHash('password123'), phone: '0856-7890-1234', city: 'Semarang', address: 'Jl. Pandanaran No. 10, Semarang, Jawa Tengah 50134', province: 'Jawa Tengah', postalCode: '50134', gender: 'wanita', dateOfBirth: '1992-11-03', role: 'buyer' },
    { id: cuid(), email: 'buyer4@grosirpj.id', name: 'Ahmad Rizki', password: simpleHash('password123'), phone: '0813-5678-9012', city: 'Medan', address: 'Jl. Gatot Subroto No. 55, Medan, Sumatera Utara 20112', province: 'Sumatera Utara', postalCode: '20112', gender: 'pria', dateOfBirth: '1988-03-18', role: 'buyer' },
    { id: cuid(), email: 'seller3@grosirpj.id', name: 'Batik Solo Collection', password: simpleHash('password123'), phone: '0271-667788', city: 'Solo', address: 'Jl. Slamet Riyadi No. 200, Solo, Jawa Tengah 57141', province: 'Jawa Tengah', postalCode: '57141', role: 'seller', storeName: 'Batik Solo Collection', storeDescription: 'Koleksi batik tulis dan cap asli Solo', bankName: 'BRI', bankAccount: '1122334455', bankHolder: 'Batik Solo Collection' },
  ]

  for (const u of users) {
    await client.execute({
      sql: `INSERT INTO "User" (id, email, name, password, phone, city, address, province, postalCode, gender, dateOfBirth, role, storeName, storeDescription, bankName, bankAccount, bankHolder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [u.id, u.email, u.name, u.password, u.phone || '', u.city || 'Jakarta', u.address || '', u.province || '', u.postalCode || '', u.gender || '', u.dateOfBirth || '', u.role, u.storeName || null, u.storeDescription || null, u.bankName || null, u.bankAccount || null, u.bankHolder || null],
    })
  }
  console.log(`  ✅ Created ${users.length} users`)

  const [seller1, seller2, , , , , seller3] = users
  const buyers = users.filter(u => u.role === 'buyer')

  // Insert products
  const products = [
    { id: cuid(), name: 'Kaos Polos Premium Cotton Combed 30s', description: 'Kaos polos premium berbahan cotton combed 30s, nyaman dipakai sehari-hari.', price: 35000, originalPrice: 50000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[0]), img(FASHION_IMGS[1])]), minOrder: 12, stock: 500, location: 'Jakarta', sold: 1250, rating: 4.7, weight: 200, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['S', 'M', 'L', 'XL', 'XXL'] }, { name: 'Warna', order: 1, options: ['Hitam', 'Putih', 'Navy', 'Merah', 'Abu-abu'] }] },
    { id: cuid(), name: 'Kemeja Batik Pria Lengan Panjang', description: 'Kemeja batik pria lengan panjang dengan motif klasik Indonesia.', price: 85000, originalPrice: 120000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[2]), img(FASHION_IMGS[3])]), minOrder: 6, stock: 200, location: 'Jakarta', sold: 540, rating: 4.5, weight: 300, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['M', 'L', 'XL', 'XXL'] }, { name: 'Motif', order: 1, options: ['Parang', 'Kawung', 'Mega Mendung', 'Truntum'] }] },
    { id: cuid(), name: 'Celana Jeans Slim Fit Pria', description: 'Celana jeans slim fit pria dengan bahan denim stretch.', price: 110000, originalPrice: 165000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[4])]), minOrder: 6, stock: 300, location: 'Jakarta', sold: 780, rating: 4.6, weight: 500, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['28', '29', '30', '31', '32', '33', '34'] }, { name: 'Warna', order: 1, options: ['Biru Tua', 'Biru Muda', 'Hitam'] }] },
    { id: cuid(), name: 'Gaun Muslimah Premium', description: 'Gaun muslimah premium dengan bahan crepe yang jatuh.', price: 135000, originalPrice: 185000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[5]), img(FASHION_IMGS[6])]), minOrder: 3, stock: 150, location: 'Jakarta', sold: 320, rating: 4.8, weight: 400, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['S', 'M', 'L', 'XL'] }, { name: 'Warna', order: 1, options: ['Maroon', 'Navy', 'Dusty Pink', 'Hijau Sage'] }] },
    { id: cuid(), name: 'Hoodie Oversize Unisex', description: 'Hoodie oversize unisex dengan bahan fleece tebal 280gsm.', price: 95000, originalPrice: 140000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[7]), img(FASHION_IMGS[8])]), minOrder: 6, stock: 250, location: 'Jakarta', sold: 650, rating: 4.7, weight: 450, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['M', 'L', 'XL', 'XXL'] }, { name: 'Warna', order: 1, options: ['Hitam', 'Abu Muda', 'Sage', 'Coklat'] }] },
    { id: cuid(), name: 'Rok Plisket Anak Sekolah', description: 'Rok plisket untuk anak sekolah dengan bahan premium.', price: 42000, originalPrice: 55000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[1])]), minOrder: 24, stock: 600, location: 'Jakarta', sold: 2100, rating: 4.4, weight: 200, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['S', 'M', 'L', 'XL'] }] },
    { id: cuid(), name: 'Jaket Parasut Waterproof', description: 'Jaket parasut waterproof ringan dan tahan air.', price: 75000, originalPrice: 110000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[4]), img(FASHION_IMGS[7])]), minOrder: 12, stock: 400, location: 'Jakarta', sold: 890, rating: 4.5, weight: 350, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['M', 'L', 'XL', 'XXL'] }, { name: 'Warna', order: 1, options: ['Hitam', 'Navy', 'Merah Maroon'] }] },
    { id: cuid(), name: 'Daster Rumah Wanita Katun Rayon', description: 'Daster rumah wanita berbahan katun rayon yang adem.', price: 28000, originalPrice: 40000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[5])]), minOrder: 24, stock: 800, location: 'Jakarta', sold: 3500, rating: 4.3, weight: 180, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['M', 'L', 'XL', 'XXL'] }] },
    { id: cuid(), name: 'Masker Medis 3 Ply Box 50pcs', description: 'Masker medis 3 ply untuk perlindungan harian.', price: 25000, originalPrice: 35000, category: 'kesehatan', images: JSON.stringify([img(KESEHATAN_IMGS[0])]), minOrder: 10, stock: 1000, location: 'Jakarta', sold: 4200, rating: 4.2, weight: 150, sellerId: seller1.id, variants: [{ name: 'Warna', order: 0, options: ['Biru', 'Hitam', 'Putih'] }] },
    { id: cuid(), name: 'Vitamin C 1000mg - Botol 60 Tablet', description: 'Vitamin C 1000mg dengan formula enhanced absorption.', price: 45000, originalPrice: 65000, category: 'kesehatan', images: JSON.stringify([img(KESEHATAN_IMGS[0])]), minOrder: 12, stock: 500, location: 'Jakarta', sold: 1800, rating: 4.6, weight: 100, sellerId: seller1.id, variants: [] },
    { id: cuid(), name: 'Serum Vitamin C untuk Wajah', description: 'Serum vitamin C konsentrasi tinggi untuk mencerahkan wajah.', price: 55000, originalPrice: 85000, category: 'kecantikan', images: JSON.stringify([img(KECANTIKAN_IMGS[0])]), minOrder: 12, stock: 350, location: 'Jakarta', sold: 2200, rating: 4.7, weight: 80, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['20ml', '30ml'] }] },
    { id: cuid(), name: 'Paket Skincare Lengkap 5 in 1', description: 'Paket skincare lengkap berisi cleanser, toner, serum, moisturizer, dan sunscreen.', price: 125000, originalPrice: 200000, category: 'kecantikan', images: JSON.stringify([img(KECANTIKAN_IMGS[0])]), minOrder: 6, stock: 200, location: 'Jakarta', sold: 950, rating: 4.5, weight: 500, sellerId: seller1.id, variants: [{ name: 'Tipe Kulit', order: 0, options: ['Berminyak', 'Kering', 'Normal', 'Sensitif'] }] },
    { id: cuid(), name: 'Kopi Arabica Gayo Premium 1kg', description: 'Kopi arabica Gayo premium dari dataran tinggi Aceh.', price: 85000, originalPrice: 110000, category: 'makanan', images: JSON.stringify([img(MAKANAN_IMGS[0])]), minOrder: 5, stock: 300, location: 'Jakarta', sold: 680, rating: 4.8, weight: 1000, sellerId: seller1.id, variants: [{ name: 'Roast Level', order: 0, options: ['Light', 'Medium', 'Dark'] }, { name: 'Grind', order: 1, options: ['Whole Bean', 'Coarse', 'Medium', 'Fine'] }] },
    { id: cuid(), name: 'Keripik Singkong Pedas Original 250g', description: 'Keripik singkong renyah dengan bumbu pedas original.', price: 15000, originalPrice: 20000, category: 'makanan', images: JSON.stringify([img(MAKANAN_IMGS[0])]), minOrder: 24, stock: 1000, location: 'Jakarta', sold: 5600, rating: 4.3, weight: 250, sellerId: seller1.id, variants: [{ name: 'Rasa', order: 0, options: ['Pedas Original', 'BBQ', 'Keju', 'Balado'] }] },
    { id: cuid(), name: 'Boneka Plush Bear 50cm', description: 'Boneka plush bear lembut berukuran 50cm.', price: 35000, originalPrice: 50000, category: 'mainan', images: JSON.stringify([img(MAINAN_IMGS[0])]), minOrder: 12, stock: 400, location: 'Jakarta', sold: 1500, rating: 4.4, weight: 300, sellerId: seller1.id, variants: [{ name: 'Warna', order: 0, options: ['Coklat', 'Putih', 'Pink', 'Abu-abu'] }] },
    { id: cuid(), name: 'Sepatu Running Olahraga Unisex', description: 'Sepatu running olahraga unisex dengan cushion nyaman.', price: 125000, originalPrice: 200000, category: 'olahraga', images: JSON.stringify([img(OLAHRAGA_IMGS[0])]), minOrder: 6, stock: 200, location: 'Jakarta', sold: 420, rating: 4.5, weight: 600, sellerId: seller1.id, variants: [{ name: 'Ukuran', order: 0, options: ['39', '40', '41', '42', '43', '44'] }, { name: 'Warna', order: 1, options: ['Hitam', 'Putih', 'Merah', 'Navy'] }] },
    { id: cuid(), name: 'Yoga Mat Premium 8mm', description: 'Yoga mat premium tebal 8mm untuk kenyamanan maksimal.', price: 65000, originalPrice: 95000, category: 'olahraga', images: JSON.stringify([img(OLAHRAGA_IMGS[0])]), minOrder: 10, stock: 250, location: 'Jakarta', sold: 310, rating: 4.6, weight: 1200, sellerId: seller1.id, variants: [{ name: 'Warna', order: 0, options: ['Ungu', 'Biru', 'Hijau', 'Hitam', 'Pink'] }] },
    { id: cuid(), name: 'TWS Earbuds Bluetooth 5.3', description: 'TWS earbuds dengan Bluetooth 5.3 untuk koneksi stabil.', price: 75000, originalPrice: 120000, category: 'elektronik', images: JSON.stringify([img(ELEKTRONIK_IMGS[0]), img(ELEKTRONIK_IMGS[1])]), minOrder: 10, stock: 400, location: 'Surabaya', sold: 2100, rating: 4.4, weight: 50, sellerId: seller2.id, variants: [{ name: 'Warna', order: 0, options: ['Hitam', 'Putih', 'Navy'] }] },
    { id: cuid(), name: 'Speaker Bluetooth Portable', description: 'Speaker bluetooth portable dengan suara bass yang kuat.', price: 95000, originalPrice: 150000, category: 'elektronik', images: JSON.stringify([img(ELEKTRONIK_IMGS[2])]), minOrder: 6, stock: 250, location: 'Surabaya', sold: 980, rating: 4.5, weight: 400, sellerId: seller2.id, variants: [{ name: 'Warna', order: 0, options: ['Hitam', 'Merah', 'Biru'] }] },
    { id: cuid(), name: 'Powerbank 20000mAh Fast Charging', description: 'Powerbank kapasitas besar 20000mAh dengan fast charging 22.5W.', price: 110000, originalPrice: 165000, category: 'elektronik', images: JSON.stringify([img(ELEKTRONIK_IMGS[3])]), minOrder: 6, stock: 300, location: 'Surabaya', sold: 1450, rating: 4.6, weight: 350, sellerId: seller2.id, variants: [{ name: 'Warna', order: 0, options: ['Hitam', 'Putih'] }] },
    { id: cuid(), name: 'Smartwatch Sport Waterproof IP68', description: 'Smartwatch sport dengan sertifikasi waterproof IP68.', price: 145000, originalPrice: 220000, category: 'elektronik', images: JSON.stringify([img(ELEKTRONIK_IMGS[4])]), minOrder: 6, stock: 200, location: 'Surabaya', sold: 760, rating: 4.3, weight: 60, sellerId: seller2.id, variants: [{ name: 'Warna Strap', order: 0, options: ['Hitam', 'Putih', 'Merah', 'Hijau'] }] },
    { id: cuid(), name: 'Kabel USB-C Fast Charging 1.5m', description: 'Kabel USB-C fast charging mendukung arus hingga 3A.', price: 18000, originalPrice: 28000, category: 'elektronik', images: JSON.stringify([img(ELEKTRONIK_IMGS[1])]), minOrder: 50, stock: 2000, location: 'Surabaya', sold: 8500, rating: 4.2, weight: 30, sellerId: seller2.id, variants: [{ name: 'Tipe', order: 0, options: ['USB-C to USB-C', 'USB-A to USB-C', 'USB-C to Lightning'] }, { name: 'Panjang', order: 1, options: ['1m', '1.5m', '2m'] }] },
    { id: cuid(), name: 'Charger Wall 33W GaN', description: 'Charger wall GaN 33W dengan ukuran compact.', price: 55000, originalPrice: 85000, category: 'elektronik', images: JSON.stringify([img(ELEKTRONIK_IMGS[5])]), minOrder: 12, stock: 500, location: 'Surabaya', sold: 3200, rating: 4.7, weight: 80, sellerId: seller2.id, variants: [{ name: 'Port', order: 0, options: ['1 USB-C', '2 USB-C', '1C+1A', '2C+1A'] }] },
    { id: cuid(), name: 'Lampu LED Strip 5m RGB Remote', description: 'Lampu LED strip sepanjang 5 meter dengan 16 juta warna.', price: 35000, originalPrice: 55000, category: 'rumah', images: JSON.stringify([img(RUMAH_IMGS[0])]), minOrder: 12, stock: 600, location: 'Surabaya', sold: 2800, rating: 4.3, weight: 200, sellerId: seller2.id, variants: [{ name: 'Panjang', order: 0, options: ['1m', '2m', '5m', '10m'] }] },
    { id: cuid(), name: 'Rak Serbaguna 5 Tingkat', description: 'Rak serbaguna 5 tingkat yang bisa dibongkar pasang.', price: 85000, originalPrice: 125000, category: 'rumah', images: JSON.stringify([img(RUMAH_IMGS[1])]), minOrder: 5, stock: 150, location: 'Surabaya', sold: 420, rating: 4.5, weight: 5000, sellerId: seller2.id, variants: [] },
    { id: cuid(), name: 'Diffuser Aromatherapy 300ml', description: 'Diffuser aromatherapy ultrasonik kapasitas 300ml.', price: 65000, originalPrice: 95000, category: 'rumah', images: JSON.stringify([img(RUMAH_IMGS[2])]), minOrder: 10, stock: 350, location: 'Surabaya', sold: 1100, rating: 4.6, weight: 500, sellerId: seller2.id, variants: [{ name: 'Warna', order: 0, options: ['Putih', 'Kayu Natural', 'Hitam'] }] },
    { id: cuid(), name: 'Set Balok Building Blocks 500pcs', description: 'Set balok building blocks 500pcs untuk kreativitas anak.', price: 55000, originalPrice: 80000, category: 'mainan', images: JSON.stringify([img(MAINAN_IMGS[0])]), minOrder: 12, stock: 300, location: 'Surabaya', sold: 920, rating: 4.4, weight: 800, sellerId: seller2.id, variants: [] },
    { id: cuid(), name: 'Remote Control Mobil Drift 1:16', description: 'Mobil remote control drift skala 1:16.', price: 85000, originalPrice: 130000, category: 'mainan', images: JSON.stringify([img(MAINAN_IMGS[0])]), minOrder: 6, stock: 150, location: 'Surabaya', sold: 560, rating: 4.3, weight: 600, sellerId: seller2.id, variants: [{ name: 'Warna', order: 0, options: ['Merah', 'Biru', 'Hitam'] }] },
    { id: cuid(), name: 'Batik Tulis Solo Kain 2.5m', description: 'Batik tulis asli Solo dengan motif klasik. Kain sepanjang 2.5 meter.', price: 250000, originalPrice: 350000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[2])]), minOrder: 3, stock: 50, location: 'Solo', sold: 180, rating: 4.9, weight: 300, sellerId: seller3.id, variants: [{ name: 'Motif', order: 0, options: ['Sidomukti', 'Sidoasih', 'Truntum', 'Parang'] }, { name: 'Warna Dasar', order: 1, options: ['Coklat', 'Hitam', 'Navy', 'Merah Maroon'] }] },
    { id: cuid(), name: 'Batik Cap Semarang Kain 2.5m', description: 'Batik cap Semarang dengan motif khas pesisir.', price: 95000, originalPrice: 140000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[3])]), minOrder: 6, stock: 100, location: 'Solo', sold: 420, rating: 4.6, weight: 300, sellerId: seller3.id, variants: [{ name: 'Motif', order: 0, options: ['Awan Piranti', 'Lung-Lungan', 'Merak Ngibing', 'Peksi Manyuro'] }] },
    { id: cuid(), name: 'Sarung Batik Cap Motif Mega Mendung', description: 'Sarung batik cap motif mega mendung khas Cirebon.', price: 65000, originalPrice: 90000, category: 'fashion', images: JSON.stringify([img(FASHION_IMGS[6])]), minOrder: 12, stock: 250, location: 'Solo', sold: 890, rating: 4.5, weight: 250, sellerId: seller3.id, variants: [{ name: 'Warna', order: 0, options: ['Biru Tua', 'Merah', 'Hijau', 'Ungu'] }] },
  ]

  for (const p of products) {
    await client.execute({
      sql: `INSERT INTO "Product" (id, name, description, price, originalPrice, category, images, minOrder, stock, location, active, sold, rating, weight, sellerId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      args: [p.id, p.name, p.description, p.price, p.originalPrice, p.category, p.images, p.minOrder, p.stock, p.location, p.sold, p.rating, p.weight, p.sellerId],
    })

    // Insert variant groups and options
    for (const v of p.variants) {
      const vgId = cuid()
      await client.execute({
        sql: `INSERT INTO "VariantGroup" (id, name, "order", productId) VALUES (?, ?, ?, ?)`,
        args: [vgId, v.name, v.order, p.id],
      })
      for (const opt of v.options) {
        await client.execute({
          sql: `INSERT INTO "VariantOption" (id, value, variantGroupId) VALUES (?, ?, ?)`,
          args: [cuid(), opt, vgId],
        })
      }
    }
  }
  console.log(`  ✅ Created ${products.length} products with variants`)

  // Insert some orders
  const orders = [
    { id: cuid(), buyerId: buyers[0].id, sellerId: seller1.id, status: 'delivered', totalAmount: 420000, shippingCost: 15000, shippingAddress: 'Jl. Dago No. 88, Bandung', paymentMethod: 'transfer', notes: '', paymentProof: 'bukti-transfer-1.jpg' },
    { id: cuid(), buyerId: buyers[1].id, sellerId: seller2.id, status: 'shipped', totalAmount: 185000, shippingCost: 12000, shippingAddress: 'Jl. Malioboro No. 25, Yogyakarta', paymentMethod: 'transfer', notes: 'Tolong packing yang aman', paymentProof: 'bukti-transfer-2.jpg' },
    { id: cuid(), buyerId: buyers[2].id, sellerId: seller1.id, status: 'paid', totalAmount: 560000, shippingCost: 18000, shippingAddress: 'Jl. Pandanaran No. 10, Semarang', paymentMethod: 'ewallet', notes: '', paymentProof: 'bukti-ewallet-1.jpg' },
    { id: cuid(), buyerId: buyers[0].id, sellerId: seller2.id, status: 'pending', totalAmount: 75000, shippingCost: 10000, shippingAddress: 'Jl. Dago No. 88, Bandung', paymentMethod: 'cod', notes: 'COD ya', paymentProof: '' },
    { id: cuid(), buyerId: buyers[3].id, sellerId: seller3.id, status: 'paid', totalAmount: 500000, shippingCost: 20000, shippingAddress: 'Jl. Gatot Subroto No. 55, Medan', paymentMethod: 'transfer', notes: '', paymentProof: 'bukti-transfer-3.jpg' },
  ]

  for (const o of orders) {
    await client.execute({
      sql: `INSERT INTO "Order" (id, buyerId, sellerId, status, totalAmount, shippingCost, shippingAddress, paymentMethod, notes, paymentProof) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [o.id, o.buyerId, o.sellerId, o.status, o.totalAmount, o.shippingCost, o.shippingAddress, o.paymentMethod, o.notes, o.paymentProof],
    })
  }
  console.log(`  ✅ Created ${orders.length} orders`)

  // Insert order items
  const orderItems = [
    { id: cuid(), orderId: orders[0].id, productId: products[0].id, productName: products[0].name, quantity: 12, price: 35000, variants: JSON.stringify({ Ukuran: 'L', Warna: 'Hitam' }) },
    { id: cuid(), orderId: orders[1].id, productId: products[17].id, productName: products[17].name, quantity: 1, price: 75000, variants: JSON.stringify({ Warna: 'Hitam' }) },
    { id: cuid(), orderId: orders[1].id, productId: products[22].id, productName: products[22].name, quantity: 1, price: 18000, variants: JSON.stringify({ Tipe: 'USB-C to USB-C', Panjang: '1.5m' }) },
    { id: cuid(), orderId: orders[2].id, productId: products[3].id, productName: products[3].name, quantity: 4, price: 135000, variants: JSON.stringify({ Ukuran: 'M', Warna: 'Maroon' }) },
    { id: cuid(), orderId: orders[3].id, productId: products[17].id, productName: products[17].name, quantity: 1, price: 75000, variants: JSON.stringify({ Warna: 'Putih' }) },
    { id: cuid(), orderId: orders[4].id, productId: products[29].id, productName: products[29].name, quantity: 2, price: 250000, variants: JSON.stringify({ Motif: 'Sidomukti', 'Warna Dasar': 'Coklat' }) },
  ]

  for (const oi of orderItems) {
    await client.execute({
      sql: `INSERT INTO "OrderItem" (id, orderId, productId, productName, quantity, price, variants) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [oi.id, oi.orderId, oi.productId, oi.productName, oi.quantity, oi.price, oi.variants],
    })
  }
  console.log(`  ✅ Created ${orderItems.length} order items`)

  // Insert chats
  const chats = [
    { id: cuid(), senderId: buyers[0].id, receiverId: seller1.id, message: 'Halo, kaos polosnya ready ukuran L warna hitam?', read: true },
    { id: cuid(), senderId: seller1.id, receiverId: buyers[0].id, message: 'Ready kak! Langsung order aja ya 😊', read: true },
    { id: cuid(), senderId: buyers[0].id, receiverId: seller1.id, message: 'Oke, min order 12 pcs ya? Bisa campur warna?', read: true },
    { id: cuid(), senderId: seller1.id, receiverId: buyers[0].id, message: 'Bisa kak, campur warna dan ukuran asal total 12 pcs', read: false },
    { id: cuid(), senderId: buyers[1].id, receiverId: seller2.id, message: 'Kak, TWS earbudsnya ada garansi?', read: true },
    { id: cuid(), senderId: seller2.id, receiverId: buyers[1].id, message: 'Ada kak, garansi 6 bulan resmi', read: false },
    { id: cuid(), senderId: buyers[2].id, receiverId: seller1.id, message: 'Min, gaun muslimahnya bahan adem ya?', read: true },
    { id: cuid(), senderId: seller1.id, receiverId: buyers[2].id, message: 'Iya kak, bahan crepe adem dan tidak menerawang', read: true },
  ]

  for (const c of chats) {
    await client.execute({
      sql: `INSERT INTO "Chat" (id, senderId, receiverId, message, read) VALUES (?, ?, ?, ?, ?)`,
      args: [c.id, c.senderId, c.receiverId, c.message, c.read ? 1 : 0],
    })
  }
  console.log(`  ✅ Created ${chats.length} chats`)

  // Insert notifications
  const notifications = [
    { id: cuid(), userId: seller1.id, title: 'Pesanan Baru!', message: 'Budi Santoso telah memesan Kaos Polos Premium Cotton Combed 30s', type: 'new_order', link: '/orders' },
    { id: cuid(), userId: seller2.id, title: 'Pesanan Baru!', message: 'Siti Aminah telah memesan TWS Earbuds Bluetooth 5.3', type: 'new_order', link: '/orders' },
    { id: cuid(), userId: seller1.id, title: 'Pembayaran Diterima', message: 'Pembayaran dari Dewi Lestari telah dikonfirmasi', type: 'payment', link: '/orders' },
    { id: cuid(), userId: buyers[0].id, title: 'Pesanan Dikirim', message: 'Pesanan Anda telah dikirim melalui JNE REG', type: 'shipping', link: '/orders' },
    { id: cuid(), userId: buyers[1].id, title: 'Chat Baru', message: 'Elektronik Surabaya membalas pesan Anda', type: 'chat', link: '/chat' },
    { id: cuid(), userId: seller1.id, title: 'Pesan Baru', message: 'Dewi Lestari mengirim pesan baru', type: 'chat', link: '/chat' },
    { id: cuid(), userId: buyers[2].id, title: 'Promo Spesial!', message: 'Diskon hingga 40% untuk semua produk fashion!', type: 'promo', link: '/' },
    { id: cuid(), userId: seller3.id, title: 'Pesanan Baru!', message: 'Ahmad Rizki telah memesan Batik Tulis Solo Kain 2.5m', type: 'new_order', link: '/orders' },
  ]

  for (const n of notifications) {
    await client.execute({
      sql: `INSERT INTO "Notification" (id, userId, title, message, type, read, link) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [n.id, n.userId, n.title, n.message, n.type, 0, n.link],
    })
  }
  console.log(`  ✅ Created ${notifications.length} notifications`)

  // Insert wishlist
  const wishlists = [
    { id: cuid(), userId: buyers[0].id, productId: products[17].id },
    { id: cuid(), userId: buyers[0].id, productId: products[3].id },
    { id: cuid(), userId: buyers[1].id, productId: products[0].id },
    { id: cuid(), userId: buyers[2].id, productId: products[29].id },
  ]

  for (const w of wishlists) {
    await client.execute({
      sql: `INSERT INTO "Wishlist" (id, userId, productId) VALUES (?, ?, ?)`,
      args: [w.id, w.userId, w.productId],
    })
  }
  console.log(`  ✅ Created ${wishlists.length} wishlist items`)

  console.log('')
  console.log('🎉 Turso database setup complete!')
  console.log('   - 7 users (3 sellers, 4 buyers)')
  console.log('   - 30 products with variants')
  console.log('   - 5 orders with items')
  console.log('   - 8 chat messages')
  console.log('   - 8 notifications')
  console.log('   - 4 wishlist items')
}

main().catch(err => {
  console.error('❌ Setup failed:', err)
  process.exit(1)
}).finally(() => {
  client.close()
})
