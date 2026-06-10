import { db, ensureDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'shipped', 'cancelled'],
  processing: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

// GET /api/orders/[id] - Get order detail by ID
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            productName: true,
            quantity: true,
            price: true,
            variants: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            address: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            storeName: true,
            phone: true,
            city: true,
            bankName: true,
            bankAccount: true,
            bankHolder: true,
          },
        },
      },
    });

    if (!order) {
      return Response.json(
        { error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    return Response.json({ order });
  } catch (error) {
    console.error('Get order detail error:', error);
    return Response.json(
      { error: 'Gagal mengambil detail pesanan' },
      { status: 500 }
    );
  }
}

// PATCH /api/orders/[id] - Update order status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const { id } = await params;
    const body = await request.json();
    const { status, paymentProof, expedition, trackingNumber } = body;

    if (!status) {
      return Response.json(
        { error: 'Status wajib diisi' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return Response.json(
        { error: `Status tidak valid. Status yang valid: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const currentOrder = await db.order.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true, storeName: true } },
      },
    });

    if (!currentOrder) {
      return Response.json(
        { error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Require authentication via JWT cookie
    let authUser = await getAuthUser(request);

    // Fallback: if no JWT cookie, try userId from body for backward compatibility
    if (!authUser && body.userId) {
      const fallbackUser = await db.user.findUnique({
        where: { id: body.userId },
        select: { id: true, role: true },
      });
      if (fallbackUser) {
        authUser = { userId: fallbackUser.id, email: '', role: fallbackUser.role };
      }
    }

    if (!authUser) {
      return Response.json(
        { error: 'Anda harus login untuk mengubah pesanan' },
        { status: 401 }
      );
    }

    // Verify the user is either the buyer or seller of this order
    const isBuyer = currentOrder.buyerId === authUser.userId;
    const isSeller = currentOrder.sellerId === authUser.userId;
    if (!isBuyer && !isSeller) {
      return Response.json(
        { error: 'Anda tidak berwenang mengubah pesanan ini' },
        { status: 403 }
      );
    }

    // Role-based status transition rules
    // Seller confirms payment receipt (buyer already paid, seller verifies)
    if (status === 'paid' && !isSeller) {
      return Response.json(
        { error: 'Hanya penjual yang dapat mengonfirmasi pembayaran' },
        { status: 403 }
      );
    }
    if (status === 'processing' && !isSeller) {
      return Response.json(
        { error: 'Hanya penjual yang dapat memproses pesanan' },
        { status: 403 }
      );
    }
    if (status === 'shipped' && !isSeller) {
      return Response.json(
        { error: 'Hanya penjual yang dapat mengirim pesanan' },
        { status: 403 }
      );
    }
    if (status === 'delivered' && !isBuyer) {
      return Response.json(
        { error: 'Hanya pembeli yang dapat mengonfirmasi penerimaan' },
        { status: 403 }
      );
    }
    if (status === 'cancelled' && !isBuyer && !isSeller) {
      return Response.json(
        { error: 'Anda tidak berwenang membatalkan pesanan ini' },
        { status: 403 }
      );
    }

    // Check if the transition is valid
    const allowedNextStatuses = VALID_TRANSITIONS[currentOrder.status];
    if (!allowedNextStatuses.includes(status)) {
      return Response.json(
        {
          error: `Tidak dapat mengubah status dari "${currentOrder.status}" ke "${status}". Transisi yang diizinkan: ${allowedNextStatuses.length > 0 ? allowedNextStatuses.join(', ') : 'tidak ada'}`,
        },
        { status: 400 }
      );
    }

    // When shipping, require expedition and tracking number
    if (status === 'shipped') {
      if (!expedition || !trackingNumber) {
        return Response.json(
          { error: 'Ekspedisi dan nomor resi wajib diisi untuk pengiriman' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = { status };
    if (paymentProof) {
      updateData.paymentProof = paymentProof;
    }
    if (status === 'paid') {
      updateData.paidAt = new Date();
    }
    if (status === 'shipped') {
      updateData.expedition = expedition;
      updateData.trackingNumber = trackingNumber;
      updateData.shippedAt = new Date();
    }
    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            city: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            storeName: true,
            city: true,
          },
        },
      },
    });

    // Create notification for the other party
    try {
      const notifyUserId = currentOrder.buyerId === authUser.userId ? currentOrder.sellerId : currentOrder.buyerId;
      let notificationTitle = '';
      let notificationMessage = '';
      let notificationType = 'info';

      switch (status) {
        case 'paid':
          notificationTitle = 'Pembayaran Dikonfirmasi';
          notificationMessage = 'Penjual telah mengonfirmasi pembayaran Anda. Pesanan akan segera diproses.';
          notificationType = 'payment';
          break;
        case 'processing':
          notificationTitle = 'Pesanan Sedang Diproses';
          notificationMessage = 'Penjual sedang memproses pesanan Anda. Barang akan segera dikirim.';
          notificationType = 'order';
          break;
        case 'shipped':
          notificationTitle = `Pesanan Dikirim - ${expedition}`;
          notificationMessage = `Pesanan Anda telah dikirim via ${expedition}. Nomor Resi: ${trackingNumber}. Lacak pesanan Anda di halaman Pesanan Saya.`;
          notificationType = 'shipping';
          break;
        case 'delivered':
          notificationTitle = 'Pesanan Diterima';
          notificationMessage = 'Pembeli telah mengonfirmasi penerimaan pesanan. Terima kasih!';
          notificationType = 'order';
          break;
        case 'cancelled':
          notificationTitle = 'Pesanan Dibatalkan';
          notificationMessage = 'Pesanan telah dibatalkan.';
          notificationType = 'order';
          break;
      }

      if (notificationTitle && notifyUserId) {
        await db.notification.create({
          data: {
            userId: notifyUserId,
            title: notificationTitle,
            message: notificationMessage,
            type: notificationType,
            link: `/orders/${id}`,
          },
        });
      }
    } catch (notifError) {
      // Don't fail the request if notification creation fails
      console.error('Failed to create notification:', notifError);
    }

    return Response.json({ order: updatedOrder });
  } catch (error) {
    console.error('Update order status error:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: 'Gagal memperbarui status pesanan', detail: process.env.NODE_ENV === 'development' ? detail : undefined },
      { status: 500 }
    );
  }
}
