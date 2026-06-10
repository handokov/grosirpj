import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// POST /api/chat/members - Create or get a chat between two users
export async function POST(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();
    const { userId, sellerId, productId, productName } = body;

    if (!userId || !sellerId) {
      return NextResponse.json({ error: 'userId and sellerId required' }, { status: 400 });
    }

    // Find existing chat between these two users using raw SQL
    const existingChats = await db.$queryRawUnsafe(
      `SELECT cu."chatId" FROM "ChatUser" cu
       WHERE cu."userId" = ?
       AND cu."chatId" IN (
         SELECT cu2."chatId" FROM "ChatUser" cu2
         WHERE cu2."userId" = ?
       )
       LIMIT 1`,
      userId, sellerId
    ) as Array<{ chatId: string }>;

    if (existingChats.length > 0) {
      return NextResponse.json({ chatId: existingChats[0].chatId, isNew: false });
    }

    // Create new chat
    const chatId = generateId();
    const now = new Date().toISOString();

    await db.$executeRawUnsafe(
      `INSERT INTO "Chat" ("id", "productId", "productName", "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?)`,
      chatId, productId || null, productName || null, now, now
    );

    // Add both users as members
    await db.$executeRawUnsafe(
      `INSERT INTO "ChatUser" ("id", "chatId", "userId") VALUES (?, ?, ?)`,
      generateId(), chatId, userId
    );
    await db.$executeRawUnsafe(
      `INSERT INTO "ChatUser" ("id", "chatId", "userId") VALUES (?, ?, ?)`,
      generateId(), chatId, sellerId
    );

    return NextResponse.json({ chatId, isNew: true });
  } catch (error) {
    console.error('Chat create error:', error);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}
