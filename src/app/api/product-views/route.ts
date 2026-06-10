import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/product-views?userId=xxx - Get user's viewed products
export async function GET(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const views = await db.productView.findMany({
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
            active: true,
            rating: true,
            sold: true,
            location: true,
            seller: { select: { id: true, name: true, storeName: true } },
          },
        },
      },
      orderBy: { lastViewed: 'desc' },
      take: limit,
    });

    return NextResponse.json({ views });
  } catch (error) {
    console.error('Error fetching product views:', error);
    return NextResponse.json({ error: 'Failed to fetch product views' }, { status: 500 });
  }
}

// POST /api/product-views - Record a product view
export async function POST(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();
    const { userId, productId } = body;

    if (!userId || !productId) {
      return NextResponse.json({ error: 'userId and productId required' }, { status: 400 });
    }

    // Upsert: create or update view count
    const view = await db.productView.upsert({
      where: { userId_productId: { userId, productId } },
      update: {
        viewCount: { increment: 1 },
        lastViewed: new Date(),
      },
      create: {
        userId,
        productId,
        viewCount: 1,
        lastViewed: new Date(),
      },
    });

    return NextResponse.json({ view });
  } catch (error) {
    console.error('Error recording product view:', error);
    return NextResponse.json({ error: 'Failed to record product view' }, { status: 500 });
  }
}
