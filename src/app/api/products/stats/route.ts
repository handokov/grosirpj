import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDb } from '@/lib/db'

// GET: Seller statistics
export async function GET(request: NextRequest) {
  try {
    await ensureDb()

    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId')

    if (!sellerId) {
      return NextResponse.json({ error: 'sellerId is required' }, { status: 400 })
    }

    // Total products
    const totalProductsResult = await db.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "Product" WHERE "sellerId" = ?`,
      sellerId
    ) as Array<{count: bigint | number}>

    // Active products
    const activeProductsResult = await db.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "Product" WHERE "sellerId" = ? AND "status" = 'active'`,
      sellerId
    ) as Array<{count: bigint | number}>

    // Total sold (from Product table)
    const totalSoldResult = await db.$queryRawUnsafe(
      `SELECT COALESCE(SUM("sold"), 0) as total FROM "Product" WHERE "sellerId" = ?`,
      sellerId
    ) as Array<{total: bigint | number}>

    // Orders statistics
    const totalOrdersResult = await db.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "Order" WHERE "sellerId" = ?`,
      sellerId
    ) as Array<{count: bigint | number}>

    // Orders by status
    const pendingOrdersResult = await db.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "Order" WHERE "sellerId" = ? AND "status" = 'pending'`,
      sellerId
    ) as Array<{count: bigint | number}>

    const paidOrdersResult = await db.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "Order" WHERE "sellerId" = ? AND "status" IN ('paid', 'processing')`,
      sellerId
    ) as Array<{count: bigint | number}>

    const shippedOrdersResult = await db.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "Order" WHERE "sellerId" = ? AND "status" = 'shipped'`,
      sellerId
    ) as Array<{count: bigint | number}>

    const deliveredOrdersResult = await db.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "Order" WHERE "sellerId" = ? AND "status" = 'delivered'`,
      sellerId
    ) as Array<{count: bigint | number}>

    // Total revenue (from delivered/paid orders)
    const revenueResult = await db.$queryRawUnsafe(
      `SELECT COALESCE(SUM("totalAmount"), 0) as total FROM "Order" WHERE "sellerId" = ? AND "paymentStatus" = 'paid'`,
      sellerId
    ) as Array<{total: bigint | number}>

    // Revenue this month
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const monthRevenueResult = await db.$queryRawUnsafe(
      `SELECT COALESCE(SUM("totalAmount"), 0) as total FROM "Order" WHERE "sellerId" = ? AND "paymentStatus" = 'paid' AND "createdAt" >= ?`,
      sellerId, monthStart
    ) as Array<{total: bigint | number}>

    // Daily revenue for last 7 days (for chart)
    const dailyRevenue: Array<{date: string; revenue: number; orders: number}> = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 86400000)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)

      const dayResult = await db.$queryRawUnsafe(
        `SELECT COALESCE(SUM("totalAmount"), 0) as total, COUNT(*) as count FROM "Order" WHERE "sellerId" = ? AND "paymentStatus" = 'paid' AND "createdAt" >= ? AND "createdAt" <= ?`,
        sellerId, dayStart.toISOString(), dayEnd.toISOString()
      ) as Array<{total: bigint | number; count: bigint | number}>

      dailyRevenue.push({
        date: dayStart.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
        revenue: Number(dayResult[0]?.total || 0),
        orders: Number(dayResult[0]?.count || 0),
      })
    }

    // Top selling products
    const topProducts = await db.$queryRawUnsafe(
      `SELECT "name", "sold", "price", "images" FROM "Product" WHERE "sellerId" = ? ORDER BY "sold" DESC LIMIT 5`,
      sellerId
    ) as Array<{name: string; sold: number; price: number; images: string}>

    return NextResponse.json({
      success: true,
      stats: {
        totalProducts: Number(totalProductsResult[0]?.count || 0),
        activeProducts: Number(activeProductsResult[0]?.count || 0),
        totalSold: Number(totalSoldResult[0]?.total || 0),
        totalOrders: Number(totalOrdersResult[0]?.count || 0),
        pendingOrders: Number(pendingOrdersResult[0]?.count || 0),
        paidOrders: Number(paidOrdersResult[0]?.count || 0),
        shippedOrders: Number(shippedOrdersResult[0]?.count || 0),
        deliveredOrders: Number(deliveredOrdersResult[0]?.count || 0),
        totalRevenue: Number(revenueResult[0]?.total || 0),
        monthRevenue: Number(monthRevenueResult[0]?.total || 0),
        dailyRevenue,
        topProducts: topProducts.map(p => ({
          name: p.name,
          sold: p.sold,
          price: p.price,
          image: (() => { try { return JSON.parse(p.images)[0] || ''; } catch { return ''; } })(),
        })),
      },
    })
  } catch (error) {
    console.error('Failed to fetch seller stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
