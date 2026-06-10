import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/chat/list?userId=xxx - Get all chats for a user
export async function GET(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Use raw SQL for reliability
    const chatUsers = await db.$queryRawUnsafe(
      `SELECT cu."chatId", c."productId", c."productName", c."updatedAt"
       FROM "ChatUser" cu
       JOIN "Chat" c ON cu."chatId" = c."id"
       WHERE cu."userId" = ?
       ORDER BY c."updatedAt" DESC`,
      userId
    ) as Array<{ chatId: string; productId: number | null; productName: string | null; updatedAt: string }>;

    const chats = [];
    for (const cu of chatUsers) {
      // Get other member
      const otherMembers = await db.$queryRawUnsafe(
        `SELECT u."id", u."name", u."role", u."city"
         FROM "ChatUser" cu2
         JOIN "User" u ON cu2."userId" = u."id"
         WHERE cu2."chatId" = ? AND cu2."userId" != ?`,
        cu.chatId, userId
      ) as Array<{ id: string; name: string; role: string; city: string }>;

      // Get last message
      const lastMessages = await db.$queryRawUnsafe(
        `SELECT "content", "createdAt", "senderId" FROM "Message"
         WHERE "chatId" = ?
         ORDER BY "createdAt" DESC LIMIT 1`,
        cu.chatId
      ) as Array<{ content: string; createdAt: string; senderId: string }>;

      chats.push({
        id: cu.chatId,
        productId: cu.productId,
        productName: cu.productName,
        otherUser: otherMembers[0] || null,
        lastMessage: lastMessages[0] || null,
        updatedAt: cu.updatedAt,
      });
    }

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Chat list error:', error);
    return NextResponse.json({ chats: [] });
  }
}
