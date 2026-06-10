import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyPassword, createSessionToken, getSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
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

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Password salah' },
        { status: 401 }
      );
    }

    // If user has legacy password hash (not bcrypt), force password reset
    if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
      return NextResponse.json(
        { error: 'Password Anda perlu direset untuk keamanan. Silakan hubungi admin atau daftar ulang.' },
        { status: 401 }
      );
    }

    // Create JWT session token
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const userData = {
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
      // Bank details only for seller accounts
      ...(user.role === 'seller' ? {
        bankName: user.bankName,
        bankAccount: user.bankAccount,
        bankHolder: user.bankHolder,
      } : {}),
    };

    const response = NextResponse.json(userData);
    response.headers.set('Set-Cookie', getSessionCookie(token));

    return response;
  } catch (error) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Check for Turso auth error and provide a clear message
    if (message.includes('HTTP status 401') || message.includes('SERVER_ERROR')) {
      return NextResponse.json(
        { error: 'Database connection error. Pastikan TURSO_AUTH_TOKEN sudah diatur di Vercel environment variables. Kunjungi turso.tech/app → database → Settings → Auth Tokens untuk mendapatkan token.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: `Terjadi kesalahan saat login. Silakan coba lagi.` },
      { status: 500 }
    );
  }
}
