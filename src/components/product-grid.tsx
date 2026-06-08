'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, MapPin, ShoppingCart, ChevronDown, Search, SlidersHorizontal, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useUIStore } from '@/store/ui';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useWishlistStore } from '@/store/wishlist';
import { CATEGORIES, formatPrice } from '@/lib/constants';
import { toast } from 'sonner';

interface ProductResponse {
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
  active: boolean;
  sold: number;
  rating: number;
  sellerId: string;
  seller: { name: string; storeName?: string; city?: string };
  variantGroups: { id: string; name: string; order: number; options: { id: string; value: string }[] }[];
  reviewCount: number;
  discount: number;
  createdAt: string;
}

interface ProductGridProps {
  flashSaleIds?: string[];
}

const SORT_OPTIONS = [
  { value: 'popular', label: 'Terlaris' },
  { value: 'price-asc', label: 'Harga Terendah' },
  { value: 'price-desc', label: 'Harga Tertinggi' },
  { value: 'rating', label: 'Rating Tertinggi' },
  { value: 'newest', label: 'Terbaru' },
];

const FILTER_TABS = [
  { key: 'all', label: 'Semua' },
  { key: 'fashion', label: 'Fashion' },
  { key: 'elektronik', label: 'Elektronik' },
  { key: 'rumah', label: 'Rumah Tangga' },
  { key: 'kecantikan', label: 'Kecantikan' },
  { key: 'kesehatan', label: 'Kesehatan' },
  { key: 'olahraga', label: 'Olahraga' },
  { key: 'mainan', label: 'Mainan' },
  { key: 'makanan', label: 'Makanan' },
];

export function ProductGrid({ flashSaleIds = [] }: ProductGridProps) {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [mobileSearch, setMobileSearch] = useState('');

  const activeCategory = useUIStore((s) => s.activeCategory);
  const sortBy = useUIStore((s) => s.sortBy);
  const currentPage = useUIStore((s) => s.currentPage);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setActiveCategory = useUIStore((s) => s.setActiveCategory);
  const setSortBy = useUIStore((s) => s.setSortBy);
  const setCurrentPage = useUIStore((s) => s.setCurrentPage);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const openProductDetail = useUIStore((s) => s.openProductDetail);

  const addItem = useCartStore((s) => s.addItem);
  const user = useAuthStore((s) => s.user);
  const setLoginModalOpen = useAuthStore((s) => s.setLoginModalOpen);
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const isWishlisted = useWishlistStore((s) => s.isWishlisted);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory !== 'all') params.set('category', activeCategory);
      if (sortBy) params.set('sortBy', sortBy);
      if (searchQuery) params.set('search', searchQuery);
      params.set('page', currentPage.toString());
      params.set('limit', '30');

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products || []);
        setTotalProducts(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, sortBy, searchQuery, currentPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleQuickAdd = (e: React.MouseEvent, product: ProductResponse) => {
    e.stopPropagation();
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    // Build selectedVariants from first option of each group
    const selectedVariants: Record<string, string> = {};
    if (product.variantGroups) {
      for (const group of product.variantGroups) {
        if (group.options.length > 0) {
          selectedVariants[group.name] = group.options[0].value;
        }
      }
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.images?.[0] || '',
      quantity: product.minOrder || 1,
      minOrder: product.minOrder || 1,
      stock: product.stock,
      location: product.location,
      sellerId: product.sellerId,
      sellerName: product.seller?.storeName || product.seller?.name || 'Seller',
      selectedVariants,
    });
    toast.success('Ditambahkan ke keranjang');
  };

  const handleToggleWishlist = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    const added = await toggleWishlist(user.id, productId);
    toast.success(added ? 'Ditambahkan ke wishlist' : 'Dihapus dari wishlist');
  };

  const handleMobileSearch = () => {
    if (mobileSearch.trim()) {
      setSearchQuery(mobileSearch.trim());
    }
  };

  // Flash sale products
  const flashSaleProducts = flashSaleIds.length > 0
    ? products.filter((p) => flashSaleIds.includes(p.id) && p.discount >= 40)
    : products.filter((p) => p.discount >= 40).slice(0, 6);

  return (
    <section id="products" className="py-10 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Produk Terlaris</h2>
              <p className="text-gray-500 mt-1">{totalProducts} produk tersedia</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Sort Dropdown */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] rounded-lg bg-white border-gray-200">
                  <SlidersHorizontal className="w-4 h-4 mr-2 text-gray-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari produk..."
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleMobileSearch(); }}
                className="pl-10 rounded-xl bg-white"
              />
            </div>
            <Button onClick={handleMobileSearch} className="bg-[#00A651] hover:bg-[#008F46] text-white rounded-lg px-4">
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all ${
                  activeCategory === tab.key
                    ? 'bg-[#00A651] text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
                onClick={() => setActiveCategory(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden">
                <Skeleton className="w-full h-40 md:h-48" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Produk tidak ditemukan</h3>
            <p className="text-gray-500 mb-4">Coba ubah filter atau kata kunci pencarian</p>
            <Button variant="outline" onClick={() => { setActiveCategory('all'); setSearchQuery(''); }} className="border-[#00A651] text-[#00A651] hover:bg-green-50 rounded-lg">
              Reset Filter
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="product-card bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg cursor-pointer group border border-gray-100"
                onClick={() => openProductDetail(product.id)}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop'}
                    alt={product.name}
                    className="product-image w-full h-40 md:h-48 object-cover"
                    loading="lazy"
                  />
                  {product.discount > 0 && (
                    <span className="absolute top-1 left-1 bg-[#FFC107] text-black text-[10px] font-bold px-1.5 py-0.5 rounded">
                      -{product.discount}%
                    </span>
                  )}
                  <button
                    className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all shadow-sm"
                    onClick={(e) => handleToggleWishlist(e, product.id)}
                    aria-label="Tambah ke wishlist"
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
                  </button>
                  <button
                    className="absolute bottom-2 right-2 w-8 h-8 bg-[#00A651] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#008F46] transition-all transform translate-y-2 group-hover:translate-y-0 shadow-md"
                    onClick={(e) => handleQuickAdd(e, product)}
                    aria-label="Tambah ke keranjang"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 md:p-4">
                  <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 h-10">{product.name}</h3>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base md:text-lg font-bold text-[#00A651]">{formatPrice(product.price)}</span>
                  </div>
                  {product.originalPrice > product.price && (
                    <span className="text-xs text-gray-400 line-through">{formatPrice(product.originalPrice)}</span>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{product.rating > 0 ? product.rating.toFixed(1) : 'Baru'}</span>
                    </div>
                    <span>{product.sold.toLocaleString('id-ID')} terjual</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                    <MapPin className="w-3 h-3" />
                    <span>{product.location}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More / Pagination */}
        {!loading && products.length > 0 && currentPage < totalPages && (
          <div className="text-center mt-10">
            <Button
              variant="outline"
              className="px-8 py-4 bg-white text-[#00A651] font-semibold rounded-lg border-2 border-[#00A651] hover:bg-green-50 transition-all inline-flex items-center gap-2"
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Lihat Lebih Banyak ({totalProducts - products.length} produk lagi) <ChevronDown className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
