import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  // Require authentication for health details
  const authUser = await getAuthUser(request);

  // Basic health check without auth
  try {
    await ensureDb();
    if (!authUser) {
      return NextResponse.json({ status: 'ok', db: 'connected' });
    }
    // Detailed health with auth
    const userCount = await db.user.count();
    const productCount = await db.product.count();
    return NextResponse.json({
      status: 'healthy',
      db: 'connected',
      users: userCount,
      products: productCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      db: 'error',
      ...(process.env.NODE_ENV === 'development' ? {
        error: error instanceof Error ? error.message : String(error),
      } : {}),
    }, { status: 503 });
  }
}
