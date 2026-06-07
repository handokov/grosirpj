import { db, ensureDb } from '@/lib/db';

// GET /api/notifications — List notifications for a user
export async function GET(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return Response.json(
        { error: 'UserId wajib diisi' },
        { status: 400 }
      );
    }

    const notifications = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
      read: n.read,
      link: n.link,
      createdAt: n.createdAt,
    }));

    return Response.json({ notifications: formatted });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return Response.json(
      { error: 'Gagal mengambil notifikasi' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications — Mark notification(s) as read
export async function PATCH(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();
    const { id, markAllRead, userId } = body;

    if (markAllRead && userId) {
      // Mark all notifications as read for a user
      await db.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });

      return Response.json({ success: true });
    }

    if (id) {
      // Mark a single notification as read
      await db.notification.update({
        where: { id },
        data: { read: true },
      });

      return Response.json({ success: true });
    }

    return Response.json(
      { error: 'Id atau markAllRead + userId wajib diisi' },
      { status: 400 }
    );
  } catch (error) {
    console.error('PATCH /api/notifications error:', error);
    return Response.json(
      { error: 'Gagal mengubah notifikasi' },
      { status: 500 }
    );
  }
}
