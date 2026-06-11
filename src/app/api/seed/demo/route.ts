import { db, ensureDb } from '@/lib/db'
import { NextResponse } from 'next/server'

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36);
}

// Demo product data for seeding
const DEMO_PRODUCTS = [
  {
    id: 'prod_001', name: 'Kaos Polos Premium Cotton 1 Lusin', price: 185000, originalPrice: 350000,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop',
    category: 'fashion-pria',
    subcategory: 'kaos',
    description: 'Kaos polos premium cotton combed 30s, jahitan rantai double needle. 1 lusin isi 12 pcs campuran warna.',
    minOrder: 12, stock: 8500, sold: 4521, rating: 4.9,
    variants: '["S","M","L","XL","XXL"]',
    variantGroups: '[{"name":"Ukuran","options":[{"name":"S"},{"name":"M"},{"name":"L"},{"name":"XL"},{"name":"XXL"}]}]',
  },
  {
    id: 'prod_002', name: 'Set Panci Masak Stainless Steel', price: 289000, originalPrice: 550000,
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&fit=crop',
    category: 'rumah-tangga',
    subcategory: 'peralatan-dapur',
    description: 'Set panci masak stainless steel 5 lapis isi 4 pcs dengan tutup kaca. Bahan food grade.',
    minOrder: 3, stock: 600, sold: 892, rating: 4.8,
    variants: '["4 Pcs","6 Pcs","8 Pcs"]',
    variantGroups: '[{"name":"Paket","options":[{"name":"4 Pcs"},{"name":"6 Pcs"},{"name":"8 Pcs"}]}]',
  },
  {
    id: 'prod_003', name: 'Smartwatch Sport Waterproof', price: 199000, originalPrice: 450000,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop',
    category: 'elektronik',
    subcategory: 'smartwatch',
    description: 'Smartwatch sport waterproof IP68 dengan layar AMOLED 1.69 inch. Dilengkapi heart rate monitor.',
    minOrder: 5, stock: 3200, sold: 2341, rating: 4.7,
    variants: '["Hitam","Putih","Hijau"]',
    variantGroups: '[{"name":"Warna","options":[{"name":"Hitam"},{"name":"Putih"},{"name":"Hijau"}]}]',
  },
  {
    id: 'prod_004', name: 'Rok Plisket Wanita 1 Paket', price: 125000, originalPrice: 280000,
    image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=300&h=300&fit=crop',
    category: 'fashion-wanita',
    subcategory: 'rok',
    description: 'Rok plisket wanita premium bahan crepe. 1 paket isi 6 pcs campuran warna.',
    minOrder: 6, stock: 5500, sold: 1876, rating: 4.9,
    variants: '["S","M","L","XL"]',
    variantGroups: '[{"name":"Ukuran","options":[{"name":"S"},{"name":"M"},{"name":"L"},{"name":"XL"}]}]',
  },
  {
    id: 'prod_005', name: 'Blender Philips 2L 350Watt', price: 245000, originalPrice: 420000,
    image: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=300&h=300&fit=crop',
    category: 'elektronik',
    subcategory: 'aksesoris-elektronik',
    description: 'Blender Philips kapasitas 2L dengan motor 350Watt. Mata pisau 6 sisi anti karat.',
    minOrder: 3, stock: 450, sold: 654, rating: 4.6,
    variants: '["Putih","Hitam"]',
    variantGroups: '[{"name":"Warna","options":[{"name":"Putih"},{"name":"Hitam"}]}]',
  },
  {
    id: 'prod_006', name: 'Kemeja Batik Pria Modern', price: 145000, originalPrice: 295000,
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=300&h=300&fit=crop',
    category: 'fashion-pria',
    subcategory: 'kemeja',
    description: 'Kemeja batik pria modern dengan motif batik tulis asli Pekalongan. Bahan katun premium.',
    minOrder: 6, stock: 4200, sold: 3456, rating: 4.7,
    variants: '["S","M","L","XL","XXL"]',
    variantGroups: '[{"name":"Ukuran","options":[{"name":"S"},{"name":"M"},{"name":"L"},{"name":"XL"},{"name":"XXL"}]}]',
  },
  {
    id: 'prod_007', name: 'Speaker Bluetooth Portable', price: 165000, originalPrice: 350000,
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300&h=300&fit=crop',
    category: 'elektronik',
    subcategory: 'audio-speaker',
    description: 'Speaker bluetooth portable 20W, IPX7 waterproof, baterai 15 jam.',
    minOrder: 5, stock: 3800, sold: 2109, rating: 4.5,
    variants: '["Hitam","Merah","Biru"]',
    variantGroups: '[{"name":"Warna","options":[{"name":"Hitam"},{"name":"Merah"},{"name":"Biru"}]}]',
  },
  {
    id: 'prod_008', name: 'Hijab Segi Empat Premium Voal', price: 85000, originalPrice: 180000,
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=300&h=300&fit=crop',
    category: 'fashion-wanita',
    subcategory: 'hijab',
    description: 'Hijab segi empat premium bahan voal super. 1 paket isi 12 pcs campuran warna.',
    minOrder: 12, stock: 12000, sold: 7890, rating: 4.9,
    variants: '["Campur Warna","Pastel Set","Dark Set"]',
    variantGroups: '[{"name":"Varian","options":[{"name":"Campur Warna"},{"name":"Pastel Set"},{"name":"Dark Set"}]}]',
  },
  {
    id: 'prod_009', name: 'Powerbank 20000mAh Fast Charging', price: 125000, originalPrice: 280000,
    image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=300&h=300&fit=crop',
    category: 'elektronik',
    subcategory: 'aksesoris-elektronik',
    description: 'Powerbank 20000mAh dengan fast charging 22.5W. 3 port output + LED display.',
    minOrder: 10, stock: 8900, sold: 5432, rating: 4.8,
    variants: '["Hitam","Putih"]',
    variantGroups: '[{"name":"Warna","options":[{"name":"Hitam"},{"name":"Putih"}]}]',
  },
  {
    id: 'prod_010', name: 'Bedcover Set King Size', price: 325000, originalPrice: 650000,
    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=300&h=300&fit=crop',
    category: 'rumah-tangga',
    subcategory: 'furniture',
    description: 'Bedcover set king size dengan bahan katun Jepang premium. Isi: bedcover + sarung bantal + sarung guling.',
    minOrder: 3, stock: 900, sold: 567, rating: 4.9,
    variants: '["Putih","Krem","Abu-abu"]',
    variantGroups: '[{"name":"Warna","options":[{"name":"Putih"},{"name":"Krem"},{"name":"Abu-abu"}]}]',
  },
];

// GET: Seed comprehensive demo data AND return current status
export async function GET() {
  try {
    await ensureDb()

    const sellerId = 'demo_seller_001'
    const sellerName = 'Toko Grosir Surabaya'
    const sellerCity = 'Surabaya'

    // Ensure seller exists
    const sellerResult = await db.$queryRawUnsafe(
      `SELECT id FROM "User" WHERE email = 'seller1@grosirpj.id' LIMIT 1`
    ) as Array<{id: string}>

    if (!sellerResult || sellerResult.length === 0) {
      await db.$executeRawUnsafe(`
        INSERT INTO "User" ("id", "email", "name", "password", "city", "role", "createdAt", "updatedAt")
        VALUES ('demo_seller_001', 'seller1@grosirpj.id', 'Toko Grosir Surabaya', '${simpleHash('password123')}', 'Surabaya', 'seller', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
    }

    // Ensure buyer exists
    const buyerResult = await db.$queryRawUnsafe(
      `SELECT id FROM "User" WHERE email = 'buyer1@grosirpj.id' LIMIT 1`
    ) as Array<{id: string}>

    if (!buyerResult || buyerResult.length === 0) {
      await db.$executeRawUnsafe(`
        INSERT INTO "User" ("id", "email", "name", "password", "city", "role", "createdAt", "updatedAt")
        VALUES ('demo_buyer_001', 'buyer1@grosirpj.id', 'Buyer Demo', '${simpleHash('password123')}', 'Jakarta', 'buyer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
    }

    // Seed products if none exist
    const productCount = await db.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "Product" WHERE "sellerId" = ?`,
      sellerId
    ) as Array<{count: bigint | number}>

    const numProducts = Number(productCount[0]?.count || 0)
    if (numProducts === 0) {
      for (const p of DEMO_PRODUCTS) {
        try {
          await db.$executeRawUnsafe(`
            INSERT OR IGNORE INTO "Product" (
              "id", "sellerId", "name", "price", "originalPrice", "images",
              "category", "subcategory", "description", "minOrder", "stock", "location",
              "variants", "variantGroups", "sellerName", "sellerRating", "rating",
              "sold", "status", "createdAt", "updatedAt"
            ) VALUES (
              '${p.id}', '${sellerId}', '${p.name.replace(/'/g, "''")}',
              ${p.price}, ${p.originalPrice}, '${JSON.stringify([p.image])}',
              '${p.category}', '${p.subcategory}', '${p.description.replace(/'/g, "''")}',
              ${p.minOrder}, ${p.stock}, '${sellerCity}',
              '${p.variants.replace(/'/g, "''")}', '${p.variantGroups.replace(/'/g, "''")}',
              '${sellerName}', 4.8, ${p.rating},
              ${p.sold}, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
          `)
        } catch (e) {
          console.error(`Failed to seed product ${p.id}:`, e)
        }
      }
    }

    // Check order count
    const orderCount = await db.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "Order" WHERE "sellerId" = ?`,
      sellerId
    ) as Array<{count: bigint | number}>

    // Seed demo orders if none exist for this seller
    if (Number(orderCount[0]?.count || 0) === 0) {
      const buyerId = 'demo_buyer_001'
      const now = new Date()
      const demoOrders = [
        {
          id: 'order_demo_001', status: 'delivered', paymentStatus: 'paid', paymentMethod: 'bank_transfer',
          totalAmount: 370000, shippingCost: 15000, shippingAddress: 'Jl. Sudirman No. 123, Jakarta Pusat',
          shippingCity: 'Jakarta', expedition: 'JNE', trackingNumber: 'JNE1234567890',
          productId: 1, productName: 'Kaos Polos Premium Cotton 1 Lusin', productImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop',
          price: 185000, quantity: 2, sellerName: 'Toko Grosir Surabaya', location: 'Surabaya', daysAgo: 30,
        },
        {
          id: 'order_demo_002', status: 'delivered', paymentStatus: 'paid', paymentMethod: 'qris',
          totalAmount: 289000, shippingCost: 0, shippingAddress: 'Jl. Thamrin No. 45, Jakarta',
          shippingCity: 'Jakarta', expedition: 'J&T', trackingNumber: 'JNT9876543210',
          productId: 2, productName: 'Set Panci Masak Stainless Steel', productImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&fit=crop',
          price: 289000, quantity: 1, sellerName: 'Toko Grosir Surabaya', location: 'Surabaya', daysAgo: 25,
        },
        {
          id: 'order_demo_003', status: 'shipped', paymentStatus: 'paid', paymentMethod: 'bank_transfer',
          totalAmount: 398000, shippingCost: 15000, shippingAddress: 'Jl. Gatot Subroto No. 78, Bandung',
          shippingCity: 'Bandung', notes: 'Tolong packing yang rapi', expedition: 'SiCepat', trackingNumber: 'SICEP5678901234',
          productId: 3, productName: 'Smartwatch Sport Waterproof', productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop',
          price: 199000, quantity: 2, sellerName: 'Toko Grosir Surabaya', location: 'Surabaya', daysAgo: 5,
        },
        {
          id: 'order_demo_004', status: 'paid', paymentStatus: 'paid', paymentMethod: 'qris',
          totalAmount: 750000, shippingCost: 0, shippingAddress: 'Jl. Malioboro No. 12, Yogyakarta',
          shippingCity: 'Yogyakarta', expedition: '', trackingNumber: '',
          productId: 4, productName: 'Rok Plisket Wanita 1 Paket', productImage: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=300&h=300&fit=crop',
          price: 125000, quantity: 6, sellerName: 'Toko Grosir Surabaya', location: 'Surabaya', daysAgo: 2,
        },
        {
          id: 'order_demo_005', status: 'pending', paymentStatus: 'unpaid', paymentMethod: 'cod',
          totalAmount: 490000, shippingCost: 0, shippingAddress: 'Jl. Pemuda No. 56, Semarang',
          shippingCity: 'Semarang', notes: 'Minta warna campur', expedition: '', trackingNumber: '',
          productId: 6, productName: 'Kemeja Batik Pria Modern', productImage: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=300&h=300&fit=crop',
          price: 145000, quantity: 2, sellerName: 'Toko Grosir Surabaya', location: 'Surabaya', daysAgo: 0,
        },
        {
          id: 'order_demo_006', status: 'delivered', paymentStatus: 'paid', paymentMethod: 'bank_transfer',
          totalAmount: 510000, shippingCost: 15000, shippingAddress: 'Jl. Diponegoro No. 34, Medan',
          shippingCity: 'Medan', expedition: 'POS Indonesia', trackingNumber: 'POS0987654321',
          productId: 5, productName: 'Blender Philips 2L 350Watt', productImage: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=300&h=300&fit=crop',
          price: 245000, quantity: 2, sellerName: 'Toko Grosir Surabaya', location: 'Surabaya', daysAgo: 20,
        },
        {
          id: 'order_demo_007', status: 'delivered', paymentStatus: 'paid', paymentMethod: 'qris',
          totalAmount: 1020000, shippingCost: 0, shippingAddress: 'Jl. Ahmad Yani No. 89, Surabaya',
          shippingCity: 'Surabaya', expedition: 'JNE', trackingNumber: 'JNE1111222333',
          productId: 8, productName: 'Hijab Segi Empat Premium Voal', productImage: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=300&h=300&fit=crop',
          price: 85000, quantity: 12, sellerName: 'Toko Grosir Surabaya', location: 'Surabaya', daysAgo: 15,
        },
        {
          id: 'order_demo_008', status: 'shipped', paymentStatus: 'paid', paymentMethod: 'bank_transfer',
          totalAmount: 250000, shippingCost: 0, shippingAddress: 'Jl. Merdeka No. 22, Bandung',
          shippingCity: 'Bandung', expedition: 'TIKI', trackingNumber: 'TIKI4445556667',
          productId: 7, productName: 'Speaker Bluetooth Portable', productImage: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300&h=300&fit=crop',
          price: 165000, quantity: 1, sellerName: 'Toko Grosir Surabaya', location: 'Surabaya', daysAgo: 3,
        },
      ]

      for (const order of demoOrders) {
        const createdAt = new Date(now.getTime() - order.daysAgo * 86400000).toISOString()
        const paidAt = order.paymentStatus === 'paid' ? new Date(now.getTime() - Math.max(1, order.daysAgo - 1) * 86400000).toISOString() : null
        const shippedAt = order.status === 'shipped' || order.status === 'delivered'
          ? new Date(now.getTime() - Math.max(1, order.daysAgo - 1) * 86400000).toISOString() : null
        const deliveredAt = order.status === 'delivered'
          ? new Date(now.getTime() - Math.max(1, order.daysAgo - 3) * 86400000).toISOString() : null

        try {
          await db.$executeRawUnsafe(`
            INSERT OR IGNORE INTO "Order" (
              "id", "buyerId", "sellerId", "status", "paymentMethod", "paymentStatus",
              "shippingAddress", "shippingCity", "totalAmount", "shippingCost", "notes",
              "expedition", "trackingNumber", "paidAt", "shippedAt", "deliveredAt",
              "createdAt", "updatedAt"
            ) VALUES (
              '${order.id}', '${buyerId}', '${sellerId}',
              '${order.status}', '${order.paymentMethod}', '${order.paymentStatus}',
              '${order.shippingAddress.replace(/'/g, "''")}', '${order.shippingCity}',
              ${order.totalAmount}, ${order.shippingCost}, '${(order as any).notes?.replace(/'/g, "''") || ''}',
              '${order.expedition}', '${order.trackingNumber}',
              ${paidAt ? `'${paidAt}'` : 'NULL'},
              ${shippedAt ? `'${shippedAt}'` : 'NULL'},
              ${deliveredAt ? `'${deliveredAt}'` : 'NULL'},
              '${createdAt}', '${createdAt}'
            )
          `)

          const itemId = 'item_' + order.id.replace('order_', '')
          await db.$executeRawUnsafe(`
            INSERT OR IGNORE INTO "OrderItem" (
              "id", "orderId", "productId", "productName", "productImage",
              "price", "quantity", "sellerName", "location"
            ) VALUES (
              '${itemId}', '${order.id}', ${order.productId},
              '${order.productName.replace(/'/g, "''")}',
              '${order.productImage}',
              ${order.price}, ${order.quantity},
              '${order.sellerName.replace(/'/g, "''")}',
              '${order.location}'
            )
          `)

          // Create notifications
          if (order.status === 'pending') {
            await db.$executeRawUnsafe(`
              INSERT OR IGNORE INTO "Notification" ("id", "userId", "title", "message", "type", "read", "orderId", "createdAt")
              VALUES ('notif_${order.id}', '${sellerId}', 'Pesanan Baru', 'Anda mendapat pesanan baru dari Buyer Demo. Silakan cek detail pesanan.', 'order', 0, '${order.id}', '${createdAt}')
            `)
          } else if (order.status === 'paid') {
            await db.$executeRawUnsafe(`
              INSERT OR IGNORE INTO "Notification" ("id", "userId", "title", "message", "type", "read", "orderId", "createdAt")
              VALUES ('notif_${order.id}_s', '${sellerId}', 'Pembayaran Diterima', 'Pembayaran untuk pesanan telah dikonfirmasi oleh pembeli. Silakan proses pesanan.', 'payment', 0, '${order.id}', '${paidAt || createdAt}')
            `)
          } else if (order.status === 'shipped') {
            await db.$executeRawUnsafe(`
              INSERT OR IGNORE INTO "Notification" ("id", "userId", "title", "message", "type", "read", "orderId", "createdAt")
              VALUES ('notif_${order.id}_ship', '${buyerId}', 'Pesanan Dikirim - ${order.expedition}', 'Pesanan Anda telah dikirim via ${order.expedition}. Nomor Resi: ${order.trackingNumber}', 'shipping', 0, '${order.id}', '${shippedAt || createdAt}')
            `)
          }
        } catch (e) {
          console.error(`Failed to seed order ${order.id}:`, e)
        }
      }
    }

    // Return current status
    const finalProductCount = await db.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "Product" WHERE "sellerId" = ?`,
      sellerId
    ) as Array<{count: bigint | number}>

    const finalOrderCount = await db.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "Order" WHERE "sellerId" = ?`,
      sellerId
    ) as Array<{count: bigint | number}>

    const revenueResult = await db.$queryRawUnsafe(
      `SELECT COALESCE(SUM("totalAmount"), 0) as total FROM "Order" WHERE "sellerId" = ? AND "paymentStatus" = 'paid'`,
      sellerId
    ) as Array<{total: bigint | number}>

    const notifCount = await db.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "Notification"`
    ) as Array<{count: bigint | number}>

    const chatCount = await db.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "Chat" WHERE "id" LIKE 'demo_chat_%'`
    ) as Array<{count: bigint | number}>

    // Seed demo chats if none exist
    if (Number(chatCount[0]?.count || 0) === 0) {
      const buyerId = 'demo_buyer_001'
      const now = Date.now()
      const demoChats = [
        {
          id: 'demo_chat_001', productId: 1, productName: 'Kaos Polos Premium Cotton 1 Lusin', daysAgo: 3,
          messages: [
            { senderId: buyerId, content: 'Halo, apakah kaos polos premium cotton masih ready?', minutesOffset: 0 },
            { senderId: sellerId, content: 'Halo kak! Masih ready ya, stok masih banyak 🙏', minutesOffset: 5 },
            { senderId: buyerId, content: 'Kalau order 5 lusin bisa dapat harga berapa?', minutesOffset: 12 },
            { senderId: sellerId, content: 'Untuk 5 lusin bisa dapat harga spesial Rp 160.000/lusin kak. Mau langsung order?', minutesOffset: 20 },
            { senderId: buyerId, content: 'Oke saya mau order 5 lusin campuran ukuran', minutesOffset: 35 },
          ],
        },
        {
          id: 'demo_chat_002', productId: 3, productName: 'Smartwatch Sport Waterproof', daysAgo: 2,
          messages: [
            { senderId: buyerId, content: 'Min, smartwatch ini waterproof ya? Bisa buat renang?', minutesOffset: 0 },
            { senderId: sellerId, content: 'Bisa kak, IP68 waterproof. Aman untuk renang dan mandi 👍', minutesOffset: 3 },
            { senderId: buyerId, content: 'Ok siap, saya order ya', minutesOffset: 10 },
          ],
        },
        {
          id: 'demo_chat_003', productId: 6, productName: 'Kemeja Batik Pria Modern', daysAgo: 1,
          messages: [
            { senderId: buyerId, content: 'Batiknya asli Pekalongan? Warna tidak luntur kan?', minutesOffset: 0 },
            { senderId: sellerId, content: 'Asli Pekalongan kak! Warna sudah di-test tidak luntur. Bisa cek review dari pembeli lain ya', minutesOffset: 8 },
            { senderId: sellerId, content: 'Kalau kakak order hari ini, kami bisa kirim besok pagi', minutesOffset: 10 },
            { senderId: buyerId, content: 'Mantap, saya ambil 3 lusin', minutesOffset: 22 },
          ],
        },
      ]

      for (const chat of demoChats) {
        const chatCreatedAt = new Date(now - chat.daysAgo * 86400000).toISOString()
        const lastMsgMinutesOffset = chat.messages[chat.messages.length - 1].minutesOffset
        const chatUpdatedAt = new Date(now - chat.daysAgo * 86400000 + lastMsgMinutesOffset * 60000).toISOString()

        await db.$executeRawUnsafe(
          `INSERT OR IGNORE INTO "Chat" ("id", "productId", "productName", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?)`,
          chat.id, chat.productId, chat.productName, chatCreatedAt, chatUpdatedAt
        )

        const chatUserBuyerId = 'cu_' + chat.id + '_b'
        await db.$executeRawUnsafe(
          `INSERT OR IGNORE INTO "ChatUser" ("id", "chatId", "userId") VALUES (?, ?, ?)`,
          chatUserBuyerId, chat.id, buyerId
        )

        const chatUserSellerId = 'cu_' + chat.id + '_s'
        await db.$executeRawUnsafe(
          `INSERT OR IGNORE INTO "ChatUser" ("id", "chatId", "userId") VALUES (?, ?, ?)`,
          chatUserSellerId, chat.id, sellerId
        )

        for (let i = 0; i < chat.messages.length; i++) {
          const msg = chat.messages[i]
          const msgId = 'msg_' + chat.id + '_' + i
          const msgCreatedAt = new Date(now - chat.daysAgo * 86400000 + msg.minutesOffset * 60000).toISOString()
          await db.$executeRawUnsafe(
            `INSERT OR IGNORE INTO "Message" ("id", "chatId", "senderId", "content", "createdAt") VALUES (?, ?, ?, ?, ?)`,
            msgId, chat.id, msg.senderId, msg.content, msgCreatedAt
          )
        }
      }
    }

    const finalChatCount = await db.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "Chat" WHERE "id" LIKE 'demo_chat_%'`
    ) as Array<{count: bigint | number}>

    return NextResponse.json({
      success: true,
      message: 'Demo data seeded successfully',
      demoData: {
        products: Number(finalProductCount[0]?.count || 0),
        orders: Number(finalOrderCount[0]?.count || 0),
        notifications: Number(notifCount[0]?.count || 0),
        chats: Number(finalChatCount[0]?.count || 0),
        totalRevenue: Number(revenueResult[0]?.total || 0),
      },
    })
  } catch (error) {
    console.error('Demo seed error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
