import { create } from 'zustand';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string;
  createdAt: string;
}

interface NotificationStore {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async (userId: string) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/notifications?userId=${userId}`);
      if (!res.ok) throw new Error('Gagal mengambil notifikasi');
      const data = await res.json();
      const notifications: NotificationItem[] = data.notifications.map(
        (n: NotificationItem) => ({
          ...n,
          createdAt: String(n.createdAt),
        })
      );
      const unreadCount = notifications.filter((n) => !n.read).length;
      set({ notifications, unreadCount });
    } catch (error) {
      console.error('fetchNotifications error:', error);
    } finally {
      set({ loading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Gagal menandai notifikasi');

      const { notifications } = get();
      const updated = notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const unreadCount = updated.filter((n) => !n.read).length;
      set({ notifications: updated, unreadCount });
    } catch (error) {
      console.error('markAsRead error:', error);
    }
  },

  markAllAsRead: async (userId: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true, userId }),
      });
      if (!res.ok) throw new Error('Gagal menandai semua notifikasi');

      const { notifications } = get();
      const updated = notifications.map((n) => ({ ...n, read: true }));
      set({ notifications: updated, unreadCount: 0 });
    } catch (error) {
      console.error('markAllAsRead error:', error);
    }
  },
}));
