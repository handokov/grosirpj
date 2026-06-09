'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Search, ShoppingCart, Bell, Upload, Menu, X, Star,
  ChevronRight, ChevronDown, ChevronLeft, Play, MapPin, Minus, Plus,
  Truck, Shield, RotateCcw, Store, Users, Package, Heart,
  MessageCircle, LogOut, User, ClipboardList, ArrowRight,
  Ticket, ShoppingBag, Sparkles, CreditCard, Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useUIStore } from '@/store/ui';
import { useWishlistStore } from '@/store/wishlist';
import { useNotificationStore } from '@/store/notification';
import { CATEGORIES, formatPrice } from '@/lib/constants';
import { calculateShipping } from '@/lib/shipping';

// Import components
import { ProductGrid } from '@/components/product-grid';
import { ProductDetail } from '@/components/product-detail';
import { CartSidebar } from '@/components/cart-sidebar';
import { CheckoutFlow } from '@/components/checkout-flow';
import { OrderHistory } from '@/components/order-history';
import { ChatPanel } from '@/components/chat-panel';
import { AuthModal } from '@/components/auth-modal';
import { SellerDashboard } from '@/components/seller-dashboard';
import { Footer } from '@/components/footer';

// ===== BANNER DATA =====
const BANNERS = [
  {
    title: 'Flash Sale Grosir',
    subtitle: 'Diskon hingga 90% untuk produk pilihan',
    badge: '🔥 Flash Sale',
    gradient: 'from-orange-500 to-red-500',
    bgGradient: 'from-orange-600 via-red-500 to-orange-500',
    image: '/banners/banner1.png',
  },
  {
    title: 'Gratis Ongkir',
    subtitle: 'Pengiriman gratis ke seluruh Indonesia',
    badge: '🚚 Gratis Ongkir',
    gradient: 'from-emerald-500 to-teal-500',
    bgGradient: 'from-emerald-600 via-teal-500 to-emerald-500',
    image: '/banners/banner2.png',
  },
  {
    title: 'Mulai Jual Sekarang',
    subtitle: 'Daftar gratis, tanpa potongan!',
    badge: '🛍️ Jual di GrosirPJ',
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-600 via-pink-500 to-purple-500',
    image: '/banners/banner3.png',
  },
  {
    title: 'Promo Harian',
    subtitle: 'Cek setiap hari untuk penawaran terbaik',
    badge: '⭐ Promo Hari Ini',
    gradient: 'from-cyan-500 to-blue-500',
    bgGradient: 'from-cyan-600 via-blue-500 to-cyan-500',
    image: '/banners/banner4.png',
  },
];

// ===== QUICK ACCESS DATA =====
const QUICK_ACCESS = [
  { icon: Zap, label: 'Flash Sale', color: 'bg-red-500' },
  { icon: Truck, label: 'Gratis Ongkir', color: 'bg-emerald-500' },
  { icon: Ticket, label: 'Voucher', color: 'bg-orange-500' },
  { icon: ShoppingBag, label: 'Belanja', color: 'bg-cyan-500' },
  { icon: Sparkles, label: 'Produk Baru', color: 'bg-purple-500' },
  { icon: CreditCard, label: 'Bayar Tempat', color: 'bg-amber-500' },
  { icon: Store, label: 'Official Store', color: 'bg-pink-500' },
  { icon: Shield, label: 'Garansi', color: 'bg-teal-500' },
  { icon: Smartphone, label: 'Top Up', color: 'bg-indigo-500' },
  { icon: Heart, label: 'Wishlist', color: 'bg-rose-500' },
];

// ===== FLASH SALE COUNTDOWN =====
function FlashSaleTimer() {
  const [time, setTime] = useState({ hours: 8, minutes: 45, seconds: 30 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((prev) => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <span className="text-white/80 text-sm">Berakhir dalam</span>
      <div className="flex gap-2">
        {[
          { val: time.hours, label: 'Jam' },
          { val: time.minutes, label: 'Menit' },
          { val: time.seconds, label: 'Detik' },
        ].map((item) => (
          <div key={item.label} className="bg-emerald-800/60 px-3 py-2 rounded-lg text-center min-w-[50px]">
            <span className="font-display text-xl font-bold text-white">{item.val.toString().padStart(2, '0')}</span>
            <p className="text-xs text-white/70">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== FLASH SALE PRODUCT CARD =====
interface FlashProduct {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  images: string[];
  discount: number;
  sold: number;
  rating: number;
  location: string;
  category: string;
}

function FlashSaleSection() {
  const [products, setProducts] = useState<FlashProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const openProductDetail = useUIStore((s) => s.openProductDetail);

  useEffect(() => {
    fetch('/api/products?sortBy=popular&limit=8')
      .then(res => res.json())
      .then(data => {
        const flashProducts = (data.products || []).filter((p: FlashProduct) => p.discount > 0).slice(0, 6);
        setProducts(flashProducts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || products.length === 0) return null;

  return (
    <section className="py-12 bg-gradient-to-r from-emerald-600 to-emerald-500 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white font-display">Flash Sale</h2>
              <p className="text-emerald-100">Diskon hingga 90%</p>
            </div>
          </div>
          <FlashSaleTimer />
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex-shrink-0 w-44 md:w-52 bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
              onClick={() => openProductDetail(product.id)}
            >
              <div className="relative">
                <img
                  src={product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop'}
                  alt={product.name}
                  className="w-full h-32 md:h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                  -{product.discount}%
                </span>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 h-10">{product.name}</h3>
                <p className="text-emerald-600 font-bold">{formatPrice(product.price)}</p>
                <p className="text-xs text-gray-400 line-through">{formatPrice(product.originalPrice)}</p>
                <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full" style={{ width: `${Math.min((product.sold / 5000) * 100, 90)}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{product.sold.toLocaleString('id-ID')} terjual</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== BANNER CAROUSEL =====
function BannerCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index: number) => setCurrent(index);
  const prev = () => setCurrent((c) => (c - 1 + BANNERS.length) % BANNERS.length);
  const next = () => setCurrent((c) => (c + 1) % BANNERS.length);

  return (
    <section className="pb-2 relative overflow-hidden">
      {/* Dynamic background gradient that changes with each banner */}
      {BANNERS.map((banner, i) => (
        <div
          key={i}
          className={`absolute inset-0 bg-gradient-to-br ${banner.bgGradient} transition-opacity duration-700`}
          style={{ top: '-5rem', opacity: i === current ? 1 : 0 }}
        />
      ))}
      {/* Per-banner decorative blurs that also transition */}
      {BANNERS.map((banner, i) => (
        <div
          key={`blur-${i}`}
          className="absolute transition-opacity duration-700"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <div className="absolute top-[-3rem] right-[10%] w-64 h-64 bg-white/15 rounded-full blur-3xl" />
          <div className="absolute top-[-1rem] left-[5%] w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        </div>
      ))}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-24">
        <div className="relative rounded-2xl overflow-hidden group h-[180px] md:h-[340px] shadow-xl">
          <div
            className="flex transition-transform duration-500 ease-in-out h-full"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {BANNERS.map((banner, i) => (
              <div key={i} className="relative w-full h-full flex-shrink-0 cursor-pointer">
                <img
                  alt={banner.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  src={banner.image}
                />
                <div className={`absolute inset-0 bg-gradient-to-r ${banner.gradient} opacity-40`} />
                <div className="relative z-10 flex flex-col justify-center h-full px-8 md:px-16 max-w-2xl">
                  <span className="inline-block w-fit px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-3">
                    {banner.badge}
                  </span>
                  <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-2 leading-tight drop-shadow-lg font-display">
                    {banner.title}
                  </h2>
                  <p className="text-white/90 text-sm md:text-lg mb-4 md:mb-6 drop-shadow-md">
                    {banner.subtitle}
                  </p>
                  <Button
                    className="w-fit px-6 py-2 md:px-8 md:py-3 bg-amber-400 text-gray-800 font-semibold rounded-xl hover:bg-amber-500 transition-colors text-sm md:text-base shadow-lg"
                    onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Selengkapnya <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Nav arrows */}
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-20"
            onClick={prev}
            aria-label="Previous banner"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-20"
            onClick={next}
            aria-label="Next banner"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                className={`transition-all duration-300 rounded-full ${
                  i === current ? 'w-8 h-3 bg-white' : 'w-3 h-3 bg-white/50 hover:bg-white/70'
                }`}
                onClick={() => goTo(i)}
                aria-label={`Go to banner ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== QUICK ACCESS SECTION =====
function QuickAccess() {
  return (
    <section className="py-4 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-5 md:grid-cols-10 gap-3 md:gap-4">
          {QUICK_ACCESS.map((item) => (
            <button
              key={item.label}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50 transition-all hover:scale-105 active:scale-95"
              onClick={() => {
                if (item.label === 'Flash Sale') {
                  document.getElementById('flash-sale')?.scrollIntoView({ behavior: 'smooth' });
                } else if (item.label === 'Belanja' || item.label === 'Produk Baru') {
                  document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <div className={`w-11 h-11 md:w-12 md:h-12 ${item.color} rounded-2xl flex items-center justify-center shadow-md`}>
                <item.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <span className="text-[10px] md:text-xs font-medium text-gray-700 text-center leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== CATEGORY SECTION =====
function CategorySection() {
  const setActiveCategory = useUIStore((s) => s.setActiveCategory);

  const categoryItems = [
    { label: 'Fashion Pria', icon: 'M15 11l-3 3-3-3', color: 'from-blue-500 to-blue-600' },
    { label: 'Fashion Wanita', icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z', color: 'from-pink-500 to-pink-600' },
    { label: 'Elektronik', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', color: 'from-cyan-500 to-cyan-600' },
    { label: 'Rumah Tangga', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', color: 'from-amber-500 to-amber-600' },
    { label: 'Kecantikan', icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z', color: 'from-purple-500 to-purple-600' },
    { label: 'Kesehatan', icon: 'M22 12h-4l-3 9L9 3l-3 9H2', color: 'from-green-500 to-green-600' },
    { label: 'Olahraga', icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', color: 'from-orange-500 to-orange-600' },
    { label: 'Mainan', icon: 'M12 2L2 7l10 5 10-5-10-5z', color: 'from-red-500 to-red-600' },
  ];

  return (
    <section id="categories" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 font-display">Kategori Populer</h2>
            <p className="text-gray-500 mt-1">Temukan produk berdasarkan kategori favorit</p>
          </div>
          <a className="hidden md:flex items-center gap-2 text-emerald-600 font-medium hover:text-emerald-700 transition-colors cursor-pointer">
            Lihat Semua <ChevronRight className="w-4 h-4" />
          </a>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {categoryItems.map((cat) => (
            <a
              key={cat.label}
              href="#"
              className="category-card flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 transition-all hover:scale-105"
              onClick={(e) => {
                e.preventDefault();
                const catValue = cat.label.toLowerCase().replace(/\s+/g, '');
                setActiveCategory(catValue === 'fashionpria' || catValue === 'fashionwanita' ? 'fashion' : catValue === 'rumahtangga' ? 'rumah' : catValue);
                document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <div className={`category-icon w-14 h-14 bg-gradient-to-br ${cat.color} rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 hover:rotate-3`}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cat.icon} />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">{cat.label}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== NAVBAR (Shopee-like) =====
function Navbar() {
  const [mobileSearch, setMobileSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const setLoginModalOpen = useAuthStore((s) => s.setLoginModalOpen);
  const logout = useAuthStore((s) => s.logout);
  const setSellerMode = useAuthStore((s) => s.setSellerMode);
  const sellerMode = useAuthStore((s) => s.sellerMode);

  const cartCount = useCartStore((s) => s.getCount());
  const openCart = useUIStore((s) => s.openCart);
  const openOrderHistory = useUIStore((s) => s.openOrderHistory);
  const openChat = useUIStore((s) => s.openChat);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);

  const wishlistCount = useWishlistStore((s) => s.items.length);
  const fetchWishlist = useWishlistStore((s) => s.fetchWishlist);

  const unreadNotifs = useNotificationStore((s) => s.unreadCount);
  const notifications = useNotificationStore((s) => s.notifications);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  // Fetch wishlist & notifications when user logs in
  useEffect(() => {
    if (user) {
      fetchWishlist(user.id);
      fetchNotifications(user.id);
    }
  }, [user, fetchWishlist, fetchNotifications]);

  const handleSearch = () => {
    if (mobileSearch.trim()) {
      setSearchQuery(mobileSearch.trim());
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-emerald-600/40 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center transform group-hover:rotate-6 transition-transform">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-white font-display">GrosirPJ</span>
            </a>

            {/* Desktop Search */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="search-bar w-full flex items-center bg-white/90 rounded-full overflow-hidden transition-all focus-within:ring-2 focus-within:ring-white/50 shadow-md">
                <input
                  type="text"
                  placeholder="Cari produk grosir murah..."
                  className="flex-1 px-5 py-3 text-sm focus:outline-none bg-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSearchQuery((e.target as HTMLInputElement).value);
                      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                />
                <button
                  className="px-5 py-3 bg-amber-400 hover:bg-amber-500 text-gray-800 transition-colors rounded-r-full font-semibold text-sm"
                  onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Nav Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => {
                  if (!user) {
                    setLoginModalOpen(true);
                    localStorage.setItem('grosirpj_pending_seller', 'true');
                    return;
                  }
                  setSellerMode(true);
                }}
                className="flex items-center gap-2 px-2 sm:px-4 py-2 text-white/90 hover:text-white border border-white/30 rounded-full transition-colors cursor-pointer hover:bg-white/10"
              >
                <Upload className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">Jual</span>
              </button>

              {/* Cart */}
              <button
                onClick={() => { if (user) openCart(); else setLoginModalOpen(true); }}
                className="relative p-2 text-white/90 hover:text-white transition-colors"
              >
                <ShoppingCart className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{cartCount}</span>
                )}
              </button>

              {/* Chat */}
              <button
                onClick={() => { if (user) openChat(); else setLoginModalOpen(true); }}
                className="relative p-2 text-white/90 hover:text-white transition-colors"
              >
                <MessageCircle className="w-6 h-6" />
              </button>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  className="relative p-2 text-white/90 hover:text-white transition-colors hidden sm:block"
                  onClick={() => {
                    if (!user) { setLoginModalOpen(true); return; }
                    setNotifOpen(!notifOpen);
                  }}
                  title="Notifikasi"
                >
                  <Bell className="w-6 h-6" />
                  {unreadNotifs > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{unreadNotifs}</span>
                  )}
                </button>
                {notifOpen && user && (
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-96 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-sm text-gray-800">Notifikasi</h3>
                      {unreadNotifs > 0 && (
                        <button
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                          onClick={() => markAllAsRead(user.id)}
                        >
                          Tandai semua dibaca
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 text-sm">Belum ada notifikasi</div>
                      ) : (
                        notifications.slice(0, 10).map((notif) => (
                          <button
                            key={notif.id}
                            className={`w-full text-left p-3 hover:bg-gray-50 border-b border-gray-50 transition-colors ${!notif.read ? 'bg-emerald-50/50' : ''}`}
                            onClick={() => { if (!notif.read) markAsRead(notif.id); }}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!notif.read ? 'bg-emerald-500' : 'bg-transparent'}`} />
                              <div>
                                <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                                <p className="text-[10px] text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full">
                    <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
                      <span className="text-gray-800 text-xs font-bold">{user.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-white max-w-[80px] truncate">{user.name}</span>
                  </div>
                  <button onClick={logout} className="p-2 text-white/60 hover:text-red-300 transition-colors" title="Keluar">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setLoginModalOpen(true)}
                  className="bg-amber-400 hover:bg-amber-500 text-gray-800 font-semibold rounded-full px-4 md:px-6 py-2 transition-colors text-sm"
                >
                  Masuk
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Search */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-emerald-600/40 backdrop-blur-lg px-4 py-2.5">
        <div className="flex items-center bg-white/90 rounded-full overflow-hidden focus-within:ring-2 focus-within:ring-white/50 shadow-md">
          <input
            type="text"
            placeholder="Cari produk..."
            value={mobileSearch}
            onChange={(e) => setMobileSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            className="flex-1 px-4 py-2.5 text-sm bg-transparent focus:outline-none"
          />
          <button onClick={handleSearch} className="p-2.5 bg-amber-400 text-gray-800 rounded-r-full">
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
}

// ===== PROMO BANNERS =====
function PromoBanners() {
  const setLoginModalOpen = useAuthStore((s) => s.setLoginModalOpen);
  const setSellerMode = useAuthStore((s) => s.setSellerMode);
  const user = useAuthStore((s) => s.user);

  const promos = [
    {
      title: 'Gratis Ongkir',
      desc: 'Gratis ongkir ke seluruh Indonesia',
      gradient: 'from-emerald-500 to-teal-500',
      icon: Truck,
    },
    {
      title: 'Mulai Jual',
      desc: 'Daftar gratis, tanpa potongan!',
      gradient: 'from-purple-500 to-pink-500',
      icon: Store,
    },
    {
      title: 'Voucher Harian',
      desc: 'Klaim voucher diskon setiap hari',
      gradient: 'from-orange-500 to-amber-500',
      icon: Ticket,
    },
    {
      title: 'Garansi 100%',
      desc: 'Produk dijamin original & berkualitas',
      gradient: 'from-cyan-500 to-blue-500',
      icon: Shield,
    },
  ];

  return (
    <section id="promo" className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {promos.map((promo) => (
            <div
              key={promo.title}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 group cursor-pointer hover:scale-[1.02] transition-transform"
              onClick={() => {
                if (promo.title === 'Mulai Jual') {
                  if (!user) {
                    setLoginModalOpen(true);
                    localStorage.setItem('grosirpj_pending_seller', 'true');
                  } else {
                    setSellerMode(true);
                  }
                } else {
                  document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${promo.gradient}`} />
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
              <div className="relative z-10">
                <promo.icon className="w-8 h-8 text-white mb-3" />
                <h3 className="text-lg md:text-xl font-bold text-white font-display">{promo.title}</h3>
                <p className="text-white/80 text-sm">{promo.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== RECOMMENDATION SECTION =====
function RecommendationSection() {
  const [products, setProducts] = useState<FlashProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const openProductDetail = useUIStore((s) => s.openProductDetail);

  useEffect(() => {
    fetch('/api/products?sortBy=rating&limit=12')
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 font-display">Rekomendasi Untukmu</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="product-card bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg cursor-pointer group border border-gray-100"
              onClick={() => openProductDetail(product.id)}
            >
              <div className="relative overflow-hidden">
                <img
                  src={product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop'}
                  alt={product.name}
                  className="product-image w-full h-36 md:h-44 object-cover"
                  loading="lazy"
                />
                {product.discount > 0 && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
                    -{product.discount}%
                  </span>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-1 h-10">{product.name}</h3>
                <p className="text-base font-bold text-emerald-600">{formatPrice(product.price)}</p>
                {product.originalPrice > product.price && (
                  <p className="text-xs text-gray-400 line-through">{formatPrice(product.originalPrice)}</p>
                )}
                <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{product.rating > 0 ? product.rating.toFixed(1) : 'Baru'}</span>
                  <span>· {product.sold.toLocaleString('id-ID')} terjual</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== FLOATING CHAT BUTTON =====
function FloatingChatButton() {
  const user = useAuthStore((s) => s.user);
  const setLoginModalOpen = useAuthStore((s) => s.setLoginModalOpen);
  const openChat = useUIStore((s) => s.openChat);

  return (
    <button
      onClick={() => { if (user) openChat(); else setLoginModalOpen(true); }}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110"
      aria-label="Chat"
    >
      <MessageCircle className="w-6 h-6" />
    </button>
  );
}

// ===== MAIN PAGE =====
export default function Home() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const sellerMode = useAuthStore((s) => s.sellerMode);
  const setSellerMode = useAuthStore((s) => s.setSellerMode);
  const initAuth = useAuthStore((s) => s.init);

  // Init auth on mount
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Auto-enable seller mode after login if pending
  useEffect(() => {
    if (user && user.role === 'seller' && !sellerMode) {
      const pending = localStorage.getItem('grosirpj_pending_seller');
      if (pending === 'true') {
        localStorage.removeItem('grosirpj_pending_seller');
        setSellerMode(true);
      }
    }
  }, [user, sellerMode, setSellerMode]);

  // Ensure database is seeded (auto-seeds on Vercel via ensureDb)
  useEffect(() => {
    fetch('/api/seed')
      .then(res => res.json())
      .then((data) => {
        if (data.success) {
          console.log('Database ready:', data.data?.users?.total || 0, 'users');
        }
      })
      .catch(console.error);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0fdf4]">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <p className="text-gray-500">Memuat...</p>
        </div>
      </div>
    );
  }

  // ===== SELLER MODE =====
  if (sellerMode) {
    return <SellerDashboard onBack={() => setSellerMode(false)} />;
  }

  // ===== BUYER MODE =====
  return (
    <div className="min-h-screen flex flex-col bg-[#f0fdf4]">
      <Navbar />
      <main className="flex-1">
        <BannerCarousel />
        <QuickAccess />
        <FlashSaleSection />
        <CategorySection />
        <ProductGrid />
        <PromoBanners />
        <RecommendationSection />
      </main>
      <Footer />

      {/* Floating Chat Button */}
      <FloatingChatButton />

      {/* ===== SHEET/DIALOG OVERLAYS ===== */}
      <ProductDetail />
      <CartSidebar />
      <CheckoutFlow />
      <OrderHistory />
      <ChatPanel />
      <AuthModal />
    </div>
  );
}
