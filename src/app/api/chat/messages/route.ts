import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// GET /api/chat/messages?chatId=xxx - Get messages for a chat
export async function GET(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'chatId required' }, { status: 400 });
    }

    // Use raw SQL for reliability
    const messages = await db.$queryRawUnsafe(
      `SELECT "id", "chatId", "senderId", "content", "createdAt"
       FROM "Message"
       WHERE "chatId" = ?
       ORDER BY "createdAt" ASC
       LIMIT 100`,
      chatId
    ) as Array<{ id: string; chatId: string; senderId: string; content: string; createdAt: string }>;

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Chat messages error:', error);
    return NextResponse.json({ messages: [] });
  }
}

// POST /api/chat/messages - Send a message
export async function POST(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();
    const { chatId, senderId, content } = body;

    if (!chatId || !senderId || !content) {
      return NextResponse.json({ error: 'chatId, senderId, and content required' }, { status: 400 });
    }

    const messageId = generateId();
    const now = new Date().toISOString();

    await db.$executeRawUnsafe(
      `INSERT INTO "Message" ("id", "chatId", "senderId", "content", "createdAt")
       VALUES (?, ?, ?, ?, ?)`,
      messageId, chatId, senderId, content.trim(), now
    );

    // Update chat's updatedAt to bump it in the list
    await db.$executeRawUnsafe(
      `UPDATE "Chat" SET "updatedAt" = ? WHERE "id" = ?`,
      now, chatId
    );

    return NextResponse.json({
      message: {
        id: messageId,
        chatId,
        senderId,
        content: content.trim(),
        createdAt: now,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Chat send error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
