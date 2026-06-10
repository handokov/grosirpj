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
import {
  Package, MapPin, CreditCard, ChevronDown, ChevronUp, Clock,
  ShoppingBag, Banknote, Star, Shield, Truck, CheckCircle, XCircle,
  Navigation, Copy,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentDialog } from '@/components/payment-dialog';
import { toast } from 'sonner';

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
  paymentProof: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  expedition: string;
  trackingNumber: string;
  notes: string;
  createdAt: string;
  items: OrderItem[];
  seller: { id: string; name: string; storeName?: string; city?: string; bankName?: string; bankAccount?: string; bankHolder?: string };
  buyer: { id: string; name: string; email: string; city?: string };
}

// ESCROW status steps for timeline
const STATUS_STEPS = ['pending', 'paid', 'processing', 'shipped', 'delivered'];
const STEP_LABELS = ['Menunggu Bayar', 'Dibayar', 'Diproses', 'Dikirim', 'Selesai'];

export function OrderHistory() {
  const orderHistoryOpen = useUIStore((s) => s.orderHistoryOpen);
  const closeOrderHistory = useUIStore((s) => s.closeOrderHistory);
  const user = useAuthStore((s) => s.user);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState<string | null>(null);
  const [reviewItem, setReviewItem] = useState<{ orderId: string; productId: string; productName: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Auto-complete shipped orders older than 3 days
      try {
        await fetch('/api/orders/auto-complete', { method: 'POST', credentials: 'include' });
      } catch {
        // Silently fail - auto-complete is not critical
      }

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

  const handleSubmitReview = async () => {
    if (!user || !reviewItem) return;
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: reviewItem.productId,
          userId: user.id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Ulasan berhasil dikirim!');
        setReviewItem(null);
        setReviewRating(5);
        setReviewComment('');
      } else {
        toast.error(data.error || 'Gagal mengirim ulasan');
      }
    } catch {
      toast.error('Gagal mengirim ulasan');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Confirm receipt (buyer confirms → delivered → funds released to seller)
  const handleConfirmReceipt = async (orderId: string) => {
    if (!user) return;
    setConfirmingReceipt(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'delivered' }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Pesanan diterima! Dana Escrow dicairkan ke penjual.');
        fetchOrders();
      } else {
        toast.error(data.error || 'Gagal mengkonfirmasi penerimaan');
      }
    } catch {
      toast.error('Gagal mengkonfirmasi penerimaan');
    } finally {
      setConfirmingReceipt(null);
    }
  };

  // Cancel order
  const handleCancelOrder = async (orderId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Pesanan dibatalkan');
        fetchOrders();
      } else {
        toast.error(data.error || 'Gagal membatalkan pesanan');
      }
    } catch {
      toast.error('Gagal membatalkan pesanan');
    }
  };

  useEffect(() => {
    if (orderHistoryOpen && user) {
      fetchOrders();
    }
  }, [orderHistoryOpen, user, fetchOrders]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleOpenPayment = (order: Order) => {
    setPaymentOrder(order);
    setPaymentDialogOpen(true);
  };

  const handlePaymentConfirmed = () => {
    fetchOrders();
  };

  const getStatusStepIndex = (status: string) => {
    if (status === 'cancelled') return -1;
    return STATUS_STEPS.indexOf(status);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Nomor resi berhasil disalin!');
    }).catch(() => {
      toast.error('Gagal menyalin');
    });
  };

  return (
    <>
      <Sheet open={orderHistoryOpen} onOpenChange={(open) => { if (!open) closeOrderHistory(); }}>
        <SheetContent side="right" className="w-full sm:w-96 md:max-w-lg p-0 flex flex-col gap-0 overflow-hidden">
          <SheetHeader className="p-6 pb-4 border-b border-gray-100">
            <SheetTitle className="text-xl font-display flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-500" /> Pesanan Saya
            </SheetTitle>
            <SheetDescription>Lacak dan kelola pesanan Anda</SheetDescription>
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
                  const isPending = order.status === 'pending';
                  const isPaid = order.status === 'paid';
                  const isShipped = order.status === 'shipped';
                  const isDelivered = order.status === 'delivered';

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
                        <div className="border-t border-gray-100 p-4 space-y-3">
                          {/* Escrow Info */}
                          {(isPaid || order.status === 'processing') && (
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="text-xs text-emerald-700 font-medium">Dana aman di Escrow GrosirPJ</span>
                            </div>
                          )}

                          {/* Status Timeline */}
                          {!isCancelled && (
                            <div className="flex items-center gap-0.5 px-1">
                              {STATUS_STEPS.map((step, idx) => (
                                <div key={step} className="flex items-center flex-1">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
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
                          {!isCancelled && (
                            <div className="flex justify-between px-0">
                              {STEP_LABELS.map((label, idx) => (
                                <span key={label} className={`text-[8px] text-center flex-1 ${idx <= currentStep ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                                  {label}
                                </span>
                              ))}
                            </div>
                          )}
                          {isCancelled && (
                            <div className="bg-red-50 rounded-lg p-3 text-center">
                              <p className="text-sm text-red-600 font-medium">Pesanan Dibatalkan</p>
                            </div>
                          )}

                          {/* Items */}
                          <div className="space-y-1.5">
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

                          {/* Shipping Info for shipped orders */}
                          {(isShipped || isDelivered) && order.expedition && order.trackingNumber && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <Truck className="w-4 h-4 text-purple-600" />
                                  <span className="text-xs font-semibold text-purple-800">{order.expedition}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-purple-600 hover:bg-purple-100 h-6 text-xs"
                                  onClick={() => copyToClipboard(order.trackingNumber)}
                                >
                                  <Copy className="w-3 h-3 mr-1" /> Salin Resi
                                </Button>
                              </div>
                              <p className="text-xs text-purple-700 font-mono">{order.trackingNumber}</p>
                              {order.shippedAt && (
                                <p className="text-[10px] text-purple-500 mt-1">Dikirim: {formatDate(order.shippedAt)}</p>
                              )}
                            </div>
                          )}

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
                                <p className="text-gray-700 text-xs capitalize">
                                  {order.paymentMethod === 'cod' ? 'COD' : order.paymentMethod === 'transfer' ? 'Transfer Bank' : 'E-Wallet'}
                                </p>
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

                          {/* Action Buttons */}

                          {/* Pending: Pay Now or Cancel */}
                          {isPending && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-4"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPayment(order);
                                }}
                              >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Bayar Sekarang
                              </Button>
                              <Button
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50 rounded-xl"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelOrder(order.id);
                                }}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}

                          {/* Shipped: Confirm Receipt */}
                          {isShipped && (
                            <Button
                              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-4 mt-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfirmReceipt(order.id);
                              }}
                              disabled={confirmingReceipt === order.id}
                            >
                              {confirmingReceipt === order.id ? (
                                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Memproses...</>
                              ) : (
                                <><CheckCircle className="w-4 h-4 mr-2" /> Pesanan Diterima</>
                              )}
                            </Button>
                          )}

                          {isShipped && (
                            <p className="text-[10px] text-gray-400 text-center">Klik "Pesanan Diterima" untuk mencairkan dana ke penjual. Pesanan akan selesai otomatis dalam 3 hari.</p>
                          )}

                          {/* Delivered: Review */}
                          {isDelivered && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-xs text-gray-500 mb-2">Bagikan pengalaman Anda:</p>
                              <div className="space-y-1.5">
                                {order.items.map((item) => (
                                  <Button
                                    key={item.id}
                                    variant="outline"
                                    className="w-full justify-start text-sm rounded-xl border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReviewItem({
                                        orderId: order.id,
                                        productId: item.productId,
                                        productName: item.productName,
                                      });
                                      setReviewRating(5);
                                      setReviewComment('');
                                    }}
                                  >
                                    <Star className="w-4 h-4 text-amber-400 mr-2" />
                                    Ulas: {item.productName}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
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

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        order={paymentOrder}
        onPaymentConfirmed={handlePaymentConfirmed}
      />

      {/* Review Dialog */}
      {reviewItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setReviewItem(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Beri Ulasan</h3>
              <p className="text-sm text-gray-500">{reviewItem.productName}</p>
            </div>

            {/* Star Rating */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star className={`w-8 h-8 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-500">{reviewRating}/5</span>
            </div>

            {/* Comment */}
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Bagikan pengalaman Anda tentang produk ini..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 resize-none"
              rows={3}
            />

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setReviewItem(null)}
              >
                Batal
              </Button>
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                onClick={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
