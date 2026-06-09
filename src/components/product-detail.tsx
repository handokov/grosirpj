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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useUIStore } from '@/store/ui';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useWishlistStore } from '@/store/wishlist';
import { calculateShipping, formatShippingInfo } from '@/lib/shipping';
import { formatPrice } from '@/lib/constants';
import {
  Star, MapPin, Minus, Plus, Truck, Shield, RotateCcw,
  ChevronLeft, ChevronRight, Store, Package, Lock, MessageCircle, Users, Heart,
} from 'lucide-react';
import { toast } from 'sonner';

interface VariantGroup {
  id: string;
  name: string;
  order: number;
  options: { id: string; value: string }[];
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: { id: string; name: string };
}

interface ProductDetailData {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  category: string;
  images: string[];
  minOrder: number;
  stock: number;
  location: string;
  sold: number;
  rating: number;
  sellerId: string;
  seller: { name: string; storeName?: string; storeDescription?: string; city?: string };
  variantGroups: VariantGroup[];
  reviews: Review[];
  reviewCount: number;
  discount: number;
  averageRating: number;
}

export function ProductDetail() {
  const productDetailOpen = useUIStore((s) => s.productDetailOpen);
  const selectedProductId = useUIStore((s) => s.selectedProductId);
  const closeProductDetail = useUIStore((s) => s.closeProductDetail);
  const openChat = useUIStore((s) => s.openChat);

  const addItem = useCartStore((s) => s.addItem);
  const user = useAuthStore((s) => s.user);
  const setLoginModalOpen = useAuthStore((s) => s.setLoginModalOpen);
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const isWishlisted = useWishlistStore((s) => s.isWishlisted);

  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Fetch product detail
  useEffect(() => {
    if (!selectedProductId || !productDetailOpen) {
      setProduct(null);
      return;
    }

    let cancelled = false;
    // Start loading via async flow
    const loadProduct = async () => {
      // Use Promise.resolve to schedule setState after the effect
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setQuantity(1);
      setCurrentImageIndex(0);
      setSelectedVariants({});

      try {
        const res = await fetch(`/api/products/${selectedProductId}`);
        const data = await res.json();
        if (cancelled) return;
        setProduct(data);
        // Auto-select first variant in each group
        if (data.variantGroups) {
          const autoSelected: Record<string, string> = {};
          for (const group of data.variantGroups) {
            if (group.options.length > 0) {
              autoSelected[group.name] = group.options[0].value;
            }
          }
          setSelectedVariants(autoSelected);
        }
        if (data.minOrder) setQuantity(data.minOrder);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadProduct();
    return () => { cancelled = true; };
  }, [selectedProductId, productDetailOpen]);

  const shipping = user && product ? calculateShipping(product.location, user.city) : null;
  const totalPrice = product ? quantity * product.price : 0;
  const images = product?.images?.length ? product.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop'];

  const handleVariantSelect = useCallback((groupName: string, value: string) => {
    setSelectedVariants((prev) => ({ ...prev, [groupName]: value }));
  }, []);

  const handleQuantityChange = (delta: number) => {
    if (!product) return;
    const newQty = quantity + delta;
    if (newQty >= (product.minOrder || 1) && newQty <= product.stock) {
      setQuantity(newQty);
    }
  };

  const handleAddToCart = () => {
    if (!user) {
      setLoginModalOpen(true);
      toast.error('Silakan login terlebih dahulu');
      return;
    }
    if (!product) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: images[0],
      quantity,
      minOrder: product.minOrder || 1,
      stock: product.stock,
      location: product.location,
      sellerId: product.sellerId,
      sellerName: product.seller?.storeName || product.seller?.name || 'Seller',
      selectedVariants,
    });
    toast.success('Produk ditambahkan ke keranjang');
  };

  const handleBuyNow = () => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    handleAddToCart();
    // Open cart after adding
    const { openCart } = useUIStore.getState();
    setTimeout(() => openCart(), 300);
  };

  const handleChatSeller = () => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    if (product) {
      openChat(product.sellerId);
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    if (!product) return;
    const added = await toggleWishlist(user.id, product.id);
    toast.success(added ? 'Ditambahkan ke wishlist' : 'Dihapus dari wishlist');
  };

  const handleSubmitReview = async () => {
    if (!user || !product) return;
    if (reviewRating < 1 || reviewRating > 5) {
      toast.error('Rating harus antara 1-5');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          userId: user.id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal mengirim ulasan');
        return;
      }
      toast.success('Ulasan berhasil dikirim!');
      setReviewComment('');
      setReviewRating(5);
      // Refresh product to show new review
      const refreshRes = await fetch(`/api/products/${product.id}`);
      const refreshed = await refreshRes.json();
      if (refreshRes.ok) setProduct(refreshed);
    } catch {
      toast.error('Gagal mengirim ulasan');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <Sheet open={productDetailOpen} onOpenChange={(open) => { if (!open) closeProductDetail(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg md:max-w-2xl p-0 flex flex-col gap-0 overflow-hidden">
        {loading ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Skeleton className="w-full h-64" />
            <div className="p-4 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ) : product ? (
          <>
            <SheetHeader className="sr-only">
              <SheetTitle>{product.name}</SheetTitle>
              <SheetDescription>Detail produk {product.name}</SheetDescription>
            </SheetHeader>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {/* Image Section */}
              <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden shrink-0">
                <img
                  src={images[currentImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {product.discount > 0 && (
                  <Badge className="absolute top-3 left-3 bg-red-500 text-white hover:bg-red-600 text-xs font-bold px-2 py-1">
                    -{product.discount}%
                  </Badge>
                )}
                <button
                  className="absolute top-3 right-3 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all shadow-sm"
                  onClick={handleToggleWishlist}
                  aria-label="Tambah ke wishlist"
                >
                  <Heart className={`w-5 h-5 ${isWishlisted(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
                </button>
                {images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8"
                      onClick={() => setCurrentImageIndex((prev) => prev > 0 ? prev - 1 : images.length - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8"
                      onClick={() => setCurrentImageIndex((prev) => prev < images.length - 1 ? prev + 1 : 0)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    {/* Image dots */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                          onClick={() => setCurrentImageIndex(idx)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Info Section */}
              <div className="p-4 space-y-4">
                {/* Product Name */}
                <h2 className="font-display font-bold text-xl leading-tight">{product.name}</h2>

                {/* Price */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-emerald-600 font-bold text-2xl">{formatPrice(product.price)}</span>
                  {product.originalPrice > product.price && (
                    <>
                      <span className="text-gray-400 line-through text-sm">{formatPrice(product.originalPrice)}</span>
                      <Badge variant="secondary" className="bg-red-50 text-red-600 text-xs font-semibold">-{product.discount}%</Badge>
                    </>
                  )}
                </div>

                {/* Rating, Sold, Location */}
                <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-gray-700">{product.averageRating?.toFixed(1) || product.rating?.toFixed(1) || 'Baru'}</span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /><span>{product.sold.toLocaleString('id-ID')} terjual</span></div>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /><span>{product.location}</span></div>
                </div>

                <Separator />

                {/* Shipping Estimation */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-500" /> Estimasi Pengiriman
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
                          <MapPin className="w-3 h-3 text-emerald-500" />{user.city}
                        </span>
                      </div>
                      {shipping && (
                        <>
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
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-sm text-gray-500 mb-2">Login untuk melihat estimasi ongkir</p>
                      <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setLoginModalOpen(true)}>
                        <Lock className="w-3 h-3 mr-1" /> Login Sekarang
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Seller Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50">
                      <Store className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <span className="font-medium text-sm text-gray-800">{product.seller?.storeName || product.seller?.name || 'Toko Official'}</span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        <span>{product.seller?.city || product.location}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                    onClick={handleChatSeller}
                  >
                    <MessageCircle className="w-4 h-4 mr-1" /> Chat
                  </Button>
                </div>

                <Separator />

                {/* Multi-Variant Group Selection */}
                {product.variantGroups && product.variantGroups.length > 0 && (
                  <div className="space-y-4">
                    {product.variantGroups.map((group) => (
                      <div key={group.id} className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">
                          {group.name}: <span className="font-normal text-emerald-600">{selectedVariants[group.name] || 'Pilih'}</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {group.options.map((option) => (
                            <Button
                              key={option.id}
                              variant="outline"
                              size="sm"
                              className={
                                selectedVariants[group.name] === option.value
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700'
                                  : 'text-gray-600 hover:text-gray-800'
                              }
                              onClick={() => handleVariantSelect(group.name, option.value)}
                            >
                              {option.value}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quantity */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Jumlah</label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border rounded-lg overflow-hidden">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-none hover:bg-gray-100"
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= (product.minOrder || 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-12 text-center text-sm font-medium tabular-nums">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-none hover:bg-gray-100"
                        onClick={() => handleQuantityChange(1)}
                        disabled={quantity >= product.stock}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-xs text-gray-400">Min. pembelian {product.minOrder || 1} pcs</span>
                  </div>
                </div>

                {/* Stock Info */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Package className="h-4 w-4" />
                  <span>Stok: {product.stock.toLocaleString('id-ID')} pcs</span>
                </div>

                <Separator />

                {/* Description & Shipping Info Tabs */}
                <Tabs defaultValue="description" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="description" className="flex-1">Deskripsi</TabsTrigger>
                    <TabsTrigger value="shipping" className="flex-1">Info Pengiriman</TabsTrigger>
                    <TabsTrigger value="reviews" className="flex-1">Ulasan ({product.reviewCount || 0})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="description" className="mt-3">
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
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
                  <TabsContent value="reviews" className="mt-3">
                    {/* Review Submission Form */}
                    {user && (
                      <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700">Tulis Ulasan</h4>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setReviewRating(i + 1)}
                              className="p-0.5"
                              aria-label={`Rating ${i + 1}`}
                            >
                              <Star className={`w-6 h-6 cursor-pointer transition-colors ${i < reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                            </button>
                          ))}
                          <span className="text-sm text-gray-500 ml-2">{reviewRating}/5</span>
                        </div>
                        <textarea
                          placeholder="Bagikan pengalaman Anda tentang produk ini..."
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300"
                          rows={3}
                        />
                        <Button
                          size="sm"
                          onClick={handleSubmitReview}
                          disabled={submittingReview}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                        >
                          {submittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
                        </Button>
                      </div>
                    )}
                    {product.reviews && product.reviews.length > 0 ? (
                      <div className="space-y-4">
                        {product.reviews.map((review) => (
                          <div key={review.id} className="border border-gray-100 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-bold text-emerald-700">{review.user?.name?.charAt(0)?.toUpperCase() || '?'}</span>
                                </div>
                                <span className="text-sm font-medium text-gray-800">{review.user?.name || 'User'}</span>
                              </div>
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                                ))}
                              </div>
                            </div>
                            {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-400">
                        <Star className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">Belum ada ulasan untuk produk ini</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
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
                  <div className="text-xs text-gray-400">{quantity} x {formatPrice(product.price)}</div>
                  {shipping && shipping.cost > 0 && (
                    <div className="text-xs text-gray-400">+ ongkir {formatPrice(shipping.cost)}</div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl"
                  onClick={handleAddToCart}
                >
                  {!user ? 'Login untuk Beli' : 'Tambah ke Keranjang'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-semibold rounded-xl"
                  onClick={handleBuyNow}
                >
                  Beli Sekarang
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-gray-400">
            <p>Pilih produk untuk melihat detail</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
