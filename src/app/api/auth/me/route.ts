import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Quick JWT check FIRST — if no valid token, skip DB entirely
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { user: null },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Only hit DB if JWT is valid
    await ensureDb();

    const user = await db.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true, name: true, email: true, city: true, role: true, phone: true, address: true, province: true, postalCode: true, avatar: true, gender: true, dateOfBirth: true, storeName: true, storeDescription: true, storeAvatar: true, bankName: true, bankAccount: true, bankHolder: true, sellerBalance: true, totalSales: true },
    });

    if (!user) {
      return NextResponse.json(
        { user: null },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { user },
      {
        headers: {
          // Cache auth result for 30s on CDN, revalidate in background
          // This prevents auth/me from blocking page load on repeat visits
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { user: null },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
