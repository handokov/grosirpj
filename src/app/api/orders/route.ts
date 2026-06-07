import { db } from '@/lib/db';

// GET /api/orders - List orders
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const buyerId = searchParams.get('buyerId');
    const sellerId = searchParams.get('sellerId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};

    if (buyerId) {
      where.buyerId = buyerId;
    }
    if (sellerId) {
      where.sellerId = sellerId;
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
    const body = await request.json();
    const { buyerId, items, shippingAddress, paymentMethod } = body;

    if (!buyerId || !items || !Array.isArray(items) || items.length === 0) {
      return Response.json(
        { error: 'buyerId dan items wajib diisi' },
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

      // Create the order with its items in a transaction
      const order = await db.$transaction(async (tx) => {
        // Decrement stock for each product
        for (const item of sellerItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity },
              sold: { increment: item.quantity },
            },
          });
        }

        // Create order with items
        const newOrder = await tx.order.create({
          data: {
            buyerId,
            sellerId,
            status: 'pending',
            totalAmount,
            shippingAddress: shippingAddress || '',
            paymentMethod: paymentMethod || 'cod',
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

        return newOrder;
      });

      createdOrders.push(order);
    }

    return Response.json({ orders: createdOrders }, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);
    return Response.json(
      { error: 'Gagal membuat pesanan' },
      { status: 500 }
    );
  }
}
