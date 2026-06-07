import { db, ensureDb } from '@/lib/db';

// GET /api/wishlist — List user wishlist items
export async function GET(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return Response.json(
        { error: 'UserId wajib diisi' },
        { status: 400 }
      );
    }

    const wishlist = await db.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            originalPrice: true,
            images: true,
            category: true,
            location: true,
            sold: true,
            rating: true,
            seller: {
              select: {
                name: true,
                storeName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = wishlist.map((item) => {
      let images: string[] = [];
      try {
        images = JSON.parse(item.product.images);
      } catch {
        images = [];
      }

      return {
        id: item.id,
        userId: item.userId,
        productId: item.productId,
        createdAt: item.createdAt,
        product: {
          ...item.product,
          images,
        },
      };
    });

    return Response.json({ wishlist: formatted });
  } catch (error) {
    console.error('GET /api/wishlist error:', error);
    return Response.json(
      { error: 'Gagal mengambil data wishlist' },
      { status: 500 }
    );
  }
}

// POST /api/wishlist — Toggle wishlist item (add/remove)
export async function POST(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();
    const { userId, productId } = body;

    if (!userId || !productId) {
      return Response.json(
        { error: 'UserId dan ProductId wajib diisi' },
        { status: 400 }
      );
    }

    // Check if wishlist item already exists
    const existing = await db.wishlist.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (existing) {
      // Remove from wishlist
      await db.wishlist.delete({
        where: { id: existing.id },
      });

      return Response.json({ added: false });
    } else {
      // Add to wishlist
      await db.wishlist.create({
        data: { userId, productId },
      });

      return Response.json({ added: true });
    }
  } catch (error) {
    console.error('POST /api/wishlist error:', error);
    return Response.json(
      { error: 'Gagal mengubah wishlist' },
      { status: 500 }
    );
  }
}
