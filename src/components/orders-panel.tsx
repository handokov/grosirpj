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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth';
import { formatPrice } from '@/lib/data';
import {
  Package, Truck, CreditCard, CheckCircle, XCircle,
  Clock, MapPin, ShoppingBag, ChevronDown, ChevronUp,
  Banknote, QrCode, Store, Navigation, Copy, ExternalLink,
  Loader2, Archive
} from 'lucide-react';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  variants: string; // JSON string like '{"Ukuran":"L","Warna":"Merah"}'
}

interface OrderBuyer {
  id: string;
  name: string;
  email: string;
  city: string;
}

interface OrderSeller {
  id: string;
  name: string;
  storeName: string | null;
  city: string;
}

interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  status: string;
  paymentMethod: string;
  shippingAddress: string;
  totalAmount: number;
  shippingCost: number;
  notes: string;
  expedition: string;
  trackingNumber: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  buyer: OrderBuyer;
  seller: OrderSeller;
}

interface OrdersPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'buyer' | 'seller';
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof Package; description: string }> = {
  pending: { label: 'Menunggu Pembayaran', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: Clock, description: 'Menunggu pembayaran dari pembeli' },
  paid: { label: 'Sudah Dibayar', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: CreditCard, description: 'Pembayaran telah dikonfirmasi' },
  processing: { label: 'Sedang Diproses', color: 'text-indigo-700', bgColor: 'bg-indigo-100', icon: Archive, description: 'Penjual sedang memproses pesanan' },
  shipped: { label: 'Dikirim', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Truck, description: 'Pesanan sedang dalam pengiriman' },
  delivered: { label: 'Diterima', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: CheckCircle, description: 'Pesanan telah diterima pembeli' },
  cancelled: { label: 'Dibatalkan', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle, description: 'Pesanan telah dibatalkan' },
};

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Bayar di Tempat (COD)',
  bank_transfer: 'Transfer Bank',
  qris: 'QRIS',
};

const EXPEDITIONS = [
  { id: 'JNE', name: 'JNE', logo: '📦' },
  { id: 'J&T', name: 'J&T Express', logo: '🚀' },
  { id: 'SiCepat', name: 'SiCepat', logo: '⚡' },
  { id: 'POS', name: 'POS Indonesia', logo: '📮' },
  { id: 'TIKI', name: 'TIKI', logo: '✈️' },
  { id: 'AnterAja', name: 'AnterAja', logo: '🚛' },
  { id: 'Ninja', name: 'Ninja Xpress', logo: '🥷' },
  { id: 'Wahana', name: 'Wahana Express', logo: '🏠' },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return formatDate(dateStr) as string;
  } catch {
    return '';
  }
}

// Helper to parse variants JSON string
function parseVariants(variantsStr: string): Record<string, string> {
  try {
    return JSON.parse(variantsStr || '{}');
  } catch {
    return {};
  }
}

// Determine payment status from order status
function getPaymentStatus(status: string): string {
  if (['paid', 'processing', 'shipped', 'delivered'].includes(status)) return 'paid';
  return 'unpaid';
}

export function OrdersPanel({ open, onOpenChange, mode = 'buyer' }: OrdersPanelProps) {
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Shipping dialog state
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [shippingOrderId, setShippingOrderId] = useState<string>('');
  const [selectedExpedition, setSelectedExpedition] = useState('');
  const [inputTrackingNumber, setInputTrackingNumber] = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const param = mode === 'seller' ? 'sellerId' : 'buyerId';
      const res = await fetch(`/api/orders?${param}=${user.id}`);
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, mode]);

  useEffect(() => {
    if (open && user) {
      fetchOrders();
    }
  }, [open, user, fetchOrders]);

  const handleUpdateStatus = async (orderId: string, newStatus: string, extra?: { expedition?: string; trackingNumber?: string }) => {
    if (!user) return;
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          userId: user.id,
          expedition: extra?.expedition,
          trackingNumber: extra?.trackingNumber,
        }),
      });
      const data = await res.json();
      if (res.ok && data.order) {
        toast.success(
          newStatus === 'paid' ? 'Pembayaran berhasil dikonfirmasi!' :
          newStatus === 'processing' ? 'Pesanan sedang diproses!' :
          newStatus === 'shipped' ? 'Pesanan berhasil dikirim!' :
          newStatus === 'delivered' ? 'Pesanan diterima!' :
          'Pesanan dibatalkan'
        );
        await fetchOrders();
      } else {
        toast.error(data.error || 'Gagal mengubah status');
      }
    } catch {
      toast.error('Gagal mengubah status');
    } finally {
      setUpdating(null);
    }
  };

  // Handle shipping with expedition and tracking number
  const handleShipOrder = () => {
    if (!selectedExpedition) {
      toast.error('Pilih ekspedisi terlebih dahulu');
      return;
    }
    if (!inputTrackingNumber.trim()) {
      toast.error('Masukkan nomor resi pengiriman');
      return;
    }
    setShippingLoading(true);
    handleUpdateStatus(shippingOrderId, 'shipped', {
      expedition: selectedExpedition,
      trackingNumber: inputTrackingNumber.trim(),
    }).finally(() => {
      setShippingLoading(false);
      setShippingDialogOpen(false);
      setSelectedExpedition('');
      setInputTrackingNumber('');
    });
  };

  // Handle payment confirmation
  const handleConfirmPayment = () => {
    setPaymentLoading(true);
    handleUpdateStatus(paymentOrderId, 'paid').finally(() => {
      setPaymentLoading(false);
      setPaymentDialogOpen(false);
    });
  };

  // Generate a simulated tracking number
  const generateTrackingNumber = () => {
    const prefix = selectedExpedition ? selectedExpedition.substring(0, 3).toUpperCase() : 'TRK';
    const num = Math.random().toString().substring(2, 16).toUpperCase();
    setInputTrackingNumber(`${prefix}${num}`);
  };

  const openShippingDialog = (orderId: string) => {
    setShippingOrderId(orderId);
    setSelectedExpedition('');
    setInputTrackingNumber('');
    setShippingDialogOpen(true);
  };

  const openPaymentDialog = (orderId: string, method: string) => {
    setPaymentOrderId(orderId);
    setPaymentMethod(method);
    setPaymentDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Nomor resi berhasil disalin!');
    }).catch(() => {
      toast.error('Gagal menyalin');
    });
  };

  const getActionButtons = (order: Order) => {
    const buttons: React.ReactNode[] = [];
    const isUpdating = updating === order.id;

    if (mode === 'buyer') {
      // Buyer actions
      if (order.status === 'pending') {
        buttons.push(
          <Button
            key="pay"
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl"
            onClick={() => openPaymentDialog(order.id, order.paymentMethod)}
            disabled={isUpdating}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {isUpdating ? 'Memproses...' : 'Bayar Sekarang'}
          </Button>
        );
        buttons.push(
          <Button
            key="cancel"
            variant="outline"
            className="flex-1 border-red-300 text-red-600 hover:bg-red-50 rounded-xl"
            onClick={() => handleUpdateStatus(order.id, 'cancelled')}
            disabled={isUpdating}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Batalkan
          </Button>
        );
      } else if (order.status === 'shipped') {
        buttons.push(
          <Button
            key="receive"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl"
            onClick={() => handleUpdateStatus(order.id, 'delivered')}
            disabled={isUpdating}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {isUpdating ? 'Memproses...' : 'Konfirmasi Diterima'}
          </Button>
        );
      }
    } else {
      // Seller actions
      if (order.status === 'paid') {
        buttons.push(
          <Button
            key="process"
            className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl"
            onClick={() => handleUpdateStatus(order.id, 'processing')}
            disabled={isUpdating}
          >
            <Archive className="w-4 h-4 mr-2" />
            {isUpdating ? 'Memproses...' : 'Proses Pesanan'}
          </Button>
        );
      }
      if (order.status === 'paid' || order.status === 'processing') {
        buttons.push(
          <Button
            key="ship"
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl"
            onClick={() => openShippingDialog(order.id)}
            disabled={isUpdating}
          >
            <Truck className="w-4 h-4 mr-2" />
            Kirim Pesanan
          </Button>
        );
      }
    }

    return buttons;
  };

  // Render tracking timeline
  const renderTimeline = (order: Order) => {
    const steps = [
      {
        status: 'pending',
        label: 'Pesanan Dibuat',
        icon: ShoppingBag,
        time: order.createdAt,
        detail: 'Pesanan berhasil dibuat',
      },
      {
        status: 'paid',
        label: 'Pembayaran Dikonfirmasi',
        icon: CreditCard,
        time: order.paidAt,
        detail: order.paymentMethod === 'cod'
          ? 'Pembayaran akan dilakukan saat barang diterima (COD)'
          : `Pembayaran via ${PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod} berhasil`,
      },
      {
        status: 'processing',
        label: 'Sedang Diproses',
        icon: Archive,
        time: order.paidAt, // Approximation - processing starts after payment
        detail: 'Penjual sedang menyiapkan pesanan Anda',
      },
      {
        status: 'shipped',
        label: 'Dikirim',
        icon: Truck,
        time: order.shippedAt,
        detail: order.expedition
          ? `Via ${order.expedition} - Resi: ${order.trackingNumber}`
          : 'Pesanan sedang dikirim',
      },
      {
        status: 'delivered',
        label: 'Diterima',
        icon: CheckCircle,
        time: order.deliveredAt,
        detail: 'Pesanan telah diterima oleh pembeli',
      },
    ];

    const statusOrder = ['pending', 'paid', 'processing', 'shipped', 'delivered'];
    const currentIdx = statusOrder.indexOf(order.status);
    const isCancelled = order.status === 'cancelled';

    return (
      <div className="space-y-0">
        {steps.map((step, idx) => {
          const isCompleted = !isCancelled && idx <= currentIdx;
          const isCurrent = !isCancelled && idx === currentIdx;
          const isFuture = !isCancelled && idx > currentIdx;
          const StepIcon = step.icon;

          // For cancelled orders, only show the first step as completed
          const showCompleted = isCancelled ? idx === 0 : isCompleted;
          const showCurrent = isCancelled ? idx === 0 : isCurrent;

          return (
            <div key={step.status} className="flex gap-3">
              {/* Timeline line and dot */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  showCompleted
                    ? 'bg-emerald-500'
                    : showCurrent
                    ? 'bg-emerald-100 ring-2 ring-emerald-500'
                    : 'bg-gray-100'
                }`}>
                  <StepIcon className={`w-4 h-4 ${
                    showCompleted ? 'text-white'
                      : showCurrent ? 'text-emerald-600'
                      : 'text-gray-400'
                  }`} />
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-[32px] ${
                    showCompleted && !isFuture ? 'bg-emerald-300' : 'bg-gray-200'
                  }`} />
                )}
              </div>

              {/* Content */}
              <div className="pb-4 flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  showCompleted ? 'text-emerald-700'
                    : showCurrent ? 'text-emerald-700'
                    : 'text-gray-400'
                }`}>
                  {step.label}
                  {showCurrent && (
                    <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      Sekarang
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>
                {step.time && showCompleted && (
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(step.time)}</p>
                )}
              </div>
            </div>
          );
        })}

        {/* Cancelled status */}
        {isCancelled && (
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                <XCircle className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="pb-4">
              <p className="text-sm font-medium text-red-700">Pesanan Dibatalkan</p>
              <p className="text-xs text-gray-500 mt-0.5">Pesanan ini telah dibatalkan</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Get buyer name from order
  const getBuyerName = (order: Order): string => order.buyer?.name || '-';
  // Get seller name from order
  const getSellerName = (order: Order): string => order.seller?.storeName || order.seller?.name || '-';
  // Get city from order (buyer's city)
  const getShippingCity = (order: Order): string => order.buyer?.city || 'Jakarta';

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col gap-0 overflow-hidden">
          <SheetHeader className="p-4 border-b shrink-0">
            <SheetTitle className="text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              <div className="flex items-center gap-2">
                {mode === 'buyer' ? (
                  <ShoppingBag className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Store className="w-5 h-5 text-emerald-500" />
                )}
                {mode === 'buyer' ? 'Pesanan Saya' : 'Pesanan Masuk'}
              </div>
            </SheetTitle>
            <SheetDescription>
              {mode === 'buyer' ? 'Lacak dan kelola pesanan Anda' : 'Kelola pesanan dari buyer'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                <Package className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">Belum ada pesanan</p>
                <p className="text-sm text-gray-400 mt-1">
                  {mode === 'buyer' ? 'Mulai belanja untuk membuat pesanan' : 'Pesanan dari buyer akan muncul di sini'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {orders.map((order) => {
                  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  const isExpanded = expandedOrder === order.id;
                  const paymentStatus = getPaymentStatus(order.status);

                  return (
                    <div key={order.id} className="p-4">
                      {/* Order Header */}
                      <button
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">#{order.id.slice(-6).toUpperCase()}</span>
                            <Badge className={`${statusConfig.bgColor} ${statusConfig.color} text-xs border-0`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs">{formatTimeAgo(order.createdAt)}</span>
                          <span className="text-gray-300">|</span>
                          <span className="text-xs">{order.items?.length || 0} item</span>
                        </div>
                        {!isExpanded && order.items && order.items.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm text-gray-700 truncate">{order.items[0].productName}</span>
                            {order.items.length > 1 && (
                              <span className="text-xs text-gray-400">+{order.items.length - 1} lainnya</span>
                            )}
                          </div>
                        )}
                        {!isExpanded && (
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-semibold text-emerald-600">{formatPrice(order.totalAmount)}</span>
                            {order.expedition && order.trackingNumber && (
                              <span className="text-xs text-purple-600 flex items-center gap-1">
                                <Navigation className="w-3 h-3" />
                                {order.expedition}: {order.trackingNumber}
                              </span>
                            )}
                          </div>
                        )}
                      </button>

                      {/* Expanded Order Details */}
                      {isExpanded && (
                        <div className="mt-4 space-y-4">
                          {/* Tracking Banner for shipped orders */}
                          {(order.status === 'shipped' || order.status === 'delivered') && order.expedition && order.trackingNumber && (
                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                  <Truck className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-purple-800">Informasi Pengiriman</p>
                                  <p className="text-xs text-purple-600">Ekspedisi: {order.expedition}</p>
                                </div>
                              </div>
                              <div className="bg-white rounded-lg p-3 flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-gray-500">Nomor Resi</p>
                                  <p className="text-sm font-bold text-gray-900 tracking-wider">{order.trackingNumber}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-purple-600 hover:bg-purple-50 h-8"
                                    onClick={() => copyToClipboard(order.trackingNumber)}
                                  >
                                    <Copy className="w-4 h-4 mr-1" />
                                    Salin
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Items */}
                          <div className="space-y-3">
                            {order.items?.map((item) => {
                              const variants = parseVariants(item.variants);
                              const variantText = Object.entries(variants).length > 0
                                ? Object.entries(variants).map(([k, v]) => `${k}: ${v}`).join(', ')
                                : null;

                              return (
                                <div key={item.id} className="flex gap-3">
                                  <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                    <Package className="w-6 h-6 text-gray-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                                    <p className="text-xs text-gray-500">{item.quantity} x {formatPrice(item.price)}</p>
                                    {variantText && (
                                      <p className="text-xs text-gray-400">{variantText}</p>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium text-gray-700">{formatPrice(item.price * item.quantity)}</p>
                                </div>
                              );
                            })}
                          </div>

                          <Separator />

                          {/* Payment & Shipping Details */}
                          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Metode Pembayaran</span>
                              <span className="text-gray-700 flex items-center gap-1">
                                {order.paymentMethod === 'cod' ? <Banknote className="w-3 h-3" /> :
                                 order.paymentMethod === 'qris' ? <QrCode className="w-3 h-3" /> :
                                 <CreditCard className="w-3 h-3" />}
                                {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Status Pembayaran</span>
                              <Badge variant={paymentStatus === 'paid' ? 'default' : 'secondary'} className={`text-xs ${paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} border-0`}>
                                {paymentStatus === 'paid' ? '✓ Dibayar' : 'Menunggu'}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Alamat</span>
                              <span className="text-gray-700 text-right text-xs max-w-[200px] truncate">{order.shippingAddress}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Kota</span>
                              <span className="text-gray-700 flex items-center gap-1"><MapPin className="w-3 h-3" />{getShippingCity(order)}</span>
                            </div>
                            {order.notes && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Catatan</span>
                                <span className="text-gray-700 text-xs">{order.notes}</span>
                              </div>
                            )}
                            {mode === 'seller' && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Pembeli</span>
                                <span className="text-gray-700">{getBuyerName(order)}</span>
                              </div>
                            )}
                            {mode === 'buyer' && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Penjual</span>
                                <span className="text-gray-700">{getSellerName(order)}</span>
                              </div>
                            )}
                          </div>

                          {/* Totals */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Subtotal</span>
                              <span className="text-gray-700">{formatPrice(order.totalAmount - order.shippingCost)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Ongkir</span>
                              <span className={order.shippingCost === 0 ? 'text-emerald-600' : 'text-gray-700'}>
                                {order.shippingCost === 0 ? 'Gratis' : formatPrice(order.shippingCost)}
                              </span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-900">Total</span>
                              <span className="text-lg font-bold text-emerald-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                {formatPrice(order.totalAmount)}
                              </span>
                            </div>
                          </div>

                          <Separator />

                          {/* Tracking Timeline */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <Navigation className="w-4 h-4 text-emerald-500" />
                              Lacak Pesanan
                            </h4>
                            {renderTimeline(order)}
                          </div>

                          {/* Action Buttons */}
                          {getActionButtons(order).length > 0 && (
                            <div className="flex gap-2">
                              {getActionButtons(order)}
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

      {/* ===== SHIPPING DIALOG (Seller) ===== */}
      <Dialog open={shippingDialogOpen} onOpenChange={setShippingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-500" />
              Kirim Pesanan
            </DialogTitle>
            <DialogDescription>
              Pilih ekspedisi dan masukkan nomor resi untuk mengirim pesanan ini
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Expedition Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Pilih Ekspedisi *</Label>
              <div className="grid grid-cols-2 gap-2">
                {EXPEDITIONS.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => setSelectedExpedition(exp.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                      selectedExpedition === exp.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-lg">{exp.logo}</span>
                    <span className="text-sm font-medium text-gray-700">{exp.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tracking Number Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Nomor Resi *</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-emerald-600 h-7"
                  onClick={generateTrackingNumber}
                >
                  Auto Generate
                </Button>
              </div>
              <Input
                placeholder="Masukkan nomor resi pengiriman..."
                value={inputTrackingNumber}
                onChange={(e) => setInputTrackingNumber(e.target.value)}
                className="rounded-xl tracking-wider font-mono"
              />
              <p className="text-xs text-gray-400">
                Nomor resi akan ditampilkan ke pembeli untuk melacak pesanan
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShippingDialogOpen(false)}
              className="rounded-xl"
            >
              Batal
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
              onClick={handleShipOrder}
              disabled={shippingLoading || !selectedExpedition || !inputTrackingNumber.trim()}
            >
              {shippingLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4 mr-2" />
                  Kirim Pesanan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== PAYMENT DIALOG (Buyer) ===== */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-500" />
              Konfirmasi Pembayaran
            </DialogTitle>
            <DialogDescription>
              {paymentMethod === 'cod'
                ? 'Konfirmasi bahwa Anda akan membayar saat barang diterima'
                : paymentMethod === 'bank_transfer'
                ? 'Transfer ke rekening berikut, lalu konfirmasi pembayaran'
                : 'Scan QR code berikut, lalu konfirmasi pembayaran'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {paymentMethod === 'cod' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <Banknote className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-semibold text-emerald-800 mb-1">Bayar di Tempat (COD)</p>
                <p className="text-xs text-emerald-600">
                  Anda akan membayar saat kurir mengantarkan barang ke alamat Anda. Pastikan Anda menyiapkan uang pas.
                </p>
              </div>
            ) : paymentMethod === 'bank_transfer' ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <CreditCard className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                <p className="text-sm font-semibold text-blue-800 mb-3 text-center">Transfer Bank</p>
                <div className="space-y-2">
                  {[
                    { bank: 'BCA', number: '1234567890', name: 'GrosirPJ Indonesia' },
                    { bank: 'Mandiri', number: '0987654321', name: 'GrosirPJ Indonesia' },
                    { bank: 'BNI', number: '1122334455', name: 'GrosirPJ Indonesia' },
                    { bank: 'BRI', number: '5566778899', name: 'GrosirPJ Indonesia' },
                  ].map((acc) => (
                    <div key={acc.bank} className="bg-white rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">{acc.bank}</p>
                        <p className="text-sm font-mono font-bold text-gray-900">{acc.number}</p>
                        <p className="text-xs text-gray-400">a.n. {acc.name}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 h-8"
                        onClick={() => copyToClipboard(acc.number)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                <QrCode className="w-24 h-24 text-purple-500 mx-auto mb-3" />
                <p className="text-sm font-semibold text-purple-800 mb-1">Scan QRIS</p>
                <p className="text-xs text-purple-600 mb-2">
                  Gunakan GoPay, OVO, DANA, ShopeePay, atau e-wallet lainnya
                </p>
                <div className="bg-white rounded-lg p-3 inline-block">
                  <div className="w-40 h-40 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <QrCode className="w-16 h-16 text-gray-300 mx-auto" />
                      <p className="text-xs text-gray-400 mt-1">QR Code Simulasi</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                ⚠️ Ini adalah simulasi pembayaran. Klik &quot;Konfirmasi Pembayaran&quot; untuk melanjutkan ke tahap berikutnya.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              className="rounded-xl"
            >
              Batal
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
              onClick={handleConfirmPayment}
              disabled={paymentLoading}
            >
              {paymentLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Konfirmasi Pembayaran
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
