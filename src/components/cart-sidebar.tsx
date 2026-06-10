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
import { ShoppingCart, Minus, Plus, Trash2, Truck, ArrowRight, ShoppingBag, Store } from 'lucide-react';
import { toast } from 'sonner';

// Group items by seller
function groupBySeller(items: CartItem[]): { sellerId: string; sellerName: string; location: string; items: CartItem[] }[] {
  const map = new Map<string, { sellerId: string; sellerName: string; location: string; items: CartItem[] }>();
  for (const item of items) {
    if (!map.has(item.sellerId)) {
      map.set(item.sellerId, {
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        location: item.location,
        items: [],
      });
    }
    map.get(item.sellerId)!.items.push(item);
  }
  return Array.from(map.values());
}

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

  const totalItems = getCount();

  // Group items by seller
  const sellerGroups = groupBySeller(items);

  const handleCheckout = (sellerId: string) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    openCheckout(sellerId);
  };

  return (
    <Sheet open={cartOpen} onOpenChange={(open) => { if (!open) closeCart(); }}>
      <SheetContent side="right" className="w-full sm:w-96 md:max-w-lg p-0 flex flex-col gap-0 overflow-hidden">
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
            {/* Cart Items - Grouped by Seller */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              <div className="p-4 space-y-5">
                {sellerGroups.map((group) => {
                  const sellerSubtotal = group.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                  const sellerItemCount = group.items.reduce((sum, item) => sum + item.quantity, 0);
                  const shipping = user ? calculateShipping(group.location, user.city) : null;
                  const shippingCost = sellerSubtotal >= 100000 ? 0 : (shipping?.cost || 0);
                  const sellerTotal = sellerSubtotal + shippingCost;

                  return (
                    <div key={group.sellerId} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                      {/* Seller Header */}
                      <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <Store className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{group.sellerName}</p>
                          <p className="text-[10px] text-gray-400">{group.location}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] bg-white text-gray-500 border border-gray-200">{sellerItemCount} item</Badge>
                      </div>

                      {/* Items */}
                      <div className="divide-y divide-gray-50">
                        {group.items.map((item) => {
                          const variantKeys = Object.entries(item.selectedVariants || {});
                          return (
                            <div key={`${item.productId}-${JSON.stringify(item.selectedVariants)}`} className="flex gap-3 p-3">
                              <img
                                src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop'}
                                alt={item.name}
                                className="w-16 h-16 object-cover rounded-xl bg-gray-100 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 text-sm line-clamp-2 leading-tight">{item.name}</h4>
                                {variantKeys.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {variantKeys.map(([key, val]) => (
                                      <span key={key} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                        {key}: {val}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <p className="text-emerald-600 font-bold text-sm mt-1">{formatPrice(item.price)}</p>
                                <div className="flex items-center justify-between mt-1.5">
                                  <div className="flex items-center border rounded-lg overflow-hidden">
                                    <button
                                      className="h-6 w-6 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                      onClick={() => updateQuantity(item.productId, -1, item.selectedVariants)}
                                      disabled={item.quantity <= item.minOrder}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-7 text-center text-xs font-medium tabular-nums">{item.quantity}</span>
                                    <button
                                      className="h-6 w-6 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                      onClick={() => updateQuantity(item.productId, 1, item.selectedVariants)}
                                      disabled={item.quantity >= item.stock}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => { removeItem(item.productId, item.selectedVariants); toast.success('Item dihapus dari keranjang'); }}
                                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Seller Subtotal & Checkout */}
                      <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
                        <div className="space-y-1.5 mb-3 text-xs">
                          <div className="flex justify-between text-gray-500">
                            <span>Subtotal ({sellerItemCount} item)</span>
                            <span>{formatPrice(sellerSubtotal)}</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Ongkir</span>
                            <span className={shippingCost === 0 ? 'text-emerald-600 font-medium' : ''}>
                              {shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost)}
                            </span>
                          </div>
                          {sellerSubtotal >= 100000 && (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                              <Truck className="w-3 h-3" /> Gratis ongkir pembelian di atas {formatPrice(100000)}
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
                            <span>Total</span>
                            <span className="text-emerald-600">{formatPrice(sellerTotal)}</span>
                          </div>
                        </div>
                        <Button
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
                          onClick={() => handleCheckout(group.sellerId)}
                        >
                          Checkout {group.sellerName} <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cart Footer */}
            <div className="border-t bg-white p-4 shrink-0">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Total semua ({totalItems} item)</span>
                <span className="font-semibold text-gray-800">{formatPrice(getTotal())}</span>
              </div>
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
