import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const debug: Record<string, unknown> = {};

  try {
    debug.env = {
      VERCEL: process.env.VERCEL || 'not set',
      DATABASE_URL: process.env.DATABASE_URL || 'not set',
      NODE_ENV: process.env.NODE_ENV || 'not set',
    };

    // Try to ensure tables exist
    debug.beforeEnsureDb = 'starting...';
    await ensureDb();
    debug.afterEnsureDb = 'completed successfully';

    // Try to count users
    const userCount = await db.user.count();
    debug.userCount = userCount;

    // Try a raw query to list tables
    const tables = await db.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    debug.tables = tables;

  } catch (error) {
    debug.error = error instanceof Error ? error.message : String(error);
    debug.errorStack = error instanceof Error ? error.stack : undefined;
  }

  return NextResponse.json(debug, { status: 200 });
}
