'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { formatPrice } from '@/lib/data';
import { calculateShipping } from '@/lib/shipping';
import {
  CreditCard, Truck, MapPin, Banknote, QrCode, Package,
  CheckCircle, ChevronLeft, ShoppingBag, Wallet
} from 'lucide-react';
import { toast } from 'sonner';

interface CheckoutItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  location: string;
  seller: string;
  sellerId?: string;
  selectedVariants?: Record<string, string>;
}

interface CheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items?: CheckoutItem[];
  singleProduct?: boolean;
  onSuccess?: (orderId: string) => void;
}

const PAYMENT_METHODS = [
  {
    id: 'cod',
    name: 'Bayar di Tempat (COD)',
    description: 'Bayar saat barang diterima',
    icon: Banknote,
    color: 'from-emerald-500 to-emerald-600',
    details: 'Pembayaran dilakukan saat kurir mengantar barang ke alamat Anda.',
  },
  {
    id: 'bank_transfer',
    name: 'Transfer Bank',
    description: 'BCA / Mandiri / BNI / BRI',
    icon: CreditCard,
    color: 'from-blue-500 to-blue-600',
    details: 'Transfer ke rekening: BCA 1234567890 a.n. GrosirPJ Indonesia',
  },
  {
    id: 'qris',
    name: 'QRIS',
    description: 'Scan QR dari e-wallet manapun',
    icon: QrCode,
    color: 'from-purple-500 to-purple-600',
    details: 'Scan QR code menggunakan GoPay, OVO, DANA, ShopeePay, atau e-wallet lainnya.',
  },
];

export function Checkout({ open, onOpenChange, items: propItems, singleProduct, onSuccess }: CheckoutProps) {
  const [step, setStep] = useState<'payment' | 'confirm' | 'success'>('payment');
  const [selectedPayment, setSelectedPayment] = useState('cod');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdOrderIds, setCreatedOrderIds] = useState<string[]>([]);

  const user = useAuthStore((s) => s.user);
  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  // Use prop items or cart items
  const checkoutItems = propItems || cartItems.map(item => ({
    productId: item.productId,
    name: item.name,
    price: item.price,
    image: item.image,
    quantity: item.quantity,
    location: item.location || 'Jakarta',
    seller: item.sellerName || 'Toko Official',
    sellerId: item.sellerId || undefined,
    selectedVariants: item.selectedVariants || {},
  }));

  const subtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalShipping = user ? checkoutItems.reduce((sum, item) => {
    const s = calculateShipping(item.location, user.city);
    return sum + s.cost;
  }, 0) : 0;
  const totalAmount = subtotal + totalShipping;

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error('Silakan login terlebih dahulu');
      return;
    }
    if (!address.trim()) {
      toast.error('Mohon isi alamat pengiriman');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId: user.id,
          items: checkoutItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            variants: item.selectedVariants || {},
          })),
          paymentMethod: selectedPayment,
          shippingAddress: address,
          shippingCost: totalShipping,
          notes: notes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.orders) {
        const orderIds = data.orders.map((o: { id: string }) => o.id);
        setCreatedOrderIds(orderIds);
        setStep('success');
        if (!propItems) clearCart();
        if (onSuccess && orderIds.length > 0) onSuccess(orderIds[0]);
        toast.success(orderIds.length > 1
          ? `${orderIds.length} pesanan berhasil dibuat!`
          : 'Pesanan berhasil dibuat!'
        );
      } else {
        toast.error(data.error || 'Gagal membuat pesanan');
      }
    } catch {
      toast.error('Gagal membuat pesanan');
    } finally {
      setLoading(false);
    }
  };

  const resetCheckout = () => {
    setStep('payment');
    setSelectedPayment('cod');
    setAddress('');
    setNotes('');
    setCreatedOrderIds([]);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) resetCheckout(); onOpenChange(v); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col gap-0 overflow-hidden">
        {step === 'success' ? (
          /* ===== SUCCESS STEP ===== */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Pesanan Berhasil!
            </h2>
            <p className="text-gray-500 mb-2">
              {createdOrderIds.length > 1
                ? `${createdOrderIds.length} pesanan Anda telah dibuat dengan sukses`
                : 'Pesanan Anda telah dibuat dengan sukses'}
            </p>
            {createdOrderIds.length === 1 && (
              <p className="text-sm text-gray-400 mb-6">Order ID: {createdOrderIds[0].slice(-6).toUpperCase()}</p>
            )}
            {createdOrderIds.length > 1 && (
              <p className="text-sm text-gray-400 mb-6">
                {createdOrderIds.map(id => `#${id.slice(-6).toUpperCase()}`).join(', ')}
              </p>
            )}
            {(createdOrderIds.length === 1 || createdOrderIds.length === 0) && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 w-full max-w-sm">
                <p className="text-sm text-emerald-700 font-medium mb-1">Langkah Selanjutnya:</p>
                <p className="text-sm text-emerald-600">
                  {selectedPayment === 'cod'
                    ? 'Bayar saat barang diterima oleh kurir'
                    : selectedPayment === 'bank_transfer'
                    ? 'Transfer ke rekening BCA 1234567890 a.n. GrosirPJ'
                    : 'Scan QR code untuk pembayaran'
                  }
                </p>
                <p className="text-xs text-emerald-500 mt-2">Kemudian tekan tombol &quot;Bayar&quot; di halaman Pesanan Saya</p>
              </div>
            )}
            {createdOrderIds.length > 1 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 w-full max-w-sm">
                <p className="text-sm text-emerald-700 font-medium mb-1">Langkah Selanjutnya:</p>
                <p className="text-sm text-emerald-600">
                  Pesanan dibuat terpisah per penjual. Silakan lakukan pembayaran masing-masing di halaman Pesanan Saya.
                </p>
              </div>
            )}
            <div className="flex gap-3 w-full max-w-sm">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => { resetCheckout(); onOpenChange(false); }}
              >
                Belanja Lagi
              </Button>
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                onClick={() => { resetCheckout(); onOpenChange(false); }}
              >
                Lihat Pesanan
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <SheetHeader className="p-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                {step === 'confirm' && (
                  <button onClick={() => setStep('payment')} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <div>
                  <SheetTitle className="text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-emerald-500" />
                      {step === 'payment' ? 'Checkout' : 'Konfirmasi Pesanan'}
                    </div>
                  </SheetTitle>
                  <SheetDescription>
                    {step === 'payment' ? 'Pilih metode pembayaran' : 'Periksa kembali pesanan Anda'}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {step === 'payment' ? (
                <div className="p-4 space-y-5">
                  {/* Shipping Address */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      Alamat Pengiriman *
                    </Label>
                    <Input
                      placeholder="Masukkan alamat lengkap pengiriman..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="rounded-xl"
                    />
                    {user && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Kota: {user.city}
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Payment Methods */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Wallet className="w-4 h-4 text-emerald-500" />
                      Metode Pembayaran
                    </Label>
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedPayment(method.id)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          selectedPayment === method.id
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 bg-gradient-to-br ${method.color} rounded-lg flex items-center justify-center`}>
                            <method.icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">{method.name}</p>
                            <p className="text-xs text-gray-500">{method.description}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 ${
                            selectedPayment === method.id
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-gray-300'
                          } flex items-center justify-center`}>
                            {selectedPayment === method.id && (
                              <CheckCircle className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                        {selectedPayment === method.id && (
                          <div className="mt-3 pt-3 border-t border-emerald-200">
                            <p className="text-xs text-emerald-700">{method.details}</p>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <Separator />

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Catatan (opsional)</Label>
                    <Textarea
                      placeholder="Catatan tambahan untuk penjual..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="rounded-xl resize-none"
                      rows={2}
                    />
                  </div>

                  <Separator />

                  {/* Order Summary */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-500" />
                      Ringkasan Pesanan
                    </h4>
                    {checkoutItems.map((item) => (
                      <div key={item.productId} className="flex gap-3">
                        <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.quantity} x {formatPrice(item.price)}</p>
                        </div>
                        <p className="text-sm font-medium text-gray-700">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* ===== CONFIRM STEP ===== */
                <div className="p-4 space-y-5">
                  {/* Payment Summary */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h4 className="font-semibold text-sm text-gray-700">Detail Pembayaran</h4>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-gray-700">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Truck className="w-3 h-3" /> Ongkos Kirim
                      </span>
                      <span className={totalShipping === 0 ? 'text-emerald-600 font-medium' : 'text-gray-700'}>
                        {totalShipping === 0 ? 'Gratis' : formatPrice(totalShipping)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-emerald-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {formatPrice(totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Metode Pembayaran</h4>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const method = PAYMENT_METHODS.find(m => m.id === selectedPayment);
                        if (!method) return null;
                        return (
                          <>
                            <method.icon className="w-5 h-5 text-emerald-600" />
                            <span className="text-sm font-medium">{method.name}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Shipping */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Pengiriman</h4>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">{address}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {user?.city || 'Jakarta'}
                      </p>
                    </div>
                  </div>

                  {notes && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">Catatan</h4>
                      <p className="text-sm text-gray-600">{notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Action Bar */}
            <div className="border-t p-4 shrink-0 space-y-3">
              {step === 'payment' ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Total Pembayaran</span>
                    <span className="text-lg font-bold text-emerald-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {formatPrice(totalAmount)}
                    </span>
                  </div>
                  <Button
                    className="w-full py-6 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl"
                    onClick={() => {
                      if (!address.trim()) {
                        toast.error('Mohon isi alamat pengiriman');
                        return;
                      }
                      setStep('confirm');
                    }}
                    disabled={!address.trim()}
                  >
                    Lanjut ke Konfirmasi
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Total Pembayaran</span>
                    <span className="text-lg font-bold text-emerald-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {formatPrice(totalAmount)}
                    </span>
                  </div>
                  <Button
                    className="w-full py-6 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl"
                    onClick={handlePlaceOrder}
                    disabled={loading}
                  >
                    {loading ? 'Memproses...' : 'Buat Pesanan'}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
