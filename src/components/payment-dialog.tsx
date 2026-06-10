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
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatPrice, PAYMENT_METHODS } from '@/lib/constants';
import {
  CreditCard, Building2, Smartphone, Banknote,
  Copy, CheckCircle, Clock, AlertCircle, Loader2, Hourglass,
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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSenderName('');
      setPaymentNote('');
    }
  }, [open]);

  // Get seller bank info directly from order's seller data
  useEffect(() => {
    if (open && order && (order.paymentMethod === 'transfer' || order.paymentMethod === 'ewallet')) {
      if (order.seller?.bankName || order.seller?.bankAccount) {
        setSellerBankInfo({
          bankName: order.seller.bankName || 'BCA',
          bankAccount: order.seller.bankAccount || '',
          bankHolder: order.seller.bankHolder || order.seller.storeName || order.seller.name,
        });
      } else {
        fetch(`/api/orders/${order.id}`)
          .then(res => res.json())
          .then(data => {
            if (data.order?.seller) {
              const s = data.order.seller;
              setSellerBankInfo({
                bankName: s.bankName || 'BCA',
                bankAccount: s.bankAccount || '',
                bankHolder: s.bankHolder || s.storeName || s.name,
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

  // Buyer submits payment proof (NOT changing status to paid)
  const handleSubmitPayment = async () => {
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
          // No status change - just submitting payment proof
          paymentProof: proof,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Gagal mengirim bukti pembayaran');
        return;
      }

      toast.success('Bukti pembayaran berhasil dikirim! Menunggu konfirmasi penjual.');
      onPaymentConfirmed();
      onOpenChange(false);
    } catch (err) {
      toast.error('Gagal mengirim bukti pembayaran. Silakan coba lagi.');
    } finally {
      setConfirming(false);
    }
  };

  if (!order) return null;

  const paymentMethodInfo = PAYMENT_METHODS.find(p => p.value === order.paymentMethod);
  const isPending = order.status === 'pending';
  const isPaid = order.status === 'paid';
  const hasSubmittedProof = !!order.paymentProof; // Buyer already submitted proof
  const isAwaitingConfirmation = isPending && hasSubmittedProof; // Waiting for seller to confirm

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm max-h-[85vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 font-display text-base">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            Detail Pembayaran
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pesanan #{order.id.slice(-8)}
          </DialogDescription>
        </DialogHeader>

        {/* Order Summary - compact */}
        <div className="bg-gray-50 rounded-lg p-2.5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Total</span>
            <span className="text-sm font-bold text-emerald-600">{formatPrice(order.totalAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Metode</span>
            <span className="font-medium">{paymentMethodInfo?.icon} {paymentMethodInfo?.label}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Seller</span>
            <span className="font-medium">{order.seller?.storeName || order.seller?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Status</span>
            {isPaid ? (
              <Badge className="bg-emerald-100 text-emerald-700" style={{fontSize: '10px'}}>
                ✅ Dibayar
              </Badge>
            ) : isAwaitingConfirmation ? (
              <Badge className="bg-blue-100 text-blue-700" style={{fontSize: '10px'}}>
                ⏳ Menunggu Konfirmasi
              </Badge>
            ) : isPending ? (
              <Badge className="bg-yellow-100 text-yellow-700" style={{fontSize: '10px'}}>
                💳 Belum Bayar
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-700" style={{fontSize: '10px'}}>
                {order.status}
              </Badge>
            )}
          </div>
        </div>

        {/* Items - compact */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-700">Produk:</p>
          {order.items.map((item) => {
            let variants: Record<string, string> = {};
            try { variants = JSON.parse(item.variants); } catch {}
            return (
              <div key={item.id} className="flex items-center justify-between p-1.5 bg-gray-50 rounded text-xs">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{item.productName}</p>
                  {Object.keys(variants).length > 0 && (
                    <p className="text-[10px] text-gray-500">
                      {Object.entries(variants).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400">{item.quantity} x {formatPrice(item.price)}</p>
                </div>
                <span className="font-medium text-gray-800 ml-2">{formatPrice(item.price * item.quantity)}</span>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* === ALREADY PAID === */}
        {isPaid && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <p className="font-semibold text-xs text-gray-800">Pembayaran Dikonfirmasi</p>
                <p className="text-[10px] text-gray-500">
                  {order.paidAt
                    ? new Date(order.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Pembayaran sudah dikonfirmasi'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* === AWAITING SELLER CONFIRMATION === */}
        {isAwaitingConfirmation && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Hourglass className="w-5 h-5 text-blue-500 shrink-0 animate-pulse" />
              <div>
                <p className="font-semibold text-xs text-blue-800">Menunggu Konfirmasi Penjual</p>
                <p className="text-[10px] text-blue-600">Bukti pembayaran sudah dikirim. Penjual akan memverifikasi pembayaran Anda.</p>
              </div>
            </div>
          </div>
        )}

        {/* === PENDING - Transfer Payment (buyer hasn't submitted proof yet) === */}
        {isPending && !hasSubmittedProof && order.paymentMethod === 'transfer' && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
              <Building2 className="w-3.5 h-3.5 text-emerald-500" />
              Transfer ke Rekening:
            </div>
            {sellerBankInfo ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Bank</span>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-xs text-gray-800">{sellerBankInfo.bankName}</span>
                    <button onClick={() => copyToClipboard(sellerBankInfo.bankName, 'bank')} className="p-0.5 hover:bg-emerald-100 rounded">
                      {copiedField === 'bank' ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">No. Rekening</span>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-xs text-gray-800 font-mono">{sellerBankInfo.bankAccount}</span>
                    <button onClick={() => copyToClipboard(sellerBankInfo.bankAccount, 'account')} className="p-0.5 hover:bg-emerald-100 rounded">
                      {copiedField === 'account' ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Atas Nama</span>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-xs text-gray-800">{sellerBankInfo.bankHolder}</span>
                    <button onClick={() => copyToClipboard(sellerBankInfo.bankHolder, 'holder')} className="p-0.5 hover:bg-emerald-100 rounded">
                      {copiedField === 'holder' ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div className="pt-1 border-t border-emerald-200">
                  <p className="text-[10px] text-gray-600">
                    Transfer: <span className="font-bold text-emerald-600">{formatPrice(order.totalAmount)}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                <span className="text-xs text-gray-500">Memuat info rekening...</span>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-1.5">
              <div className="flex items-start gap-1">
                <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-[10px] text-amber-700 space-y-0.5">
                  <p>1. Transfer sesuai jumlah total</p>
                  <p>2. Isi nama pengirim</p>
                  <p>3. Klik &quot;Saya Sudah Bayar&quot;</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="space-y-1">
                <Label htmlFor="senderName" className="text-[10px] font-medium text-gray-700">
                  Nama Pengirim *
                </Label>
                <Input
                  id="senderName"
                  placeholder="Nama sesuai rekening"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="rounded-lg text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="paymentNote" className="text-[10px] font-medium text-gray-700">
                  Catatan (Opsional)
                </Label>
                <Input
                  id="paymentNote"
                  placeholder="No. referensi, dll."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="rounded-lg text-xs h-8"
                />
              </div>
            </div>

            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-lg text-xs"
              onClick={handleSubmitPayment}
              disabled={confirming || !senderName.trim()}
            >
              {confirming ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Mengirim...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" /> Saya Sudah Bayar
                </>
              )}
            </Button>
          </div>
        )}

        {/* === PENDING - E-Wallet Payment === */}
        {isPending && !hasSubmittedProof && order.paymentMethod === 'ewallet' && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
              <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
              Pembayaran via E-Wallet
            </div>

            {sellerBankInfo ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">E-Wallet</span>
                  <span className="font-semibold text-xs text-gray-800">{sellerBankInfo.bankName || 'GoPay'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Nomor</span>
                  <span className="font-semibold text-xs text-gray-800 font-mono">{sellerBankInfo.bankAccount || '0812-xxxx-xxxx'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Atas Nama</span>
                  <span className="font-semibold text-xs text-gray-800">{sellerBankInfo.bankHolder}</span>
                </div>
                <div className="pt-1 border-t border-purple-200">
                  <p className="text-[10px] text-gray-600">
                    Total: <span className="font-bold text-purple-600">{formatPrice(order.totalAmount)}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                <span className="text-xs text-gray-500">Memuat info e-wallet...</span>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-1.5">
              <div className="flex items-start gap-1">
                <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-[10px] text-amber-700 space-y-0.5">
                  <p>1. Transfer ke e-wallet seller</p>
                  <p>2. Isi nama pengirim</p>
                  <p>3. Klik &quot;Saya Sudah Bayar&quot;</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="space-y-1">
                <Label htmlFor="senderNameEwallet" className="text-[10px] font-medium text-gray-700">
                  Nama Pengirim *
                </Label>
                <Input
                  id="senderNameEwallet"
                  placeholder="Nama Anda"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="rounded-lg text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="paymentNoteEwallet" className="text-[10px] font-medium text-gray-700">
                  Catatan (Opsional)
                </Label>
                <Input
                  id="paymentNoteEwallet"
                  placeholder="No. referensi, dll."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="rounded-lg text-xs h-8"
                />
              </div>
            </div>

            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-lg text-xs"
              onClick={handleSubmitPayment}
              disabled={confirming || !senderName.trim()}
            >
              {confirming ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Mengirim...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" /> Saya Sudah Bayar
                </>
              )}
            </Button>
          </div>
        )}

        {/* === PENDING - COD Payment === */}
        {isPending && !hasSubmittedProof && order.paymentMethod === 'cod' && (
          <div className="space-y-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
              <div className="flex items-start gap-2">
                <Banknote className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-medium text-xs text-gray-800">Bayar saat barang tiba</p>
                  <p className="text-[10px] text-gray-500">
                    Bayar <span className="font-bold text-emerald-600">{formatPrice(order.totalAmount)}</span> saat kurir mengantar.
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-lg text-xs"
              onClick={handleSubmitPayment}
              disabled={confirming}
            >
              {confirming ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Mengirim...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" /> Konfirmasi Pesanan COD
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
