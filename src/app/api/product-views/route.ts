import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

// GET /api/product-views — Get authenticated user's viewed products
export async function GET(request: Request) {
  try {
    await ensureDb();
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = authUser.userId;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

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
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { productId } = body;
    const userId = authUser.userId;

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
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
