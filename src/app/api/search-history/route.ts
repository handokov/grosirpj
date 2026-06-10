import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

// GET /api/search-history — Get authenticated user's search history
export async function GET(request: Request) {
  try {
    await ensureDb();
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = authUser.userId;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

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
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { query } = body;
    const userId = authUser.userId;

    if (!query) {
      return NextResponse.json({ error: 'query required' }, { status: 400 });
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

// DELETE /api/search-history — Clear authenticated user's search history
export async function DELETE(request: Request) {
  try {
    await ensureDb();
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = authUser.userId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Verify ownership before deleting a single entry
      const entry = await db.searchHistory.findUnique({ where: { id } });
      if (!entry) {
        return NextResponse.json({ error: 'Search history entry not found' }, { status: 404 });
      }
      if (entry.userId !== authUser.userId) {
        return NextResponse.json({ error: 'You can only delete your own search history' }, { status: 403 });
      }
      await db.searchHistory.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    // Clear all search history for the authenticated user
    await db.searchHistory.deleteMany({ where: { userId } });
    return NextResponse.json({ success: true, cleared: true });
  } catch (error) {
    console.error('Error deleting search history:', error);
    return NextResponse.json({ error: 'Failed to delete search history' }, { status: 500 });
  }
}
