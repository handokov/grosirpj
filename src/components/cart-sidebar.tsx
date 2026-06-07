'use client';

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
import { useCartStore, CartItem } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { calculateShipping, formatShippingInfo } from '@/lib/shipping';
import { formatPrice } from '@/lib/constants';
import { ShoppingCart, Minus, Plus, Trash2, Truck, ArrowRight, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

export function CartSidebar() {
  const cartOpen = useUIStore((s) => s.cartOpen);
  const closeCart = useUIStore((s) => s.closeCart);
  const openCheckout = useUIStore((s) => s.openCheckout);

  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const getTotal = useCartStore((s) => s.getTotal);
  const getCount = useCartStore((s) => s.getCount);
  const clearCart = useCartStore((s) => s.clearCart);

  const user = useAuthStore((s) => s.user);
  const setLoginModalOpen = useAuthStore((s) => s.setLoginModalOpen);

  const subtotal = getTotal();
  const totalItems = getCount();

  // Calculate shipping per seller
  const shippingBySeller: Record<string, number> = {};
  if (user) {
    for (const item of items) {
      if (!shippingBySeller[item.sellerId]) {
        const est = calculateShipping(item.location, user.city);
        shippingBySeller[item.sellerId] = est.cost;
      }
    }
  }
  const totalShipping = Object.values(shippingBySeller).reduce((sum, cost) => sum + cost, 0);
  // Free shipping for purchases over 100k
  const effectiveShipping = subtotal >= 100000 ? 0 : totalShipping;
  const grandTotal = subtotal + effectiveShipping;

  const handleCheckout = () => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    openCheckout();
  };

  return (
    <Sheet open={cartOpen} onOpenChange={(open) => { if (!open) closeCart(); }}>
      <SheetContent side="right" className="w-full sm:w-96 p-0 flex flex-col gap-0 overflow-hidden">
        <SheetHeader className="p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-display flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-500" />
              Keranjang Belanja
            </SheetTitle>
            {items.length > 0 && (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">{totalItems} item</Badge>
            )}
          </div>
          <SheetDescription>Produk yang sudah ditambahkan</SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Keranjang Kosong</h3>
            <p className="text-sm text-gray-400 mb-4">Mulai belanja sekarang!</p>
            <Button
              variant="outline"
              className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-xl"
              onClick={closeCart}
            >
              Jelajahi Produk
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              <div className="p-4 space-y-4">
                {items.map((item) => {
                  const variantKeys = Object.entries(item.selectedVariants || {});
                  const itemShipping = user ? calculateShipping(item.location, user.city) : null;
                  return (
                    <div key={`${item.productId}-${JSON.stringify(item.selectedVariants)}`} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0">
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop'}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-xl bg-gray-100 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm line-clamp-2">{item.name}</h4>
                        {variantKeys.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {variantKeys.map(([key, val]) => (
                              <span key={key} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                {key}: {val}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-emerald-600 font-bold mt-1">{formatPrice(item.price)}</p>
                        {itemShipping && itemShipping.cost > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Truck className="w-3 h-3" /> Ongkir: {formatShippingInfo(itemShipping)}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center border rounded-lg overflow-hidden">
                            <button
                              className="h-7 w-7 flex items-center justify-center hover:bg-gray-100 transition-colors"
                              onClick={() => updateQuantity(item.productId, -1)}
                              disabled={item.quantity <= item.minOrder}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-medium tabular-nums">{item.quantity}</span>
                            <button
                              className="h-7 w-7 flex items-center justify-center hover:bg-gray-100 transition-colors"
                              onClick={() => updateQuantity(item.productId, 1)}
                              disabled={item.quantity >= item.stock}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            onClick={() => { removeItem(item.productId); toast.success('Item dihapus dari keranjang'); }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cart Total */}
            <div className="border-t bg-white p-4 space-y-3 shrink-0">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({totalItems} item)</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Ongkos Kirim</span>
                  <span className={effectiveShipping === 0 ? 'text-emerald-600 font-medium' : ''}>
                    {effectiveShipping === 0 ? 'Gratis' : formatPrice(effectiveShipping)}
                  </span>
                </div>
                {subtotal >= 100000 && (
                  <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                    <Truck className="w-3 h-3" /> Gratis ongkir untuk pembelian di atas {formatPrice(100000)}
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-emerald-600">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              <Button
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-6 rounded-xl flex items-center justify-center gap-2"
                onClick={handleCheckout}
              >
                Checkout <ArrowRight className="w-4 h-4" />
              </Button>
              <button
                onClick={() => { clearCart(); toast.success('Keranjang dikosongkan'); }}
                className="w-full text-center text-sm text-gray-400 hover:text-red-500 transition-colors py-1"
              >
                Kosongkan Keranjang
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
