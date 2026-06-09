import { db, ensureDb } from '@/lib/db';

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped'],
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
        items: true,
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
    const { status, paymentProof } = body;

    if (!status) {
      return Response.json(
        { error: 'Status wajib diisi' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return Response.json(
        { error: `Status tidak valid. Status yang valid: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const currentOrder = await db.order.findUnique({
      where: { id },
    });

    if (!currentOrder) {
      return Response.json(
        { error: 'Pesanan tidak ditemukan' },
        { status: 404 }
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

    // Build update data
    const updateData: Record<string, unknown> = { status };
    if (paymentProof) {
      updateData.paymentProof = paymentProof;
    }
    if (status === 'paid') {
      updateData.paidAt = new Date();
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

    return Response.json({ order: updatedOrder });
  } catch (error) {
    console.error('Update order status error:', error);
    return Response.json(
      { error: 'Gagal memperbarui status pesanan' },
      { status: 500 }
    );
  }
}
