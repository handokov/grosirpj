import { db, ensureDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/orders - List orders (requires auth, only your own orders)
export async function GET(request: Request) {
  try {
    await ensureDb();
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json(
        { error: 'Anda harus login untuk melihat pesanan' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const buyerId = searchParams.get('buyerId');
    const sellerId = searchParams.get('sellerId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};

    // Only allow filtering by the authenticated user's own orders
    if (sellerId && sellerId === authUser.userId) {
      where.sellerId = sellerId;
    } else if (buyerId && buyerId === authUser.userId) {
      where.buyerId = buyerId;
    } else {
      // If no matching filter, show all orders where user is buyer or seller
      where.OR = [
        { buyerId: authUser.userId },
        { sellerId: authUser.userId },
      ];
    }

    if (status) {
      where.status = status;
    }

    const orders = await db.order.findMany({
      where,
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
            city: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            storeName: true,
            city: true,
            bankName: true,
            bankAccount: true,
            bankHolder: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    return Response.json(
      { error: 'Gagal mengambil data pesanan' },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create new order (checkout)
export async function POST(request: Request) {
  try {
    await ensureDb();

    // Require authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json(
        { error: 'Anda harus login untuk membuat pesanan' },
        { status: 401 }
      );
    }

    // Set buyerId from JWT token (not from request body)
    const buyerId = authUser.userId;

    const body = await request.json();
    const { items, shippingAddress, paymentMethod, shippingCost, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json(
        { error: 'items wajib diisi' },
        { status: 400 }
      );
    }

    // Validate each item and look up product info
    const itemDetails: {
      productId: string;
      productName: string;
      quantity: number;
      price: number;
      sellerId: string;
      location: string;
      variants: Record<string, string>;
    }[] = [];

    for (const item of items) {
      const { productId, quantity, variants } = item;

      if (!productId || !quantity || quantity < 1) {
        return Response.json(
          { error: 'Setiap item harus memiliki productId dan quantity yang valid' },
          { status: 400 }
        );
      }

      const product = await db.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return Response.json(
          { error: `Produk dengan ID ${productId} tidak ditemukan` },
          { status: 404 }
        );
      }

      if (!product.active) {
        return Response.json(
          { error: `Produk "${product.name}" tidak tersedia` },
          { status: 400 }
        );
      }

      if (product.stock < quantity) {
        return Response.json(
          { error: `Stok produk "${product.name}" tidak cukup. Tersedia: ${product.stock}` },
          { status: 400 }
        );
      }

      itemDetails.push({
        productId: product.id,
        productName: product.name,
        quantity,
        price: product.price,
        sellerId: product.sellerId,
        location: product.location,
        variants: variants || {},
      });
    }

    // Group items by sellerId - create separate orders per seller
    const itemsBySeller = new Map<string, typeof itemDetails>();
    for (const detail of itemDetails) {
      const sellerItems = itemsBySeller.get(detail.sellerId) || [];
      sellerItems.push(detail);
      itemsBySeller.set(detail.sellerId, sellerItems);
    }

    const createdOrders = [];

    for (const [sellerId, sellerItems] of itemsBySeller) {
      const totalAmount = sellerItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Calculate shipping cost per seller if provided at top level, otherwise distribute
      let orderShippingCost = 0;
      if (shippingCost && itemsBySeller.size === 1) {
        // Single seller: use the provided shipping cost directly
        orderShippingCost = shippingCost;
      } else if (shippingCost && itemsBySeller.size > 1) {
        // Multiple sellers: distribute shipping cost proportionally
        const sellerTotal = sellerItems.reduce((s, i) => s + i.price * i.quantity, 0);
        const allTotal = itemDetails.reduce((s, i) => s + i.price * i.quantity, 0);
        orderShippingCost = Math.round((sellerTotal / allTotal) * shippingCost);
      }

      // Decrement stock for each product (sequential, not in transaction - Turso/LibSQL doesn't support interactive transactions)
      for (const item of sellerItems) {
        await db.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            sold: { increment: item.quantity },
          },
        });
      }

      // Create order with items
      const newOrder = await db.order.create({
        data: {
          buyerId,
          sellerId,
          status: 'pending',
          totalAmount,
          shippingCost: orderShippingCost,
          shippingAddress: shippingAddress || '',
          paymentMethod: paymentMethod || 'cod',
          notes: notes || '',
          items: {
            create: sellerItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              price: item.price,
              variants: JSON.stringify(item.variants),
            })),
          },
        },
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

      // Create notification for the seller
      try {
        await db.notification.create({
          data: {
            userId: sellerId,
            title: 'Pesanan Baru',
            message: `Anda mendapat pesanan baru dari ${newOrder.buyer.name}. Silakan cek detail pesanan.`,
            type: 'new_order',
            link: `/orders/${newOrder.id}`,
          },
        });
      } catch {
        // Don't fail if notification creation fails
      }

      createdOrders.push(newOrder);
    }

    return Response.json({ orders: createdOrders }, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `Gagal membuat pesanan: ${detail}` },
      { status: 500 }
    );
  }
}
