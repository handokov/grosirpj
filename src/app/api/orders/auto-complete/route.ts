import { db, ensureDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { MARKETPLACE_FEE_PERCENT } from '@/lib/constants';

// POST /api/orders/auto-complete - Auto-complete shipped orders older than 3 days
// This endpoint can be called by the buyer when they check their orders,
// or it could be called by a cron job
export async function POST(request: Request) {
  try {
    await ensureDb();

    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json(
        { error: 'Anda harus login' },
        { status: 401 }
      );
    }

    // Find shipped orders that have been shipped for more than 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const shippedOrders = await db.order.findMany({
      where: {
        status: 'shipped',
        shippedAt: {
          lte: threeDaysAgo,
        },
      },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true, storeName: true } },
      },
    });

    if (shippedOrders.length === 0) {
      return Response.json({ message: 'Tidak ada pesanan yang perlu diselesaikan otomatis', completed: 0 });
    }

    let completedCount = 0;

    for (const order of shippedOrders) {
      try {
        // Release escrow funds to seller balance
        const sellerPayout = order.sellerPayout || (order.totalAmount - Math.round(order.totalAmount * (MARKETPLACE_FEE_PERCENT / 100)));

        await db.user.update({
          where: { id: order.sellerId },
          data: {
            sellerBalance: { increment: sellerPayout },
            totalSales: { increment: order.totalAmount },
          },
        });

        // Update order status to delivered
        await db.order.update({
          where: { id: order.id },
          data: {
            status: 'delivered',
            deliveredAt: new Date(),
          },
        });

        // Notify seller
        try {
          await db.notification.create({
            data: {
              userId: order.sellerId,
              title: '✅ Pesanan Selesai Otomatis',
              message: `Pesanan #${order.id.slice(-8)} telah diselesaikan otomatis (3 hari setelah pengiriman). Dana escrow telah dicairkan ke saldo Anda.`,
              type: 'order',
            },
          });
        } catch {
          // Don't fail if notification creation fails
        }

        // Notify buyer
        try {
          await db.notification.create({
            data: {
              userId: order.buyerId,
              title: '✅ Pesanan Selesai Otomatis',
              message: `Pesanan #${order.id.slice(-8)} telah diselesaikan otomatis karena sudah 3 hari sejak pengiriman. Dana telah dicairkan ke penjual.`,
              type: 'order',
            },
          });
        } catch {
          // Don't fail if notification creation fails
        }

        completedCount++;
      } catch (orderError) {
        console.error(`Failed to auto-complete order ${order.id}:`, orderError);
        // Continue with other orders
      }
    }

    return Response.json({
      message: `${completedCount} pesanan diselesaikan otomatis`,
      completed: completedCount,
    });
  } catch (error) {
    console.error('Auto-complete orders error:', error);
    return Response.json(
      { error: 'Gagal memproses auto-complete' },
      { status: 500 }
    );
  }
}
