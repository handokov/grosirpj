'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatPrice, PAYMENT_METHODS } from '@/lib/constants';
import {
  CreditCard, Building2, Smartphone, Banknote,
  Copy, CheckCircle, Clock, AlertCircle, Loader2,
} from 'lucide-react';
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
  notes: string;
  createdAt: string;
  items: OrderItem[];
  seller: {
    id: string;
    name: string;
    storeName?: string;
    city?: string;
    bankName?: string;
    bankAccount?: string;
    bankHolder?: string;
  };
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onPaymentConfirmed: () => void;
}

export function PaymentDialog({ open, onOpenChange, order, onPaymentConfirmed }: PaymentDialogProps) {
  const [confirming, setConfirming] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [sellerBankInfo, setSellerBankInfo] = useState<{
    bankName: string;
    bankAccount: string;
    bankHolder: string;
  } | null>(null);

  // Get seller bank info directly from order's seller data
  useEffect(() => {
    if (open && order && (order.paymentMethod === 'transfer' || order.paymentMethod === 'ewallet')) {
      // Use order's seller bank info if available, otherwise fetch
      if (order.seller?.bankName || order.seller?.bankAccount) {
        setSellerBankInfo({
          bankName: order.seller.bankName || 'BCA',
          bankAccount: order.seller.bankAccount || '',
          bankHolder: order.seller.bankHolder || order.seller.storeName || order.seller.name,
        });
      } else {
        fetch(`/api/auth/me?userId=${order.sellerId}`)
          .then(res => res.json())
          .then(data => {
            if (data.user) {
              setSellerBankInfo({
                bankName: data.user.bankName || 'BCA',
                bankAccount: data.user.bankAccount || '',
                bankHolder: data.user.bankHolder || data.user.storeName || data.user.name,
              });
            }
          })
          .catch(console.error);
      }
    }
  }, [open, order]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Berhasil disalin!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfirmPayment = async () => {
    if (!order) return;
    setConfirming(true);

    try {
      const proof = order.paymentMethod === 'cod'
        ? 'Pembayaran COD - akan dibayar saat barang tiba'
        : `Pengirim: ${senderName}${paymentNote ? ` | Catatan: ${paymentNote}` : ''}`;

      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid',
          paymentProof: proof,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Gagal mengkonfirmasi pembayaran');
        return;
      }

      toast.success('Pembayaran berhasil dikonfirmasi!');
      onPaymentConfirmed();
      onOpenChange(false);
    } catch (err) {
      toast.error('Gagal mengkonfirmasi pembayaran. Silakan coba lagi.');
    } finally {
      setConfirming(false);
    }
  };

  if (!order) return null;

  const paymentMethodInfo = PAYMENT_METHODS.find(p => p.value === order.paymentMethod);
  const isPending = order.status === 'pending';
  const isPaid = order.status === 'paid';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            Detail Pembayaran
          </DialogTitle>
          <DialogDescription>
            Pesanan #{order.id.slice(-8)}
          </DialogDescription>
        </DialogHeader>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Total Pembayaran</span>
            <span className="text-xl font-bold text-emerald-600">{formatPrice(order.totalAmount)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Metode</span>
            <span className="font-medium">
              {paymentMethodInfo?.icon} {paymentMethodInfo?.label}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Seller</span>
            <span className="font-medium">{order.seller?.storeName || order.seller?.name}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Status</span>
            <Badge className={isPaid ? 'bg-emerald-100 text-emerald-700' : isPending ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}>
              {isPaid ? '✅ Sudah Dibayar' : isPending ? '⏳ Menunggu Pembayaran' : order.status}
            </Badge>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Produk:</p>
          {order.items.map((item) => {
            let variants: Record<string, string> = {};
            try { variants = JSON.parse(item.variants); } catch {}
            return (
              <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{item.productName}</p>
                  {Object.keys(variants).length > 0 && (
                    <p className="text-xs text-gray-500">
                      {Object.entries(variants).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">{item.quantity} x {formatPrice(item.price)}</p>
                </div>
                <span className="font-medium text-gray-800 ml-2">{formatPrice(item.price * item.quantity)}</span>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Payment Instructions based on method */}
        {isPending && order.paymentMethod === 'transfer' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Building2 className="w-4 h-4 text-emerald-500" />
              Transfer ke Rekening Berikut:
            </div>
            {sellerBankInfo ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Nama Bank</Label>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg text-gray-800">{sellerBankInfo.bankName}</span>
                    <button
                      onClick={() => copyToClipboard(sellerBankInfo.bankName, 'bank')}
                      className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      {copiedField === 'bank' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Nomor Rekening</Label>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg text-gray-800 font-mono tracking-wider">{sellerBankInfo.bankAccount}</span>
                    <button
                      onClick={() => copyToClipboard(sellerBankInfo.bankAccount, 'account')}
                      className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      {copiedField === 'account' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Atas Nama</Label>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800">{sellerBankInfo.bankHolder}</span>
                    <button
                      onClick={() => copyToClipboard(sellerBankInfo.bankHolder, 'holder')}
                      className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      {copiedField === 'holder' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div className="pt-2 border-t border-emerald-200">
                  <p className="text-sm text-gray-600">
                    Total yang harus ditransfer: <span className="font-bold text-emerald-600">{formatPrice(order.totalAmount)}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                <span className="text-sm text-gray-500">Memuat informasi rekening...</span>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-700 space-y-1">
                  <p>1. Transfer sesuai jumlah total ke rekening di atas</p>
                  <p>2. Isi nama pengirim sesuai rekening Anda</p>
                  <p>3. Klik &quot;Konfirmasi Pembayaran&quot; setelah transfer</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="senderName" className="text-sm font-medium text-gray-700">
                  Nama Pengirim *
                </Label>
                <Input
                  id="senderName"
                  placeholder="Nama sesuai rekening pengirim"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentNote" className="text-sm font-medium text-gray-700">
                  Catatan (Opsional)
                </Label>
                <Textarea
                  id="paymentNote"
                  placeholder="No. referensi transfer, dll."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="rounded-xl resize-none"
                  rows={2}
                />
              </div>
            </div>

            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-6 rounded-xl"
              onClick={handleConfirmPayment}
              disabled={confirming || !senderName.trim()}
            >
              {confirming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" /> Konfirmasi Pembayaran
                </>
              )}
            </Button>
          </div>
        )}

        {/* E-Wallet Payment */}
        {isPending && order.paymentMethod === 'ewallet' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Smartphone className="w-4 h-4 text-emerald-500" />
              Pembayaran via E-Wallet
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
              <p className="text-sm text-gray-600">
                Silakan transfer ke e-wallet seller:
              </p>
              {sellerBankInfo ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">E-Wallet</Label>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800">{sellerBankInfo.bankName || 'GoPay'}</span>
                      <button
                        onClick={() => copyToClipboard(sellerBankInfo.bankName || 'GoPay', 'ewallet-type')}
                        className="p-1.5 hover:bg-purple-100 rounded-lg transition-colors"
                      >
                        {copiedField === 'ewallet-type' ? <CheckCircle className="w-4 h-4 text-purple-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Nomor E-Wallet</Label>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg text-gray-800 font-mono">{sellerBankInfo.bankAccount || '0812-xxxx-xxxx'}</span>
                      <button
                        onClick={() => copyToClipboard(sellerBankInfo.bankAccount || '', 'ewallet-num')}
                        className="p-1.5 hover:bg-purple-100 rounded-lg transition-colors"
                      >
                        {copiedField === 'ewallet-num' ? <CheckCircle className="w-4 h-4 text-purple-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Atas Nama</Label>
                    <span className="font-bold text-gray-800">{sellerBankInfo.bankHolder}</span>
                  </div>
                  <div className="pt-2 border-t border-purple-200">
                    <p className="text-sm text-gray-600">
                      Total: <span className="font-bold text-purple-600">{formatPrice(order.totalAmount)}</span>
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                  <span className="text-sm text-gray-500">Memuat info e-wallet...</span>
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-700 space-y-1">
                  <p>1. Transfer ke nomor e-wallet seller di atas</p>
                  <p>2. Isi nama pengirim</p>
                  <p>3. Klik &quot;Konfirmasi Pembayaran&quot; setelah transfer</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="senderNameEwallet" className="text-sm font-medium text-gray-700">
                  Nama Pengirim *
                </Label>
                <Input
                  id="senderNameEwallet"
                  placeholder="Nama Anda"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentNoteEwallet" className="text-sm font-medium text-gray-700">
                  Catatan (Opsional)
                </Label>
                <Textarea
                  id="paymentNoteEwallet"
                  placeholder="No. referensi, dll."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="rounded-xl resize-none"
                  rows={2}
                />
              </div>
            </div>

            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-6 rounded-xl"
              onClick={handleConfirmPayment}
              disabled={confirming || !senderName.trim()}
            >
              {confirming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" /> Konfirmasi Pembayaran
                </>
              )}
            </Button>
          </div>
        )}

        {/* COD Payment */}
        {isPending && order.paymentMethod === 'cod' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Banknote className="w-4 h-4 text-emerald-500" />
              Bayar di Tempat (COD)
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Banknote className="w-8 h-8 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">Bayar saat barang tiba</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Anda akan membayar <span className="font-bold text-emerald-600">{formatPrice(order.totalAmount)}</span> secara tunai ketika kurir mengantar pesanan ke alamat Anda.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Pastikan Anda menyiapkan uang pas saat pengiriman.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-700 space-y-1">
                  <p>Silakan siapkan uang tunai sesuai total pembayaran</p>
                  <p>Pesanan akan otomatis dikonfirmasi setelah Anda klik tombol di bawah</p>
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-6 rounded-xl"
              onClick={handleConfirmPayment}
              disabled={confirming}
            >
              {confirming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" /> Konfirmasi Pesanan COD
                </>
              )}
            </Button>
          </div>
        )}

        {/* Already Paid Status */}
        {isPaid && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Pembayaran Dikonfirmasi</p>
                  <p className="text-sm text-gray-500">
                    {order.paidAt
                      ? `Dibayar pada ${new Date(order.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                      : 'Pembayaran sudah dikonfirmasi'}
                  </p>
                </div>
              </div>
            </div>
            {order.paymentProof && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Detail Pembayaran:</p>
                <p className="text-sm text-gray-700">{order.paymentProof}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
