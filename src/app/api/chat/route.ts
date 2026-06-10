import { db, ensureDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/chat - Get messages or conversations for authenticated user
export async function GET(request: Request) {
  try {
    await ensureDb();
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = authUser.userId;
    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get('otherUserId');

    // If otherUserId provided: return messages between them
    if (otherUserId) {
      const messages = await db.chat.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
        include: {
          sender: {
            select: { id: true, name: true },
          },
          receiver: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return Response.json({ messages });
    }

    // Optimized conversations: 4 queries instead of N+1
    // 1. Get all chats involving this user (we'll process in JS to find last message per partner)
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

    if (allChats.length === 0) {
      return Response.json({ conversations: [] });
    }

    // 2. Process in JS: find last message per partner and collect partner IDs
    const lastMessageByPartner = new Map<string, typeof allChats[0]>();
    const partnerIds = new Set<string>();

    for (const chat of allChats) {
      const partnerId = chat.senderId === userId ? chat.receiverId : chat.senderId;
      partnerIds.add(partnerId);

      // First encounter of this partner is the latest message (since ordered by desc)
      if (!lastMessageByPartner.has(partnerId)) {
        lastMessageByPartner.set(partnerId, chat);
      }
    }

    // 3. Get all partner info in one query
    const partners = await db.user.findMany({
      where: { id: { in: Array.from(partnerIds) } },
      select: { id: true, name: true, storeName: true },
    });
    const partnerMap = new Map(partners.map((p) => [p.id, p]));

    // 4. Get unread counts for all partners in one query
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

    // 5. Build conversations
    const conversations = [];
    for (const [partnerId, lastMsg] of lastMessageByPartner) {
      const partner = partnerMap.get(partnerId);
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
        unreadCount: unreadMap.get(partnerId) || 0,
      });
    }

    // Already sorted by createdAt desc (from the query order + Map insertion order)

    return Response.json({ conversations });
  } catch (error) {
    console.error('Get chat error:', error);
    return Response.json(
      { error: 'Gagal mengambil data chat' },
      { status: 500 }
    );
  }
}

// PATCH /api/chat - Mark messages as read
export async function PATCH(request: Request) {
  try {
    await ensureDb();
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { partnerId } = body;

    if (!partnerId) {
      return Response.json(
        { error: 'partnerId wajib diisi' },
        { status: 400 }
      );
    }

    const userId = authUser.userId;

    // Mark all unread messages from partnerId to userId as read
    const result = await db.chat.updateMany({
      where: {
        senderId: partnerId,
        receiverId: userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return Response.json({ markedCount: result.count });
  } catch (error) {
    console.error('Mark as read error:', error);
    return Response.json(
      { error: 'Gagal menandai pesan sebagai dibaca' },
      { status: 500 }
    );
  }
}

// POST /api/chat - Send a message
export async function POST(request: Request) {
  try {
    await ensureDb();
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { receiverId, message } = body;
    const senderId = authUser.userId;

    if (!receiverId || !message) {
      return Response.json(
        { error: 'receiverId dan message wajib diisi' },
        { status: 400 }
      );
    }

    if (senderId === receiverId) {
      return Response.json(
        { error: 'Tidak dapat mengirim pesan ke diri sendiri' },
        { status: 400 }
      );
    }

    // Verify receiver exists
    const receiver = await db.user.findUnique({ where: { id: receiverId } });

    if (!receiver) {
      return Response.json(
        { error: 'Penerima tidak ditemukan' },
        { status: 404 }
      );
    }

    const chat = await db.chat.create({
      data: {
        senderId,
        receiverId,
        message,
        read: false,
      },
      include: {
        sender: {
          select: { id: true, name: true, storeName: true },
        },
        receiver: {
          select: { id: true, name: true },
        },
      },
    });

    // Create notification for the receiver
    try {
      const senderName = chat.sender.storeName || chat.sender.name;
      await db.notification.create({
        data: {
          userId: receiverId,
          title: '💬 Pesan Baru',
          message: `${senderName}: ${message.length > 50 ? message.slice(0, 50) + '...' : message}`,
          type: 'chat',
          link: `/chat/${senderId}`,
        },
      });
    } catch (notifError) {
      console.error('Failed to create chat notification:', notifError);
    }

    return Response.json({ message: chat }, { status: 201 });
  } catch (error) {
    console.error('Send chat error:', error);
    return Response.json(
      { error: 'Gagal mengirim pesan' },
      { status: 500 }
    );
  }
}
