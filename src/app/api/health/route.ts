import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const health: Record<string, unknown> = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    env: {
      VERCEL: process.env.VERCEL || 'not set',
      NODE_ENV: process.env.NODE_ENV || 'not set',
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
    },
  };

  try {
    await ensureDb();
    const userCount = await db.user.count();
    const productCount = await db.product.count();

    health.db = 'connected';
    health.users = userCount;
    health.products = productCount;
    health.status = 'healthy';

    // Test login hash
    function simpleHash(str: string): string {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      return Math.abs(hash).toString(36);
    }

    // Check if demo user exists with correct password hash
    const demoBuyer = await db.user.findUnique({ where: { email: 'buyer@grosirpj.id' } });
    if (demoBuyer) {
      health.demoBuyerPassword = demoBuyer.password === simpleHash('password123') ? 'correct' : 'MISMATCH';
    } else {
      health.demoBuyerPassword = 'user not found';
    }

  } catch (error) {
    health.db = 'error';
    health.error = error instanceof Error ? error.message : String(error);
    health.status = 'unhealthy';
  }

  return NextResponse.json(health);
}
