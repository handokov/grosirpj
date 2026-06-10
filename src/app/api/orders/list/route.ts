import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDb } from '@/lib/db'

interface OrderRow {
  id: string
  buyerId: string
  sellerId: string
  status: string
  paymentMethod: string
  paymentStatus: string
  shippingAddress: string
  shippingCity: string
  totalAmount: number
  shippingCost: number
  notes: string
  expedition: string
  trackingNumber: string
  paidAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  createdAt: string
  updatedAt: string
  buyerName?: string
  sellerName?: string
}

interface OrderItemRow {
  id: string
  orderId: string
  productId: number
  productName: string
  productImage: string
  price: number
  quantity: number
  sellerName: string
  location: string
}

export async function GET(request: NextRequest) {
  try {
    await ensureDb()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const role = searchParams.get('role') || 'buyer'

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId parameter' },
        { status: 400 }
      )
    }

    // Fetch orders based on role
    let orders: OrderRow[]
    if (role === 'seller') {
      orders = await db.$queryRawUnsafe(`
        SELECT o.*, u.name as "buyerName"
        FROM "Order" o
        LEFT JOIN "User" u ON o."buyerId" = u."id"
        WHERE o."sellerId" = '${userId}'
        ORDER BY o."createdAt" DESC
      `) as OrderRow[]
    } else {
      orders = await db.$queryRawUnsafe(`
        SELECT o.*, u.name as "sellerName"
        FROM "Order" o
        LEFT JOIN "User" u ON o."sellerId" = u."id"
        WHERE o."buyerId" = '${userId}'
        ORDER BY o."createdAt" DESC
      `) as OrderRow[]
    }

    // Fetch items for all orders
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db.$queryRawUnsafe(`
          SELECT * FROM "OrderItem"
          WHERE "orderId" = '${order.id}'
        `) as OrderItemRow[]

        return {
          ...order,
          items,
        }
      })
    )

    return NextResponse.json({ success: true, orders: ordersWithItems })
  } catch (error) {
    console.error('Error listing orders:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to list orders' },
      { status: 500 }
    )
  }
}
