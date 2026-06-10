import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDb } from '@/lib/db'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export async function POST(request: NextRequest) {
  try {
    await ensureDb()

    const body = await request.json()
    const {
      buyerId,
      items,
      paymentMethod,
      shippingCity,
      shippingAddress,
      notes,
      totalAmount,
      shippingCost,
      sellerId,
    } = body

    // Validate required fields
    if (!buyerId || !items || !items.length || !sellerId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: buyerId, items, sellerId' },
        { status: 400 }
      )
    }

    const orderId = generateId()
    const now = new Date().toISOString()

    // Create the Order using raw SQL
    await db.$executeRawUnsafe(`
      INSERT INTO "Order" (
        "id", "buyerId", "sellerId", "status", "paymentMethod",
        "paymentStatus", "shippingAddress", "shippingCity",
        "totalAmount", "shippingCost", "notes", "createdAt", "updatedAt"
      ) VALUES (
        '${orderId}',
        '${buyerId}',
        '${sellerId}',
        'pending',
        '${paymentMethod || 'cod'}',
        'unpaid',
        '${(shippingAddress || '').replace(/'/g, "''")}',
        '${(shippingCity || 'Jakarta').replace(/'/g, "''")}',
        ${totalAmount || 0},
        ${shippingCost || 0},
        '${(notes || '').replace(/'/g, "''")}',
        '${now}',
        '${now}'
      )
    `)

    // Create OrderItems using raw SQL
    for (const item of items) {
      const itemId = generateId()
      await db.$executeRawUnsafe(`
        INSERT INTO "OrderItem" (
          "id", "orderId", "productId", "productName", "productImage",
          "price", "quantity", "sellerName", "location"
        ) VALUES (
          '${itemId}',
          '${orderId}',
          ${item.productId || 0},
          '${(item.productName || '').replace(/'/g, "''")}',
          '${(item.productImage || '').replace(/'/g, "''")}',
          ${item.price || 0},
          ${item.quantity || 1},
          '${(item.sellerName || '').replace(/'/g, "''")}',
          '${(item.location || 'Jakarta').replace(/'/g, "''")}'
        )
      `)
    }

    // Create a notification for the seller
    const notificationId = generateId()
    await db.$executeRawUnsafe(`
      INSERT INTO "Notification" (
        "id", "userId", "title", "message", "type", "read", "orderId", "createdAt"
      ) VALUES (
        '${notificationId}',
        '${sellerId}',
        'Pesanan Baru',
        'Anda mendapat pesanan baru dari pembeli. Silakan cek detail pesanan.',
        'order',
        0,
        '${orderId}',
        '${now}'
      )
    `)

    return NextResponse.json({ success: true, orderId })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
