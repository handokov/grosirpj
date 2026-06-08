'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { formatPrice, getStatusInfo } from '@/lib/constants';
import { Package, MapPin, CreditCard, ChevronDown, ChevronUp, Clock, ShoppingBag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  variants: string;
}

interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  status: string;
  totalAmount: number;
  shippingCost: number;
  shippingAddress: string;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
  seller: { id: string; name: string; storeName?: string; city?: string };
  buyer: { id: string; name: string; email: string; city?: string };
}

export function OrderHistory() {
  const orderHistoryOpen = useUIStore((s) => s.orderHistoryOpen);
  const closeOrderHistory = useUIStore((s) => s.closeOrderHistory);
  const user = useAuthStore((s) => s.user);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?buyerId=${user.id}`);
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (orderHistoryOpen && user) {
      fetchOrders();
    }
  }, [orderHistoryOpen, user, fetchOrders]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Status timeline steps
  const STATUS_STEPS = ['pending', 'paid', 'shipped', 'delivered'];
  const getStatusStepIndex = (status: string) => STATUS_STEPS.indexOf(status);

  return (
    <Sheet open={orderHistoryOpen} onOpenChange={(open) => { if (!open) closeOrderHistory(); }}>
      <SheetContent side="right" className="w-full sm:w-96 md:max-w-lg p-0 flex flex-col gap-0 overflow-hidden">
        <SheetHeader className="p-6 pb-4 border-b border-gray-100">
          <SheetTitle className="text-xl font-display flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-500" /> Riwayat Pesanan
          </SheetTitle>
          <SheetDescription>Pesanan yang pernah Anda buat</SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : !user ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6">
              <Package className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500">Login untuk melihat pesanan</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6">
              <Package className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="font-semibold text-gray-800 mb-1">Belum Ada Pesanan</h3>
              <p className="text-sm text-gray-400">Mulai belanja untuk membuat pesanan pertama Anda</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {orders.map((order) => {
                const statusInfo = getStatusInfo(order.status);
                const isExpanded = expandedId === order.id;
                const currentStep = getStatusStepIndex(order.status);
                const isCancelled = order.status === 'cancelled';

                return (
                  <div key={order.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                    {/* Order Header */}
                    <button
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-400 font-mono">#{order.id.slice(-8)}</span>
                          <Badge className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
                        <p className="text-sm font-medium text-gray-800 mt-1">{order.items.length} produk · {formatPrice(order.totalAmount)}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-4 space-y-4">
                        {/* Status Timeline */}
                        {!isCancelled && (
                          <div className="flex items-center gap-1 px-2">
                            {STATUS_STEPS.map((step, idx) => (
                              <div key={step} className="flex items-center flex-1">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                  idx <= currentStep ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'
                                }`}>
                                  {idx + 1}
                                </div>
                                {idx < STATUS_STEPS.length - 1 && (
                                  <div className={`flex-1 h-0.5 ${idx < currentStep ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {isCancelled && (
                          <div className="bg-red-50 rounded-lg p-3 text-center">
                            <p className="text-sm text-red-600 font-medium">Pesanan Dibatalkan</p>
                          </div>
                        )}

                        {/* Items */}
                        <div className="space-y-2">
                          {order.items.map((item) => {
                            let variants: Record<string, string> = {};
                            try { variants = JSON.parse(item.variants); } catch {}
                            return (
                              <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                                  {Object.keys(variants).length > 0 && (
                                    <p className="text-xs text-gray-500">
                                      {Object.entries(variants).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-400">{item.quantity} x {formatPrice(item.price)}</p>
                                </div>
                                <span className="text-sm font-medium text-gray-800 ml-2">{formatPrice(item.price * item.quantity)}</span>
                              </div>
                            );
                          })}
                        </div>

                        <Separator />

                        {/* Address & Payment */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-gray-500 text-xs">Alamat</p>
                              <p className="text-gray-700 text-xs">{order.shippingAddress || '-'}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <CreditCard className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-gray-500 text-xs">Pembayaran</p>
                              <p className="text-gray-700 text-xs capitalize">{order.paymentMethod}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-500">Seller: {order.seller?.storeName || order.seller?.name}</span>
                        </div>

                        <div className="flex justify-between items-center text-sm pt-2 border-t">
                          <span className="font-medium text-gray-600">Total Pembayaran</span>
                          <span className="font-bold text-emerald-600">{formatPrice(order.totalAmount)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
