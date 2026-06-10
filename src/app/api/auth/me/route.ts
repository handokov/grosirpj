import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await ensureDb();

    // Try JWT cookie first
    const authUser = await getAuthUser(request);
    if (authUser) {
      const user = await db.user.findUnique({
        where: { id: authUser.userId },
        select: { id: true, name: true, email: true, city: true, role: true, phone: true, address: true, province: true, postalCode: true, avatar: true, gender: true, dateOfBirth: true, storeName: true, storeDescription: true, storeAvatar: true, bankName: true, bankAccount: true, bankHolder: true },
      });

      if (!user) {
        return NextResponse.json({ user: null });
      }

      return NextResponse.json({ user });
    }

    // Fallback to query parameter for backward compatibility
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ user: null });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, city: true, role: true, phone: true, address: true, province: true, postalCode: true, avatar: true, gender: true, dateOfBirth: true, storeName: true, storeDescription: true, storeAvatar: true, bankName: true, bankAccount: true, bankHolder: true },
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
