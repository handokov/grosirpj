'use client';

import { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUIStore } from '@/store/ui';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { calculateShipping, getCityNames } from '@/lib/shipping';
import { formatPrice, PAYMENT_METHODS } from '@/lib/constants';
import { ArrowLeft, ArrowRight, MapPin, CreditCard, CheckCircle, Truck, Package } from 'lucide-react';
import { toast } from 'sonner';

type Step = 1 | 2 | 3;

export function CheckoutFlow() {
  const checkoutOpen = useUIStore((s) => s.checkoutOpen);
  const closeCheckout = useUIStore((s) => s.closeCheckout);
  const openCart = useUIStore((s) => s.openCart);

  const items = useCartStore((s) => s.items);
  const getTotal = useCartStore((s) => s.getTotal);
  const clearCart = useCartStore((s) => s.clearCart);

  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<Step>(1);
  const [placing, setPlacing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Shipping form
  const [city, setCity] = useState(user?.city || 'Jakarta');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('cod');

  const cityNames = getCityNames();
  const subtotal = getTotal();

  // Calculate shipping per seller group
  const shippingBySeller = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      if (!map[item.sellerId]) {
        const est = calculateShipping(item.location, city);
        map[item.sellerId] = est.cost;
      }
    }
    return map;
  }, [items, city]);

  const totalShipping = subtotal >= 100000 ? 0 : Object.values(shippingBySeller).reduce((s, c) => s + c, 0);
  const grandTotal = subtotal + totalShipping;

  const canProceed = () => {
    if (step === 1) return city && address.trim() && phone.trim();
    if (step === 2) return paymentMethod;
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!user) return;
    setPlacing(true);

    try {
      // Group items by seller for separate orders
      const itemsBySeller = new Map<string, typeof items>();
      for (const item of items) {
        const sellerItems = itemsBySeller.get(item.sellerId) || [];
        sellerItems.push(item);
        itemsBySeller.set(item.sellerId, sellerItems);
      }

      let allSuccess = true;
      for (const [sellerId, sellerItems] of itemsBySeller) {
        const orderItems = sellerItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          variants: item.selectedVariants || {},
        }));

        const sellerSubtotal = sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const shippingCost = subtotal >= 100000 ? 0 : (shippingBySeller[sellerId] || 0);

        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buyerId: user.id,
            items: orderItems,
            shippingAddress: `${address}, ${city}`,
            paymentMethod,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || 'Gagal membuat pesanan');
          allSuccess = false;
        }
      }

      if (allSuccess) {
        setOrderSuccess(true);
        clearCart();
        toast.success('Pesanan berhasil dibuat!');
      }
    } catch (err) {
      toast.error('Gagal membuat pesanan. Silakan coba lagi.');
    } finally {
      setPlacing(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      closeCheckout();
      // Reset after animation
      setTimeout(() => {
        setStep(1);
        setOrderSuccess(false);
      }, 300);
    }
  };

  // Success state
  if (orderSuccess) {
    return (
      <Sheet open={checkoutOpen} onOpenChange={handleClose}>
        <SheetContent side="right" className="w-full sm:w-96 md:max-w-lg p-0 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 font-display">Pesanan Berhasil!</h2>
            <p className="text-gray-500 mb-6">Terima kasih telah berbelanja di GrosirPJ. Pesanan Anda sedang diproses.</p>
            <div className="bg-gray-50 rounded-xl p-4 w-full mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Metode Pembayaran</span>
                <span className="font-medium">{PAYMENT_METHODS.find(p => p.value === paymentMethod)?.label || paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Alamat Pengiriman</span>
                <span className="font-medium text-right max-w-[50%]">{address}, {city}</span>
              </div>
            </div>
            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-6"
              onClick={() => handleClose(false)}
            >
              Selesai
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={checkoutOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:w-96 md:max-w-lg p-0 flex flex-col gap-0 overflow-hidden">
        <SheetHeader className="p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={() => setStep((step - 1) as Step)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div>
              <SheetTitle className="text-xl font-display">Checkout</SheetTitle>
              <SheetDescription>
                Langkah {step} dari 3 — {
                  step === 1 ? 'Alamat Pengiriman' : step === 2 ? 'Metode Pembayaran' : 'Ringkasan Pesanan'
                }
              </SheetDescription>
            </div>
          </div>
          {/* Progress indicator */}
          <div className="flex gap-2 mt-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? 'bg-emerald-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6">
          {/* Step 1: Shipping Address */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl">
                <MapPin className="w-6 h-6 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-medium text-sm text-gray-800">Alamat Pengiriman</p>
                  <p className="text-xs text-gray-500">Pastikan alamat lengkap agar pengiriman lancar</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Kota Tujuan
                </Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="Pilih kota" />
                  </SelectTrigger>
                  <SelectContent>
                    {cityNames.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium text-gray-700">Alamat Lengkap</Label>
                <Textarea
                  id="address"
                  placeholder="Jl. Contoh No. 123, RT/RW, Kelurahan, Kecamatan"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="rounded-xl resize-none"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">No. Telepon</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0812-xxxx-xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          )}

          {/* Step 2: Payment Method */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl">
                <CreditCard className="w-6 h-6 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-medium text-sm text-gray-800">Metode Pembayaran</p>
                  <p className="text-xs text-gray-500">Pilih metode pembayaran yang Anda inginkan</p>
                </div>
              </div>

              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === method.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPaymentMethod(method.value)}
                >
                  <span className="text-2xl">{method.icon}</span>
                  <div className="text-left flex-1">
                    <p className="font-medium text-sm text-gray-800">{method.label}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === method.value ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                  }`}>
                    {paymentMethod === method.value && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Order Summary */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl">
                <Package className="w-6 h-6 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-medium text-sm text-gray-800">Ringkasan Pesanan</p>
                  <p className="text-xs text-gray-500">Periksa kembali pesanan Anda</p>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={`${item.productId}-${JSON.stringify(item.selectedVariants)}`} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                    <img src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&h=80&fit=crop'} alt={item.name} className="w-14 h-14 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.name}</p>
                      {Object.entries(item.selectedVariants || {}).map(([k, v]) => (
                        <span key={k} className="text-xs text-gray-500">{k}: {v} · </span>
                      ))}
                      <p className="text-sm text-gray-500">{item.quantity} x {formatPrice(item.price)}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Cost Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Ongkos Kirim</span>
                  <span className={totalShipping === 0 ? 'text-emerald-600 font-medium' : ''}>
                    {totalShipping === 0 ? 'Gratis' : formatPrice(totalShipping)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total Pembayaran</span>
                  <span className="text-emerald-600">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400" /> <span>{address}, {city}</span></div>
                <div className="flex items-center gap-2"><CreditCard className="w-3.5 h-3.5 text-gray-400" /> <span>{PAYMENT_METHODS.find(p => p.value === paymentMethod)?.label}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action */}
        <div className="border-t bg-white p-4 shrink-0">
          {step < 3 ? (
            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-6 rounded-xl flex items-center justify-center gap-2"
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canProceed()}
            >
              Lanjutkan <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-6 rounded-xl flex items-center justify-center gap-2"
              onClick={handlePlaceOrder}
              disabled={placing || items.length === 0}
            >
              {placing ? 'Memproses...' : `Bayar ${formatPrice(grandTotal)}`}
              {!placing && <CheckCircle className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
