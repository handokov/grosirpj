import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';

// Simple hash function (must match seed)
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
    // Ensure DB is initialized (creates tables + seeds on Vercel cold starts)
    await ensureDb();

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan password wajib diisi' },
        { status: 400 }
      );
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    const user = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return NextResponse.json(
        { error: 'Email tidak ditemukan' },
        { status: 404 }
      );
    }

    const hashedPassword = simpleHash(password);
    if (user.password !== hashedPassword) {
      return NextResponse.json(
        { error: 'Password salah' },
        { status: 401 }
      );
    }

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
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat login. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
