import { db, ensureDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/chat/init — Combined chat initialization endpoint
 *
 * Returns everything needed to open the chat panel in ONE request:
 * - conversations list (with unread counts)
 * - messages for a specific partner (if partnerId provided)
 * - auto-marks messages as read (if partnerId provided)
 *
 * This replaces 3-4 separate API calls that were needed before:
 *   GET /api/chat?userId=X (conversations)
 *   GET /api/chat?userId=X&otherUserId=Y (messages)
 *   PATCH /api/chat (mark as read)
 *   GET /api/chat?userId=X (refresh conversations)
 */
export async function POST(request: Request) {
  try {
    await ensureDb();

    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = authUser.userId;
    const body = await request.json().catch(() => ({}));
    const { partnerId } = body;

    // 1. Get all conversations (same logic as GET /api/chat)
    const allChats = await db.chat.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      select: {
        id: true,
        message: true,
        senderId: true,
        receiverId: true,
        createdAt: true,
        read: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const lastMessageByPartner = new Map<string, typeof allChats[0]>();
    const partnerIds = new Set<string>();

    for (const chat of allChats) {
      const pid = chat.senderId === userId ? chat.receiverId : chat.senderId;
      partnerIds.add(pid);
      if (!lastMessageByPartner.has(pid)) {
        lastMessageByPartner.set(pid, chat);
      }
    }

    // 2. Get partner info in one query
    const partners = await db.user.findMany({
      where: { id: { in: Array.from(partnerIds) } },
      select: { id: true, name: true, storeName: true },
    });
    const partnerMap = new Map(partners.map((p) => [p.id, p]));

    // 3. Get unread counts in one query
    const unreadChats = await db.chat.findMany({
      where: {
        receiverId: userId,
        read: false,
        senderId: { in: Array.from(partnerIds) },
      },
      select: { senderId: true },
    });
    const unreadMap = new Map<string, number>();
    for (const uc of unreadChats) {
      unreadMap.set(uc.senderId, (unreadMap.get(uc.senderId) || 0) + 1);
    }

    // 4. Build conversations
    const conversations = [];
    for (const [pid, lastMsg] of lastMessageByPartner) {
      const partner = partnerMap.get(pid);
      if (!partner) continue;
      conversations.push({
        partner,
        lastMessage: {
          id: lastMsg.id,
          message: lastMsg.message,
          senderId: lastMsg.senderId,
          createdAt: lastMsg.createdAt,
          read: lastMsg.read,
        },
        unreadCount: unreadMap.get(pid) || 0,
      });
    }

    // 5. If partnerId provided: get messages AND mark as read
    let messages: any[] = [];
    if (partnerId) {
      // Fetch messages for this partner
      messages = await db.chat.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: partnerId },
            { senderId: partnerId, receiverId: userId },
          ],
        },
        include: {
          sender: { select: { id: true, name: true } },
          receiver: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Mark messages as read (fire and forget - don't block response)
      db.chat.updateMany({
        where: {
          senderId: partnerId,
          receiverId: userId,
          read: false,
        },
        data: { read: true },
      }).catch((err: any) => {
        console.error('Failed to mark as read:', err);
      });

      // Update conversations unread count for this partner
      const conv = conversations.find((c) => c.partner.id === partnerId);
      if (conv) conv.unreadCount = 0;
    }

    // Calculate total unread count
    const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    return Response.json({
      conversations,
      messages,
      totalUnread,
      ...(partnerId ? { partnerId } : {}),
    });
  } catch (error) {
    console.error('Chat init error:', error);
    return Response.json(
      { error: 'Gagal mengambil data chat' },
      { status: 500 }
    );
  }
}
