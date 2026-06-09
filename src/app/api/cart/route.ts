import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/cart?userId=xxx
export async function GET(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const cartItems = await db.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            originalPrice: true,
            images: true,
            minOrder: true,
            stock: true,
            active: true,
            seller: { select: { id: true, name: true, storeName: true, city: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ cartItems });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}

// POST /api/cart - Add item to cart
export async function POST(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();
    const { userId, productId, quantity, variants } = body;

    if (!userId || !productId) {
      return NextResponse.json({ error: 'userId and productId required' }, { status: 400 });
    }

    const variantsStr = typeof variants === 'string' ? variants : JSON.stringify(variants || {});

    // Check if item already exists with same variants
    const existing = await db.cartItem.findUnique({
      where: { userId_productId_variants: { userId, productId, variants: variantsStr } },
    });

    if (existing) {
      // Update quantity
      const updated = await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + (quantity || 1) },
      });
      return NextResponse.json({ cartItem: updated });
    }

    const cartItem = await db.cartItem.create({
      data: { userId, productId, quantity: quantity || 1, variants: variantsStr },
    });

    return NextResponse.json({ cartItem }, { status: 201 });
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
  }
}

// PATCH /api/cart - Update cart item quantity
export async function PATCH(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();
    const { id, quantity } = body;

    if (!id || quantity === undefined) {
      return NextResponse.json({ error: 'id and quantity required' }, { status: 400 });
    }

    if (quantity <= 0) {
      await db.cartItem.delete({ where: { id } });
      return NextResponse.json({ success: true, removed: true });
    }

    const updated = await db.cartItem.update({
      where: { id },
      data: { quantity },
    });

    return NextResponse.json({ cartItem: updated });
  } catch (error) {
    console.error('Error updating cart:', error);
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
  }
}

// DELETE /api/cart?id=xxx or /api/cart?userId=xxx (clear all)
export async function DELETE(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (id) {
      await db.cartItem.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    if (userId) {
      await db.cartItem.deleteMany({ where: { userId } });
      return NextResponse.json({ success: true, cleared: true });
    }

    return NextResponse.json({ error: 'id or userId required' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting cart item:', error);
    return NextResponse.json({ error: 'Failed to delete cart item' }, { status: 500 });
  }
}
