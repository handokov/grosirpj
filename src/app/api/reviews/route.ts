import { db, ensureDb } from '@/lib/db';

// GET /api/reviews - Get reviews for a product
export async function GET(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return Response.json(
        { error: 'productId wajib diisi' },
        { status: 400 }
      );
    }

    const reviews = await db.review.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ reviews });
  } catch (error) {
    console.error('Get reviews error:', error);
    return Response.json(
      { error: 'Gagal mengambil data ulasan' },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Create a review (only for buyers with delivered order)
export async function POST(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();
    const { productId, userId, rating, comment } = body;

    if (!productId || !userId || !rating) {
      return Response.json(
        { error: 'productId, userId, dan rating wajib diisi' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return Response.json(
        { error: 'Rating harus antara 1 sampai 5' },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return Response.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    // Verify the user has a DELIVERED order containing this product
    const deliveredOrder = await db.order.findFirst({
      where: {
        buyerId: userId,
        status: 'delivered',
        items: {
          some: {
            productId,
          },
        },
      },
    });

    if (!deliveredOrder) {
      return Response.json(
        { error: 'Hanya pembeli yang sudah menerima pesanan yang bisa memberikan ulasan' },
        { status: 403 }
      );
    }

    // Check if user already reviewed this product
    const existingReview = await db.review.findUnique({
      where: {
        productId_userId: {
          productId,
          userId,
        },
      },
    });

    if (existingReview) {
      return Response.json(
        { error: 'Anda sudah memberikan ulasan untuk produk ini' },
        { status: 409 }
      );
    }

    // Create the review
    const review = await db.review.create({
      data: {
        productId,
        userId,
        rating,
        comment: comment || '',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Recalculate product's average rating
    const ratingStats = await db.review.aggregate({
      where: { productId },
      _avg: { rating: true },
    });

    await db.product.update({
      where: { id: productId },
      data: {
        rating: ratingStats._avg.rating ?? 0,
      },
    });

    return Response.json({ review }, { status: 201 });
  } catch (error) {
    console.error('Create review error:', error);
    return Response.json(
      { error: 'Gagal membuat ulasan' },
      { status: 500 }
    );
  }
}
