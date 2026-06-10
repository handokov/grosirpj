import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const health: Record<string, unknown> = {
    status: 'checking',
    timestamp: new Date().toISOString(),
  };

  try {
    await ensureDb();
    const userCount = await db.user.count();
    const productCount = await db.product.count();

    health.db = 'connected';
    health.users = userCount;
    health.products = productCount;
    health.status = 'healthy';
  } catch (error) {
    health.db = 'error';
    health.error = error instanceof Error ? error.message : String(error);
    health.status = 'unhealthy';
  }

  return NextResponse.json(health);
}
