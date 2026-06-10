import { db, ensureDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { MARKETPLACE_FEE_PERCENT } from '@/lib/constants';

// ===== ESCROW-BASED ORDER FLOW (like Tokopedia/Shopee) =====
// 1. Buyer creates order → pending
// 2. Buyer confirms payment → paid (funds in escrow conceptually)
// 3. Seller processes → processing
// 4. Seller ships with tracking → shipped
// 5. Buyer confirms receipt → delivered (funds released to seller)
// 6. Either party can cancel from pending

// Valid status transitions (escrow model)
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['paid', 'cancelled'],       // Buyer pays, or either cancels
  paid: ['processing', 'shipped', 'cancelled'], // Seller processes/ships, or cancel
  processing: ['shipped'],              // Seller ships
  shipped: ['delivered'],               // Buyer confirms receipt
  delivered: [],                        // Final - funds released to seller
  cancelled: [],                        // Final
};

// GET /api/orders/[id] - Get order detail by ID
export async function GET(
  request: Request,
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

    // Require authentication - only buyer or seller can view order details
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json(
        { error: 'Anda harus login untuk melihat pesanan' },
        { status: 401 }
      );
    }

    const isBuyer = order.buyerId === authUser.userId;
    const isSeller = order.sellerId === authUser.userId;
    if (!isBuyer && !isSeller) {
      return Response.json(
        { error: 'Anda tidak berwenang melihat pesanan ini' },
        { status: 403 }
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

// PATCH /api/orders/[id] - Update order (escrow-based flow)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const { id } = await params;
    const body = await request.json();
    const { status, paymentProof, expedition, trackingNumber } = body;

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
    const authUser = await getAuthUser(request);
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

    // === CASE 1: Buyer confirms payment (status → paid) ===
    // In escrow model, buyer clicks "Saya Sudah Bayar" which:
    // 1. Saves paymentProof
    // 2. Changes status to 'paid' (funds conceptually in escrow)
    // 3. Calculates marketplace fee and seller payout
    if (paymentProof && status === 'paid' && currentOrder.status === 'pending') {
      if (!isBuyer) {
        return Response.json(
          { error: 'Hanya pembeli yang dapat mengkonfirmasi pembayaran' },
          { status: 403 }
        );
      }

      // Calculate marketplace fee and seller payout
      const feeAmount = Math.round(currentOrder.totalAmount * (MARKETPLACE_FEE_PERCENT / 100));
      const sellerPayout = currentOrder.totalAmount - feeAmount;

      // Build update data
      const updateData: Record<string, unknown> = {
        status: 'paid',
        paymentProof,
        paidAt: new Date(),
        marketplaceFee: feeAmount,
        sellerPayout: sellerPayout,
      };

      const updatedOrder = await db.order.update({
        where: { id },
        data: updateData,
        include: {
          items: true,
          buyer: { select: { id: true, name: true, email: true, city: true } },
          seller: { select: { id: true, name: true, storeName: true, city: true } },
        },
      });

      // Notify seller that buyer has paid (escrow: funds received)
      try {
        await db.notification.create({
          data: {
            userId: currentOrder.sellerId,
            title: '💰 Pembayaran Diterima',
            message: `Pembeli ${currentOrder.buyer.name} telah membayar pesanan #${id.slice(-8)}. Dana ditampung di Escrow GrosirPJ. Segera proses pesanan!`,
            type: 'payment',
            link: `/orders/${id}`,
          },
        });
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }

      return Response.json({ order: updatedOrder });
    }

    // === CASE 2: Submit payment proof without status change (legacy support for COD) ===
    if (paymentProof && (!status || status === currentOrder.status)) {
      if (!isBuyer) {
        return Response.json(
          { error: 'Hanya pembeli yang dapat mengirim bukti pembayaran' },
          { status: 403 }
        );
      }
      if (currentOrder.status !== 'pending') {
        return Response.json(
          { error: 'Bukti pembayaran hanya dapat dikirim untuk pesanan yang masih menunggu' },
          { status: 400 }
        );
      }
      if (currentOrder.paymentProof) {
        return Response.json(
          { error: 'Bukti pembayaran sudah pernah dikirim' },
          { status: 400 }
        );
      }

      const updatedOrder = await db.order.update({
        where: { id },
        data: { paymentProof },
        include: {
          items: true,
          buyer: { select: { id: true, name: true, email: true, city: true } },
          seller: { select: { id: true, name: true, storeName: true, city: true } },
        },
      });

      return Response.json({ order: updatedOrder });
    }

    // === CASE 3: Status transitions ===
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

    // Role-based status transition rules (escrow model)
    // Buyer: can set 'paid' (from pending), 'delivered' (from shipped), 'cancelled' (from pending)
    // Seller: can set 'processing' (from paid), 'shipped' (from paid/processing), 'cancelled'
    if (status === 'paid') {
      if (!isBuyer) {
        return Response.json(
          { error: 'Hanya pembeli yang dapat mengkonfirmasi pembayaran' },
          { status: 403 }
        );
      }
    }
    if (status === 'processing') {
      if (!isSeller) {
        return Response.json(
          { error: 'Hanya penjual yang dapat memproses pesanan' },
          { status: 403 }
        );
      }
    }
    if (status === 'shipped') {
      if (!isSeller) {
        return Response.json(
          { error: 'Hanya penjual yang dapat mengirim pesanan' },
          { status: 403 }
        );
      }
    }
    if (status === 'delivered') {
      if (!isBuyer) {
        return Response.json(
          { error: 'Hanya pembeli yang dapat mengonfirmasi penerimaan' },
          { status: 403 }
        );
      }
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

    // When buyer confirms payment (paid), require paymentProof for non-COD
    if (status === 'paid' && !currentOrder.paymentProof && currentOrder.paymentMethod !== 'cod') {
      return Response.json(
        { error: 'Bukti pembayaran belum dikirim. Silakan kirim bukti pembayaran terlebih dahulu.' },
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
    if (status === 'paid' && !currentOrder.paidAt) {
      updateData.paidAt = new Date();
    }
    if (status === 'shipped') {
      updateData.expedition = expedition;
      updateData.trackingNumber = trackingNumber;
      updateData.shippedAt = new Date();
    }
    if (status === 'delivered') {
      updateData.deliveredAt = new Date();

      // Release escrow funds to seller balance
      try {
        const sellerPayout = currentOrder.sellerPayout || (currentOrder.totalAmount - Math.round(currentOrder.totalAmount * (MARKETPLACE_FEE_PERCENT / 100)));
        await db.user.update({
          where: { id: currentOrder.sellerId },
          data: {
            sellerBalance: { increment: sellerPayout },
            totalSales: { increment: currentOrder.totalAmount },
          },
        });
      } catch (balanceError) {
        console.error('Failed to update seller balance:', balanceError);
        // Don't fail the request - order status update is more important
      }
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
          notificationTitle = '💰 Pembayaran Diterima';
          notificationMessage = `Pembeli ${currentOrder.buyer.name} telah membayar pesanan #${id.slice(-8)}. Dana ditampung di Escrow GrosirPJ. Segera proses pesanan!`;
          notificationType = 'payment';
          break;
        case 'processing':
          notificationTitle = '📦 Pesanan Diproses';
          notificationMessage = `Penjual sedang memproses pesanan Anda. Barang akan segera dikirim.`;
          notificationType = 'order';
          break;
        case 'shipped':
          notificationTitle = `🚚 Pesanan Dikirim - ${expedition}`;
          notificationMessage = `Pesanan Anda telah dikirim via ${expedition}. Nomor Resi: ${trackingNumber}. Lacak pesanan Anda di halaman Pesanan Saya.`;
          notificationType = 'shipping';
          break;
        case 'delivered':
          notificationTitle = '✅ Pesanan Selesai';
          notificationMessage = `Pembeli telah mengonfirmasi penerimaan pesanan. Dana escrow akan dicairkan ke saldo Anda. Terima kasih!`;
          notificationType = 'order';
          break;
        case 'cancelled':
          notificationTitle = '❌ Pesanan Dibatalkan';
          notificationMessage = `Pesanan #${id.slice(-8)} telah dibatalkan.`;
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
