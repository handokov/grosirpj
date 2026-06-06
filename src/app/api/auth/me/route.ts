import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // In a real app, this would check session/JWT
    // For this demo, we'll read userId from query param
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ user: null });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, city: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ user: null });
  }
}
