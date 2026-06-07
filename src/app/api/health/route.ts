import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const debug: Record<string, unknown> = {};

  try {
    debug.isOnVercel = !!process.env.VERCEL;
    debug.databaseUrl = process.env.DATABASE_URL || 'not set';

    // Try ensureDb
    try {
      await ensureDb();
      debug.ensureDbResult = 'success';
    } catch (e) {
      debug.ensureDbResult = 'failed: ' + (e instanceof Error ? e.message : String(e));
    }

    // Try counting users
    try {
      const userCount = await db.user.count();
      debug.userCount = userCount;
    } catch (e) {
      debug.userCountError = (e instanceof Error ? e.message : String(e));
    }

    // Try listing tables
    try {
      const tables = await db.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
      debug.tables = tables;
    } catch (e) {
      debug.tablesError = (e instanceof Error ? e.message : String(e));
    }

  } catch (error) {
    debug.fatalError = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(debug, { status: 200 });
}
