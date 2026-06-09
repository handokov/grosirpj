import { db, ensureDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/upgrade-seller
 * Upgrades a buyer account to seller by adding store info.
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDb();
    const body = await request.json();
    const { userId, storeName, storeDescription } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID wajib diisi' }, { status: 400 });
    }

    if (!storeName || !storeName.trim()) {
      return NextResponse.json({ error: 'Nama toko wajib diisi' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    if (user.role === 'seller') {
      return NextResponse.json({ error: 'Akun sudah menjadi seller' }, { status: 400 });
    }

    // Upgrade to seller
    const updated = await db.user.update({
      where: { id: userId },
      data: {
        role: 'seller',
        storeName: storeName.trim(),
        storeDescription: storeDescription?.trim() || null,
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      city: updated.city,
      role: updated.role,
      phone: updated.phone,
      storeName: updated.storeName,
      storeDescription: updated.storeDescription,
    });
  } catch (error) {
    console.error('[upgrade-seller] Error:', error);
    return NextResponse.json(
      { error: 'Gagal upgrade akun. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
