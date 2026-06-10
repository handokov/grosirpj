import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

// GET /api/addresses — Get addresses for authenticated user
export async function GET(request: Request) {
  try {
    await ensureDb();
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = authUser.userId;

    const addresses = await db.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
  }
}

// POST /api/addresses - Create new address
export async function POST(request: Request) {
  try {
    await ensureDb();
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { label, recipient, phone, address, city, province, postalCode, isDefault } = body;
    const userId = authUser.userId;

    if (!recipient || !phone || !address || !city) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await db.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const newAddress = await db.userAddress.create({
      data: { userId, label, recipient, phone, address, city, province: province || '', postalCode: postalCode || '', isDefault: isDefault || false },
    });

    return NextResponse.json({ address: newAddress }, { status: 201 });
  } catch (error) {
    console.error('Error creating address:', error);
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
  }
}

// PATCH /api/addresses - Update address
export async function PATCH(request: Request) {
  try {
    await ensureDb();
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { id, label, recipient, phone, address, city, province, postalCode, isDefault } = body;

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    // Verify the address belongs to the authenticated user
    const existingAddress = await db.userAddress.findUnique({ where: { id } });
    if (!existingAddress) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }
    if (existingAddress.userId !== authUser.userId) {
      return NextResponse.json({ error: 'You can only modify your own addresses' }, { status: 403 });
    }

    const userId = authUser.userId;

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const updated = await db.userAddress.update({
      where: { id },
      data: { label, recipient, phone, address, city, province, postalCode, isDefault },
    });

    return NextResponse.json({ address: updated });
  } catch (error) {
    console.error('Error updating address:', error);
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
  }
}

// DELETE /api/addresses?id=xxx
export async function DELETE(request: Request) {
  try {
    await ensureDb();
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    // Verify the address belongs to the authenticated user before deleting
    const existingAddress = await db.userAddress.findUnique({ where: { id } });
    if (!existingAddress) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }
    if (existingAddress.userId !== authUser.userId) {
      return NextResponse.json({ error: 'You can only delete your own addresses' }, { status: 403 });
    }

    await db.userAddress.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting address:', error);
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}
