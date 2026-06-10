'use client';

import { useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { useNotificationStore } from '@/store/notification';
import { Bell, ShoppingBag, CheckCircle, AlertCircle, Package } from 'lucide-react';

const NOTIF_ICON_MAP: Record<string, React.ElementType> = {
  order: ShoppingBag,
  new_order: ShoppingBag,
  payment: CheckCircle,
  shipping: Package,
  system: AlertCircle,
  default: Bell,
};

export function NotificationPanel() {
  const notifPanelOpen = useUIStore((s) => s.notifPanelOpen);
  const closeNotifPanel = useUIStore((s) => s.closeNotifPanel);

  const user = useAuthStore((s) => s.user);
  const setLoginModalOpen = useAuthStore((s) => s.setLoginModalOpen);

  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  // Fetch notifications when panel opens
  useEffect(() => {
    if (notifPanelOpen && user) {
      fetchNotifications(user.id);
    }
  }, [notifPanelOpen, user, fetchNotifications]);

  const handleNotifClick = (notifId: string, read: boolean, type: string) => {
    if (!read) markAsRead(notifId);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} menit lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay < 7) return `${diffDay} hari lalu`;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <Sheet open={notifPanelOpen} onOpenChange={(open) => { if (!open) closeNotifPanel(); }}>
      <SheetContent side="right" className="w-full sm:w-96 md:max-w-lg p-0 flex flex-col gap-0 overflow-hidden">
        <SheetHeader className="p-4 border-b border-gray-100">
          <SheetTitle className="text-lg font-display flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-500" /> Notifikasi Seller
            {unreadCount > 0 && (
              <span className="min-w-[22px] h-[22px] bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </SheetTitle>
          <SheetDescription>
            Pemberitahuan pesanan dan aktivitas toko
          </SheetDescription>
        </SheetHeader>

        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Bell className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">Login untuk melihat notifikasi</p>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl" onClick={() => setLoginModalOpen(true)}>
              Login Sekarang
            </Button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Mark all as read */}
            {unreadCount > 0 && (
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                <button
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  onClick={() => markAllAsRead(user.id)}
                >
                  Tandai semua dibaca
                </button>
              </div>
            )}

            {/* Notification list */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="font-semibold text-gray-800 mb-1">Belum Ada Notifikasi</h3>
                  <p className="text-sm text-gray-400">Notifikasi pesanan baru akan muncul di sini</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notif) => {
                    const IconComp = NOTIF_ICON_MAP[notif.type] || NOTIF_ICON_MAP.default;
                    const isOrder = notif.type === 'order' || notif.type === 'new_order';
                    return (
                      <button
                        key={notif.id}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-red-50/40' : ''}`}
                        onClick={() => handleNotifClick(notif.id, notif.read, notif.type)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            !notif.read ? 'bg-red-100' : 'bg-gray-100'
                          }`}>
                            <IconComp className={`w-4 h-4 ${!notif.read ? 'text-red-500' : 'text-gray-400'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-800 line-clamp-1">{notif.title}</p>
                              {!notif.read && (
                                <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{formatDate(notif.createdAt)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
