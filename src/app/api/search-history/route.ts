import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/search-history?userId=xxx - Get user's search history
export async function GET(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const history = await db.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      distinct: ['query'],
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching search history:', error);
    return NextResponse.json({ error: 'Failed to fetch search history' }, { status: 500 });
  }
}

// POST /api/search-history - Record a search query
export async function POST(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();
    const { userId, query } = body;

    if (!userId || !query) {
      return NextResponse.json({ error: 'userId and query required' }, { status: 400 });
    }

    const entry = await db.searchHistory.create({
      data: { userId, query: query.trim() },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('Error recording search:', error);
    return NextResponse.json({ error: 'Failed to record search' }, { status: 500 });
  }
}

// DELETE /api/search-history?userId=xxx - Clear search history
export async function DELETE(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const id = searchParams.get('id');

    if (id) {
      await db.searchHistory.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    if (userId) {
      await db.searchHistory.deleteMany({ where: { userId } });
      return NextResponse.json({ success: true, cleared: true });
    }

    return NextResponse.json({ error: 'userId or id required' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting search history:', error);
    return NextResponse.json({ error: 'Failed to delete search history' }, { status: 500 });
  }
}
