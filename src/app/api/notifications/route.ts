import { db, ensureDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/notifications — List notifications for authenticated user
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
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = authUser.userId;
    const body = await request.json();
    const { id, markAllRead } = body;

    if (markAllRead) {
      // Mark all notifications as read for the authenticated user
      await db.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });

      return Response.json({ success: true });
    }

    if (id) {
      // Mark a single notification as read — verify ownership
      const notification = await db.notification.findUnique({ where: { id } });
      if (!notification) {
        return Response.json(
          { error: 'Notifikasi tidak ditemukan' },
          { status: 404 }
        );
      }
      if (notification.userId !== userId) {
        return Response.json(
          { error: 'Anda tidak berwenang mengubah notifikasi ini' },
          { status: 403 }
        );
      }

      await db.notification.update({
        where: { id },
        data: { read: true },
      });

      return Response.json({ success: true });
    }

    return Response.json(
      { error: 'Id atau markAllRead wajib diisi' },
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
