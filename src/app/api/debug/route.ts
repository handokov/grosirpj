import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const debug: Record<string, unknown> = {};

  try {
    const databaseUrl = process.env.DATABASE_URL || 'not set';
    const isTurso = databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('https://');

    debug.env = {
      VERCEL: process.env.VERCEL || 'not set',
      DATABASE_URL_prefix: databaseUrl.substring(0, 30) + '...',
      NODE_ENV: process.env.NODE_ENV || 'not set',
      TURSO_AUTH_TOKEN_set: !!process.env.TURSO_AUTH_TOKEN,
      isTurso,
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
