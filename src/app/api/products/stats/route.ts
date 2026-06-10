import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDb } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// GET: Seller statistics (requires auth, only your own stats)
export async function GET(request: NextRequest) {
  try {
    await ensureDb()

    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId')

    if (!sellerId) {
      return NextResponse.json({ error: 'sellerId is required' }, { status: 400 })
    }

    // Only allow viewing your own stats (unless you're just checking your own sellerId)
    if (sellerId !== authUser.userId && authUser.role !== 'seller') {
      return NextResponse.json({ error: 'Anda hanya bisa melihat statistik toko sendiri' }, { status: 403 })
    }

    // Total products
    const totalProducts = await db.product.count({
      where: { sellerId },
    })

    // Active products
    const activeProducts = await db.product.count({
      where: { sellerId, active: true },
    })

    // Total sold (from Product table)
    const soldResult = await db.product.aggregate({
      where: { sellerId },
      _sum: { sold: true },
    })

    // Orders statistics
    const totalOrders = await db.order.count({
      where: { sellerId },
    })

    const pendingOrders = await db.order.count({
      where: { sellerId, status: 'pending' },
    })

    const paidOrders = await db.order.count({
      where: { sellerId, status: { in: ['paid', 'processing'] } },
    })

    const shippedOrders = await db.order.count({
      where: { sellerId, status: 'shipped' },
    })

    const deliveredOrders = await db.order.count({
      where: { sellerId, status: 'delivered' },
    })

    // Total revenue (from orders that have been paid or beyond)
    const paidStatuses = ['paid', 'processing', 'shipped', 'delivered']
    const revenueResult = await db.order.aggregate({
      where: { sellerId, status: { in: paidStatuses } },
      _sum: { totalAmount: true },
    })

    // Revenue this month
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const monthRevenueResult = await db.order.aggregate({
      where: {
        sellerId,
        status: { in: paidStatuses },
        createdAt: { gte: monthStart },
      },
      _sum: { totalAmount: true },
    })

    // Daily revenue for last 7 days (for chart)
    const dailyRevenue: Array<{date: string; revenue: number; orders: number}> = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 86400000)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)

      const dayResult = await db.order.aggregate({
        where: {
          sellerId,
          status: { in: paidStatuses },
          createdAt: { gte: dayStart, lte: dayEnd },
        },
        _sum: { totalAmount: true },
        _count: true,
      })

      dailyRevenue.push({
        date: dayStart.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
        revenue: dayResult._sum.totalAmount || 0,
        orders: dayResult._count,
      })
    }

    // Top selling products
    const topProducts = await db.product.findMany({
      where: { sellerId },
      orderBy: { sold: 'desc' },
      take: 5,
      select: { name: true, sold: true, price: true, images: true },
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalProducts,
        activeProducts,
        totalSold: soldResult._sum.sold || 0,
        totalOrders,
        pendingOrders,
        paidOrders,
        shippedOrders,
        deliveredOrders,
        totalRevenue: revenueResult._sum.totalAmount || 0,
        monthRevenue: monthRevenueResult._sum.totalAmount || 0,
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
