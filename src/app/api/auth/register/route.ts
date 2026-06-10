import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import { createId } from '@paralleldrive/cuid2';

// Simple hash function (must match seed/login)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();
    const { name, email, password, city, role, phone, storeName, storeDescription, address } = body;

    if (!name || !email || !password || !city) {
      return NextResponse.json(
        { error: 'Nama, email, password, dan kota wajib diisi' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar. Silakan login.' },
        { status: 409 }
      );
    }

    const userRole = role === 'seller' ? 'seller' : 'buyer';

    const user = await db.user.create({
      data: {
        id: createId(),
        name,
        email: normalizedEmail,
        password: simpleHash(password),
        city,
        role: userRole,
        phone: phone || '',
        address: address || '',
        storeName: userRole === 'seller' ? (storeName || name) : null,
        storeDescription: userRole === 'seller' ? (storeDescription || null) : null,
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      city: user.city,
      address: user.address,
      province: user.province,
      postalCode: user.postalCode,
      avatar: user.avatar,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      role: user.role,
      phone: user.phone,
      storeName: user.storeName,
      storeDescription: user.storeDescription,
      storeAvatar: user.storeAvatar,
      bankName: user.bankName,
      bankAccount: user.bankAccount,
      bankHolder: user.bankHolder,
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
