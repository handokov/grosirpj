import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyPassword, createSessionToken, getSessionCookie, hashPassword } from '@/lib/auth';

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

    // If user has legacy simpleHash password, upgrade to bcrypt on successful login
    if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
      const newHash = await hashPassword(password);
      await db.user.update({
        where: { id: user.id },
        data: { password: newHash },
      });
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
      bankName: user.bankName,
      bankAccount: user.bankAccount,
      bankHolder: user.bankHolder,
    };

    const response = NextResponse.json(userData);
    response.headers.set('Set-Cookie', getSessionCookie(token));

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat login. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
