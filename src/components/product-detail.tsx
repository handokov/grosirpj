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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Product, formatPrice } from '@/lib/data';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { calculateShipping, formatShippingInfo } from '@/lib/shipping';
import {
  Star,
  MapPin,
  ShoppingCart,
  Minus,
  Plus,
  Truck,
  Shield,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Store,
  Users,
  Package,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProductDetailProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ProductDetailInner({ product }: { product: Product }) {
  const [selectedVariant, setSelectedVariant] = useState<string>(
    product.variants?.[0] ?? ''
  );
  const [quantity, setQuantity] = useState(product.minOrder || 1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const addItem = useCartStore((state) => state.addItem);
  const user = useAuthStore((s) => s.user);
  const setLoginModalOpen = useAuthStore((s) => s.setLoginModalOpen);

  const minOrder = product.minOrder || 1;
  const stock = product.stock || 0;
  const totalPrice = quantity * product.price;
  const discountPercent =
    product.discount ||
    Math.round(
      ((product.originalPrice - product.price) / product.originalPrice) * 100
    );

  const images = [product.image];

  // Calculate shipping
  const shipping = user ? calculateShipping(product.location, user.city) : null;

  const handleAddToCart = () => {
    if (!user) {
      setLoginModalOpen(true);
      toast.error('Silakan login terlebih dahulu');
      return;
    }
    addItem(product);
    toast.success('Produk ditambahkan ke keranjang');
  };

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty >= minOrder && newQty <= stock) {
      setQuantity(newQty);
    }
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) =>
      prev > 0 ? prev - 1 : images.length - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev < images.length - 1 ? prev + 1 : 0
    );
  };

  return (
    <>
      <SheetHeader className="sr-only">
        <SheetTitle>{product.name}</SheetTitle>
        <SheetDescription>Detail produk {product.name}</SheetDescription>
      </SheetHeader>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {/* Image Section */}
        <div className="relative h-48 sm:h-56 md:h-64 bg-gray-100 overflow-hidden shrink-0">
          <img
            src={images[currentImageIndex]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {discountPercent > 0 && (
            <Badge className="absolute top-3 left-3 bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold px-2 py-1">
              -{discountPercent}%
            </Badge>
          )}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8"
                onClick={handlePrevImage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8"
                onClick={handleNextImage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Info Section */}
        <div className="p-4 space-y-4">
          {/* Product Name */}
          <h2 className="font-display font-bold text-xl leading-tight">
            {product.name}
          </h2>

          {/* Price Section */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-emerald-600 font-bold text-2xl">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice > product.price && (
              <>
                <span className="text-gray-400 line-through text-sm">
                  {formatPrice(product.originalPrice)}
                </span>
                <Badge
                  variant="secondary"
                  className="bg-emerald-50 text-emerald-600 text-xs font-semibold"
                >
                  -{discountPercent}%
                </Badge>
              </>
            )}
          </div>

          {/* Rating, Sold, Location */}
          <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-medium text-gray-700">
                {product.rating}
              </span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>
                {product.sold.toLocaleString('id-ID')} terjual
              </span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{product.location}</span>
            </div>
          </div>

          <Separator />

          {/* Shipping Estimation */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-500" />
              Estimasi Pengiriman
            </h3>
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Dari</span>
                  <span className="font-medium text-gray-700">{product.location}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Ke</span>
                  <span className="font-medium text-gray-700 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-500" />
                    {user.city}
                  </span>
                </div>
                {shipping && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Jarak</span>
                      <span className="font-medium text-gray-700">
                        {shipping.distance > 0 ? `~${shipping.distance} km` : 'Kota yang sama'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Ongkos Kirim</span>
                      <span className={`font-bold ${shipping.cost === 0 ? 'text-emerald-600' : 'text-gray-800'}`}>
                        {formatShippingInfo(shipping)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Estimasi</span>
                      <span className="text-gray-700">{shipping.estimatedDays}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Kurir</span>
                      <span className="text-gray-700">{shipping.courier}</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-gray-500 mb-2">Login untuk melihat estimasi ongkir</p>
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => setLoginModalOpen(true)}
                >
                  <Lock className="w-3 h-3 mr-1" />
                  Login Sekarang
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Seller Info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-50">
              <Store className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm text-gray-800">
                {product.seller || 'Toko Official'}
              </span>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span>{product.sellerRating || 4.5}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Variants Section */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Varian</label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <Button
                    key={variant}
                    variant="outline"
                    size="sm"
                    className={
                      selectedVariant === variant
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700'
                        : 'text-gray-600 hover:text-gray-800'
                    }
                    onClick={() => setSelectedVariant(variant)}
                  >
                    {variant}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Section */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Jumlah</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center border rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-none hover:bg-gray-100"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= minOrder}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-sm font-medium tabular-nums">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-none hover:bg-gray-100"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= stock}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-xs text-gray-400">
                Min. pembelian {minOrder} pcs
              </span>
            </div>
          </div>

          {/* Stock Info */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Package className="h-4 w-4" />
            <span>Stok: {stock.toLocaleString('id-ID')} pcs</span>
          </div>

          <Separator />

          {/* Description Tabs */}
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="description" className="flex-1">Deskripsi</TabsTrigger>
              <TabsTrigger value="shipping" className="flex-1">Info Pengiriman</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="mt-3">
              <p className="text-sm text-gray-600 leading-relaxed">
                {product.description || 'Tidak ada deskripsi untuk produk ini.'}
              </p>
            </TabsContent>
            <TabsContent value="shipping" className="mt-3">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 shrink-0 mt-0.5">
                    <Truck className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Gratis Ongkir</p>
                    <p className="text-xs text-gray-500">Untuk pembelian di atas {formatPrice(100000)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Garansi 100% Original</p>
                    <p className="text-xs text-gray-500">Produk dijamin original dan berkualitas</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 shrink-0 mt-0.5">
                    <RotateCcw className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Pengembalian 7 Hari</p>
                    <p className="text-xs text-gray-500">Bisa dikembalikan dalam 7 hari setelah diterima</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Separator />
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="border-t bg-white p-4 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Total Harga</span>
            <span className="text-lg font-bold text-emerald-600">
              {formatPrice(totalPrice + (shipping ? shipping.cost : 0))}
            </span>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">
              {quantity} x {formatPrice(product.price)}
            </div>
            {shipping && shipping.cost > 0 && (
              <div className="text-xs text-gray-400">+ ongkir {formatPrice(shipping.cost)}</div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
            onClick={handleAddToCart}
          >
            {!user ? (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Login untuk Beli
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Tambah ke Keranjang
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-semibold"
            onClick={() => {
              if (!user) {
                setLoginModalOpen(true);
                return;
              }
            }}
          >
            Beli Sekarang
          </Button>
        </div>
      </div>
    </>
  );
}

export function ProductDetail({ product, open, onOpenChange }: ProductDetailProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg md:max-w-2xl p-0 flex flex-col gap-0 overflow-hidden"
      >
        {product && <ProductDetailInner key={product.id} product={product} />}
      </SheetContent>
    </Sheet>
  );
}
