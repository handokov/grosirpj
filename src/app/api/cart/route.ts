import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

// GET /api/cart — Get cart items for authenticated user
export async function GET(request: Request) {
  try {
    await ensureDb();
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = authUser.userId;

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
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, quantity, variants } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    const userId = authUser.userId;
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
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { id, quantity } = body;

    if (!id || quantity === undefined) {
      return NextResponse.json({ error: 'id and quantity required' }, { status: 400 });
    }

    // Verify ownership of the cart item
    const existingItem = await db.cartItem.findUnique({ where: { id } });
    if (!existingItem) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }
    if (existingItem.userId !== authUser.userId) {
      return NextResponse.json({ error: 'You can only modify your own cart items' }, { status: 403 });
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

// DELETE /api/cart?id=xxx (single item) or clear all for authenticated user
export async function DELETE(request: Request) {
  try {
    await ensureDb();
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = authUser.userId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Verify ownership before deleting single item
      const item = await db.cartItem.findUnique({ where: { id } });
      if (!item) {
        return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
      }
      if (item.userId !== authUser.userId) {
        return NextResponse.json({ error: 'You can only delete your own cart items' }, { status: 403 });
      }
      await db.cartItem.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    // Clear all cart items for the authenticated user
    await db.cartItem.deleteMany({ where: { userId } });
    return NextResponse.json({ success: true, cleared: true });
  } catch (error) {
    console.error('Error deleting cart item:', error);
    return NextResponse.json({ error: 'Failed to delete cart item' }, { status: 500 });
  }
}
