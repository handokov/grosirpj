import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDb } from '@/lib/db'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Define allowed status transitions
const ALLOWED_TRANSITIONS: Record<string, { fromStatus: string[]; allowedRole: string }> = {
  paid: {
    fromStatus: ['pending'],
    allowedRole: 'buyer',
  },
  processing: {
    fromStatus: ['paid'],
    allowedRole: 'seller',
  },
  shipped: {
    fromStatus: ['paid', 'processing'],
    allowedRole: 'seller',
  },
  delivered: {
    fromStatus: ['shipped'],
    allowedRole: 'buyer',
  },
  cancelled: {
    fromStatus: ['pending', 'paid'],
    allowedRole: 'buyer',
  },
}

export async function POST(request: NextRequest) {
  try {
    await ensureDb()

    const body = await request.json()
    const { orderId, status, userId, expedition, trackingNumber } = body

    if (!orderId || !status || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: orderId, status, userId' },
        { status: 400 }
      )
    }

    // Validate the target status
    const transition = ALLOWED_TRANSITIONS[status]
    if (!transition) {
      return NextResponse.json(
        { success: false, error: `Invalid status: ${status}. Allowed: paid, processing, shipped, delivered, cancelled` },
        { status: 400 }
      )
    }

    // Fetch the current order
    const orders = await db.$queryRawUnsafe(`
      SELECT * FROM "Order" WHERE "id" = '${orderId}'
    `) as Array<{
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
    }>

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    const order = orders[0]

    // Check if the current status allows this transition
    if (!transition.fromStatus.includes(order.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot change status from '${order.status}' to '${status}'. Allowed from: ${transition.fromStatus.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Determine user's role in this order
    let userRole: string
    if (order.buyerId === userId) {
      userRole = 'buyer'
    } else if (order.sellerId === userId) {
      userRole = 'seller'
    } else {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to update this order' },
        { status: 403 }
      )
    }

    // Check if user role is allowed for this transition
    if (transition.allowedRole !== userRole) {
      return NextResponse.json(
        { success: false, error: `Only ${transition.allowedRole} can set status to '${status}'` },
        { status: 403 }
      )
    }

    // When shipping, require expedition and tracking number
    if (status === 'shipped') {
      if (!expedition || !trackingNumber) {
        return NextResponse.json(
          { success: false, error: 'Expedisi dan nomor resi wajib diisi untuk pengiriman' },
          { status: 400 }
        )
      }
    }

    // Update the order status
    const now = new Date().toISOString()
    const paymentStatus = status === 'paid' ? 'paid' : order.paymentStatus

    let updateQuery: string
    if (status === 'paid') {
      updateQuery = `
        UPDATE "Order"
        SET "status" = '${status}',
            "paymentStatus" = '${paymentStatus}',
            "paidAt" = '${now}',
            "updatedAt" = '${now}'
        WHERE "id" = '${orderId}'
      `
    } else if (status === 'shipped') {
      const safeExpedition = (expedition || '').replace(/'/g, "''")
      const safeTrackingNumber = (trackingNumber || '').replace(/'/g, "''")
      updateQuery = `
        UPDATE "Order"
        SET "status" = '${status}',
            "paymentStatus" = '${paymentStatus}',
            "expedition" = '${safeExpedition}',
            "trackingNumber" = '${safeTrackingNumber}',
            "shippedAt" = '${now}',
            "updatedAt" = '${now}'
        WHERE "id" = '${orderId}'
      `
    } else if (status === 'delivered') {
      updateQuery = `
        UPDATE "Order"
        SET "status" = '${status}',
            "paymentStatus" = '${paymentStatus}',
            "deliveredAt" = '${now}',
            "updatedAt" = '${now}'
        WHERE "id" = '${orderId}'
      `
    } else if (status === 'processing') {
      updateQuery = `
        UPDATE "Order"
        SET "status" = '${status}',
            "updatedAt" = '${now}'
        WHERE "id" = '${orderId}'
      `
    } else {
      updateQuery = `
        UPDATE "Order"
        SET "status" = '${status}',
            "paymentStatus" = '${paymentStatus}',
            "updatedAt" = '${now}'
        WHERE "id" = '${orderId}'
      `
    }

    await db.$executeRawUnsafe(updateQuery)

    // Create notification for the other party
    const notificationId = generateId()
    const notifyUserId = userRole === 'buyer' ? order.sellerId : order.buyerId

    let notificationTitle = ''
    let notificationMessage = ''
    let notificationType = 'info'

    switch (status) {
      case 'paid':
        notificationTitle = 'Pembayaran Diterima'
        notificationMessage = 'Pembayaran untuk pesanan telah dikonfirmasi oleh pembeli. Silakan proses pesanan.'
        notificationType = 'payment'
        break
      case 'processing':
        notificationTitle = 'Pesanan Sedang Diproses'
        notificationMessage = 'Penjual sedang memproses pesanan Anda. Barang akan segera dikirim.'
        notificationType = 'order'
        break
      case 'shipped':
        notificationTitle = `Pesanan Dikirim - ${expedition}`
        notificationMessage = `Pesanan Anda telah dikirim via ${expedition}. Nomor Resi: ${trackingNumber}. Lacak pesanan Anda di halaman Pesanan Saya.`
        notificationType = 'shipping'
        break
      case 'delivered':
        notificationTitle = 'Pesanan Diterima'
        notificationMessage = 'Pembeli telah mengonfirmasi penerimaan pesanan. Terima kasih!'
        notificationType = 'order'
        break
      case 'cancelled':
        notificationTitle = 'Pesanan Dibatalkan'
        notificationMessage = 'Pesanan telah dibatalkan oleh pembeli.'
        notificationType = 'order'
        break
    }

    await db.$executeRawUnsafe(`
      INSERT INTO "Notification" (
        "id", "userId", "title", "message", "type", "read", "orderId", "createdAt"
      ) VALUES (
        '${notificationId}',
        '${notifyUserId}',
        '${notificationTitle.replace(/'/g, "''")}',
        '${notificationMessage.replace(/'/g, "''")}',
        '${notificationType}',
        0,
        '${orderId}',
        '${now}'
      )
    `)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    )
  }
}
