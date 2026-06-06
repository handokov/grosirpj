import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { createId } from '@paralleldrive/cuid2';

// Simple hash function (for production, use bcrypt)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, city } = body;

    if (!name || !email || !password || !city) {
      return NextResponse.json(
        { error: 'Nama, email, password, dan kota wajib diisi' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar. Silakan login.' },
        { status: 409 }
      );
    }

    const user = await db.user.create({
      data: {
        id: createId(),
        name,
        email,
        password: simpleHash(password),
        city,
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      city: user.city,
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mendaftar' },
      { status: 500 }
    );
  }
}
