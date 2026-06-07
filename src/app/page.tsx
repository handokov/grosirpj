'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Search, ShoppingCart, Bell, Upload, Menu, X, Star,
  ChevronRight, ChevronDown, Play, MapPin, Minus, Plus,
  Truck, Shield, RotateCcw, Store, Users, Package, Heart,
  MessageCircle, LogOut, User, ClipboardList, ArrowRight,
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
        // Pick products with discount
        const flashProducts = (data.products || []).filter((p: FlashProduct) => p.discount > 0).slice(0, 8);
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
              <p className="text-emerald-100">Diskon hingga 70%</p>
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

// ===== CATEGORY SECTION =====
function CategorySection() {
  const setActiveCategory = useUIStore((s) => s.setActiveCategory);

  return (
    <section id="categories" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 font-display">Kategori Populer</h2>
            <p className="text-gray-500 mt-1">Temukan produk berdasarkan kategori favorit</p>
          </div>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3 md:gap-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              className="category-card flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 transition-all hover:scale-105"
              onClick={() => {
                setActiveCategory(cat.value);
                document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <div className={`category-icon w-14 h-14 bg-gradient-to-br ${cat.color} rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 hover:rotate-3`}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cat.icon} />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== NAVBAR =====
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
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

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

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
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-md shadow-md border-b border-gray-200/50'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center transform group-hover:rotate-6 transition-transform">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-emerald-700 font-display">GrosirPJ</span>
          </a>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="search-bar w-full flex items-center bg-white rounded-full border border-gray-200 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-emerald-300">
              <input
                type="text"
                placeholder="Cari produk grosir murah..."
                className="flex-1 px-4 py-3 text-sm focus:outline-none"
                onKeyDown={(e) => { if (e.key === 'Enter') { setSearchQuery((e.target as HTMLInputElement).value); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); } }}
              />
              <button
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
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
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-emerald-600 transition-colors cursor-pointer"
            >
              <Upload className="w-5 h-5" />
              <span className="text-sm font-medium">Jual</span>
            </button>

            {/* Wishlist Button */}
            <button className="relative p-2 text-gray-600 hover:text-red-500 transition-colors" title="Wishlist">
              <Heart className="w-6 h-6" />
              {user && wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{wishlistCount}</span>
              )}
            </button>

            <button onClick={() => { if (user) openCart(); else setLoginModalOpen(true); }} className="relative p-2 text-gray-600 hover:text-emerald-600 transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{cartCount}</span>
              )}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                className="relative p-2 text-gray-600 hover:text-emerald-600 transition-colors"
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

            {user && (
              <>
                <button onClick={openOrderHistory} className="relative p-2 text-gray-600 hover:text-emerald-600 transition-colors hidden sm:block" title="Pesanan">
                  <ClipboardList className="w-6 h-6" />
                </button>
                <button onClick={() => openChat()} className="relative p-2 text-gray-600 hover:text-emerald-600 transition-colors hidden sm:block" title="Chat">
                  <MessageCircle className="w-6 h-6" />
                </button>
              </>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium text-emerald-700 max-w-[80px] truncate">{user.name}</span>
                  <MapPin className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600">{user.city}</span>
                </div>
                <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Keluar">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-full px-4 md:px-6 py-2 transition-colors"
              >
                Masuk
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center bg-gray-50 rounded-full border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-300">
          <input
            type="text"
            placeholder="Cari produk..."
            value={mobileSearch}
            onChange={(e) => setMobileSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            className="flex-1 px-4 py-2.5 text-sm bg-transparent focus:outline-none"
          />
          <button onClick={handleSearch} className="p-2.5 bg-emerald-500 text-white"><Search className="w-5 h-5" /></button>
        </div>
      </div>
    </nav>
  );
}

// ===== HERO SECTION =====
function HeroSection() {
  return (
    <section className="hero-bg pt-32 md:pt-24 pb-12 md:pb-20 relative overflow-hidden">
      <div className="absolute top-40 left-10 w-20 h-20 bg-amber-400/20 rounded-full blur-2xl float-1" />
      <div className="absolute top-60 right-20 w-32 h-32 bg-emerald-400/20 rounded-full blur-3xl float-2" />
      <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-cyan-400/20 rounded-full blur-2xl float-3" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full mb-6">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-emerald-700">Flash Sale Hari Ini</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6 font-display">
              Belanja Grosir{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">Mudah &amp; Murah</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg">
              Temukan ribuan produk grosir berkualitas dengan harga terbaik. Gratis ongkir, pembayaran aman, dan pengiriman cepat!
            </p>
            <div className="flex flex-wrap gap-4 mb-10">
              <Button
                className="btn-primary px-8 py-6 bg-emerald-500 text-white font-semibold rounded-2xl hover:bg-emerald-600 transition-all flex items-center gap-2 text-base"
                onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Mulai Belanja <ChevronRight className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                className="px-8 py-6 bg-white text-gray-700 font-semibold rounded-2xl border-gray-200 hover:border-emerald-300 hover:text-emerald-600 transition-all flex items-center gap-2 text-base"
              >
                <Play className="w-5 h-5" /> Cara Belanja
              </Button>
            </div>
            <div className="flex flex-wrap gap-8">
              {[
                { val: '50K+', label: 'Produk Aktif' },
                { val: '10K+', label: 'Seller Terpercaya' },
                { val: '99%', label: 'Kepuasan Pelanggan' },
              ].map((stat) => (
                <div key={stat.label} className="hover:scale-110 transition-transform cursor-default">
                  <p className="text-3xl font-bold text-gray-900 font-display">{stat.val}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block animate-scale-in">
            <div className="relative z-10">
              <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md mx-auto float-1">
                <div className="relative rounded-2xl overflow-hidden mb-4">
                  <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop" alt="Shopping" className="w-full h-48 object-cover" />
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-orange-400 px-3 py-1 rounded-full text-white text-sm font-semibold">Diskon 70%</div>
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2 font-display">Paket Grosir Fashion Wanita</h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl font-bold text-emerald-600">Rp 299.000</span>
                  <span className="text-sm text-gray-400 line-through">Rp 999.000</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium text-gray-700">4.9</span>
                    <span className="text-sm text-gray-400">(2.4k terjual)</span>
                  </div>
                  <button className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors">
                    <ShoppingCart className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="absolute -top-4 -right-8 bg-white rounded-2xl shadow-xl p-4 float-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Transaksi Sukses</p>
                    <p className="text-xs text-gray-500">Baru saja</p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-8 bg-white rounded-2xl shadow-xl p-4 float-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">+500 User</p>
                    <p className="text-xs text-gray-500">Hari ini</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== PROMO BANNERS =====
function PromoBanners() {
  const setLoginModalOpen = useAuthStore((s) => s.setLoginModalOpen);
  const setSellerMode = useAuthStore((s) => s.setSellerMode);
  const user = useAuthStore((s) => s.user);

  return (
    <section id="promo" className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 to-emerald-500 p-8 md:p-10 group cursor-pointer">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-white text-sm font-medium mb-4">Promo Spesial</span>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 font-display">Gratis Ongkir Seluruh Indonesia</h3>
              <p className="text-white/80 mb-6">Minimal pembelian Rp 100.000</p>
              <Button
                className="px-6 py-3 bg-white text-emerald-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Belanja Sekarang
              </Button>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-pink-500 p-8 md:p-10 group cursor-pointer">
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-white text-sm font-medium mb-4">New Seller</span>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 font-display">Mulai Jual di GrosirPJ</h3>
              <p className="text-white/80 mb-6">Gratis biaya pendaftaran, potongan 0%!</p>
              <Button
                className="px-6 py-3 bg-white text-orange-500 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                onClick={() => {
                  if (!user) {
                    setLoginModalOpen(true);
                    localStorage.setItem('grosirpj_pending_seller', 'true');
                  } else {
                    setSellerMode(true);
                  }
                }}
              >
                Daftar Sekarang
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== WHY CHOOSE US SECTION =====
function WhyChooseUs() {
  const features = [
    { icon: Truck, title: 'Gratis Ongkir', desc: 'Untuk pembelian di atas Rp 100.000 ke seluruh Indonesia', color: 'from-emerald-500 to-emerald-600' },
    { icon: Shield, title: 'Garansi Original', desc: 'Semua produk dijamin 100% original dan berkualitas', color: 'from-cyan-500 to-cyan-600' },
    { icon: RotateCcw, title: 'Mudah Retur', desc: 'Pengembalian mudah dalam 7 hari setelah penerimaan', color: 'from-orange-500 to-orange-600' },
    { icon: Store, title: 'Seller Terpercaya', desc: 'Seller terverifikasi dengan rating tinggi dan pelayanan terbaik', color: 'from-pink-500 to-pink-600' },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-12 font-display">Kenapa Belanja di GrosirPJ?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="text-center group hover:scale-105 transition-transform">
              <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow`}>
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 font-display">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
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
  // The /api/seed endpoint is idempotent - it checks if data exists first
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
        <HeroSection />
        <FlashSaleSection />
        <CategorySection />
        <WhyChooseUs />
        <ProductGrid />
        <PromoBanners />
      </main>
      <Footer />

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
