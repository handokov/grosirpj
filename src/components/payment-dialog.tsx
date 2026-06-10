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
  Copy, CheckCircle, Clock, AlertCircle, Loader2,
  Shield, ArrowRight,
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

  // ESCROW: Buyer confirms payment → status changes to 'paid'
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
          // ESCROW: Buyer confirms payment → status becomes 'paid'
          // Funds conceptually held in Escrow GrosirPJ
          status: 'paid',
          paymentProof: proof,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Gagal mengkonfirmasi pembayaran');
        return;
      }

      toast.success('Pembayaran berhasil dikonfirmasi! Dana ditampung di Escrow GrosirPJ.');
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
  const isPaid = order.status === 'paid' || order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered';
  const isPending = order.status === 'pending';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm max-h-[85vh] overflow-y-auto p-4">
        <DialogHeader className="pb-1">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            Pembayaran
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Pesanan #{order.id.slice(-8)}
          </DialogDescription>
        </DialogHeader>

        {/* Escrow Badge */}
        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-[10px] text-emerald-700 font-medium">Dana aman di Escrow GrosirPJ</span>
        </div>

        {/* Order Summary - very compact */}
        <div className="bg-gray-50 rounded-lg p-2 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Total</span>
            <span className="font-bold text-emerald-600">{formatPrice(order.totalAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Metode</span>
            <span className="font-medium">{paymentMethodInfo?.icon} {paymentMethodInfo?.label}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Seller</span>
            <span className="font-medium truncate ml-2">{order.seller?.storeName || order.seller?.name}</span>
          </div>
        </div>

        {/* Items - compact */}
        <div className="space-y-0.5">
          {order.items.map((item) => {
            let variants: Record<string, string> = {};
            try { variants = JSON.parse(item.variants); } catch {}
            return (
              <div key={item.id} className="flex items-center justify-between py-1 text-xs">
                <div className="min-w-0 flex-1">
                  <span className="text-gray-800 truncate">{item.productName}</span>
                  {Object.keys(variants).length > 0 && (
                    <span className="text-[10px] text-gray-400 ml-1">
                      ({Object.entries(variants).map(([k, v]) => `${v}`).join('/')})
                    </span>
                  )}
                  <span className="text-gray-400 ml-1">×{item.quantity}</span>
                </div>
                <span className="font-medium text-gray-800 ml-2">{formatPrice(item.price * item.quantity)}</span>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* === ALREADY PAID === */}
        {isPaid && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
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

        {/* === PENDING - Transfer Payment === */}
        {isPending && order.paymentMethod === 'transfer' && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
              <Building2 className="w-3.5 h-3.5 text-emerald-500" />
              Transfer ke Rekening:
            </div>
            {sellerBankInfo ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 space-y-0.5">
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
                  <span className="text-[10px] text-gray-500">No. Rek</span>
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
              <div className="bg-gray-50 rounded-lg p-2 flex items-center gap-2">
                <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />
                <span className="text-xs text-gray-500">Memuat info rekening...</span>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-1.5">
              <div className="flex items-start gap-1">
                <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-[10px] text-amber-700 space-y-0.5">
                  <p>1. Transfer sesuai jumlah total</p>
                  <p>2. Isi nama pengirim</p>
                  <p>3. Klik "Saya Sudah Bayar" → Dana ditampung Escrow</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="space-y-0.5">
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
              <div className="space-y-0.5">
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
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-lg text-xs h-9"
              onClick={handleSubmitPayment}
              disabled={confirming || !senderName.trim()}
            >
              {confirming ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Mengirim...
                </>
              ) : (
                <>
                  <Shield className="w-3 h-3 mr-1" /> Saya Sudah Bayar
                </>
              )}
            </Button>
            <p className="text-[9px] text-gray-400 text-center">Dana akan ditampung di Escrow GrosirPJ sampai barang diterima</p>
          </div>
        )}

        {/* === PENDING - E-Wallet Payment === */}
        {isPending && order.paymentMethod === 'ewallet' && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
              <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
              Pembayaran via E-Wallet
            </div>

            {sellerBankInfo ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 space-y-0.5">
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
                <Loader2 className="w-3 h-3 text-purple-500 animate-spin" />
                <span className="text-xs text-gray-500">Memuat info e-wallet...</span>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-1.5">
              <div className="flex items-start gap-1">
                <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-[10px] text-amber-700 space-y-0.5">
                  <p>1. Transfer ke e-wallet seller</p>
                  <p>2. Isi nama pengirim</p>
                  <p>3. Klik "Saya Sudah Bayar" → Dana ditampung Escrow</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="space-y-0.5">
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
              <div className="space-y-0.5">
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
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-lg text-xs h-9"
              onClick={handleSubmitPayment}
              disabled={confirming || !senderName.trim()}
            >
              {confirming ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Mengirim...
                </>
              ) : (
                <>
                  <Shield className="w-3 h-3 mr-1" /> Saya Sudah Bayar
                </>
              )}
            </Button>
            <p className="text-[9px] text-gray-400 text-center">Dana akan ditampung di Escrow GrosirPJ sampai barang diterima</p>
          </div>
        )}

        {/* === PENDING - COD Payment === */}
        {isPending && order.paymentMethod === 'cod' && (
          <div className="space-y-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
              <div className="flex items-start gap-2">
                <Banknote className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-medium text-xs text-gray-800">Bayar saat barang tiba</p>
                  <p className="text-[10px] text-gray-500">
                    Bayar <span className="font-bold text-emerald-600">{formatPrice(order.totalAmount)}</span> saat kurir mengantar.
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-lg text-xs h-9"
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
