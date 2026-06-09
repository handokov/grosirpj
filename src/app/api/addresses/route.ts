import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/addresses?userId=xxx
export async function GET(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

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
    const body = await request.json();
    const { userId, label, recipient, phone, address, city, province, postalCode, isDefault } = body;

    if (!userId || !recipient || !phone || !address || !city) {
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
    const body = await request.json();
    const { id, userId, label, recipient, phone, address, city, province, postalCode, isDefault } = body;

    if (!id || !userId) {
      return NextResponse.json({ error: 'id and userId required' }, { status: 400 });
    }

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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await db.userAddress.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting address:', error);
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}
