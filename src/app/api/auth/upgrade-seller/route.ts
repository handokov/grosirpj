import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/auth/upgrade-seller
 * Upgrades a buyer account to seller by adding store info.
 * Requires authentication via JWT cookie.
 */
export async function POST(request: Request) {
  try {
    await ensureDb();

    // Verify authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Anda harus login terlebih dahulu' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { storeName, storeDescription } = body;

    // Also support userId from body for backward compat, but prefer JWT
    const userId = authUser.userId;

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
      address: updated.address,
      province: updated.province,
      postalCode: updated.postalCode,
      avatar: updated.avatar,
      gender: updated.gender,
      dateOfBirth: updated.dateOfBirth,
      role: updated.role,
      phone: updated.phone,
      storeName: updated.storeName,
      storeDescription: updated.storeDescription,
      storeAvatar: updated.storeAvatar,
      bankName: updated.bankName,
      bankAccount: updated.bankAccount,
      bankHolder: updated.bankHolder,
    });
  } catch (error) {
    console.error('[upgrade-seller] Error:', error);
    return NextResponse.json(
      { error: 'Gagal upgrade akun. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
