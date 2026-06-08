import { db, ensureDb } from '@/lib/db';

// GET /api/chat - Get messages or conversations
export async function GET(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const otherUserId = searchParams.get('otherUserId');

    if (!userId) {
      return Response.json(
        { error: 'userId wajib diisi' },
        { status: 400 }
      );
    }

    // If both userId and otherUserId provided: return messages between them
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

    // If only userId provided: return list of conversations with last message and unread count
    // Get all chat partners for this user
    const sentChats = await db.chat.findMany({
      where: { senderId: userId },
      select: { receiverId: true },
      distinct: ['receiverId'],
    });

    const receivedChats = await db.chat.findMany({
      where: { receiverId: userId },
      select: { senderId: true },
      distinct: ['senderId'],
    });

    // Combine unique partner IDs
    const partnerIds = new Set<string>();
    for (const chat of sentChats) {
      partnerIds.add(chat.receiverId);
    }
    for (const chat of receivedChats) {
      partnerIds.add(chat.senderId);
    }

    // Build conversations with last message and unread count
    const conversations = [];

    for (const partnerId of partnerIds) {
      // Get the last message between the two users
      const lastMessage = await db.chat.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: partnerId },
            { senderId: partnerId, receiverId: userId },
          ],
        },
        include: {
          sender: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Count unread messages from this partner
      const unreadCount = await db.chat.count({
        where: {
          senderId: partnerId,
          receiverId: userId,
          read: false,
        },
      });

      // Get partner info
      const partner = await db.user.findUnique({
        where: { id: partnerId },
        select: { id: true, name: true, storeName: true },
      });

      if (partner && lastMessage) {
        conversations.push({
          partner,
          lastMessage: {
            id: lastMessage.id,
            message: lastMessage.message,
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt,
            read: lastMessage.read,
          },
          unreadCount,
        });
      }
    }

    // Sort by last message time, most recent first
    conversations.sort((a, b) => {
      const timeA = new Date(a.lastMessage.createdAt).getTime();
      const timeB = new Date(b.lastMessage.createdAt).getTime();
      return timeB - timeA;
    });

    return Response.json({ conversations });
  } catch (error) {
    console.error('Get chat error:', error);
    return Response.json(
      { error: 'Gagal mengambil data chat' },
      { status: 500 }
    );
  }
}

// POST /api/chat - Send a message
export async function POST(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();
    const { senderId, receiverId, message } = body;

    if (!senderId || !receiverId || !message) {
      return Response.json(
        { error: 'senderId, receiverId, dan message wajib diisi' },
        { status: 400 }
      );
    }

    if (senderId === receiverId) {
      return Response.json(
        { error: 'Tidak dapat mengirim pesan ke diri sendiri' },
        { status: 400 }
      );
    }

    // Verify both users exist
    const [sender, receiver] = await Promise.all([
      db.user.findUnique({ where: { id: senderId } }),
      db.user.findUnique({ where: { id: receiverId } }),
    ]);

    if (!sender) {
      return Response.json(
        { error: 'Pengirim tidak ditemukan' },
        { status: 404 }
      );
    }

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
          select: { id: true, name: true },
        },
        receiver: {
          select: { id: true, name: true },
        },
      },
    });

    return Response.json({ message: chat }, { status: 201 });
  } catch (error) {
    console.error('Send chat error:', error);
    return Response.json(
      { error: 'Gagal mengirim pesan' },
      { status: 500 }
    );
  }
}
