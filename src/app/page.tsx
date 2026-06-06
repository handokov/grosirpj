'use client';

import { useState, useEffect, useCallback, useRef, type RefObject } from 'react';
import {
  Zap, Search, ShoppingCart, Bell, Upload, Menu, X, Star,
  ChevronRight, ChevronDown, Play, MapPin, Minus, Plus, Trash2,
  Truck, Shield, RotateCcw, Store, Users, Package, Heart,
  Smartphone, Apple, CreditCard, Mail, Phone, MessageCircle, LogOut, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ProductDetail } from '@/components/product-detail';
import { AuthModal } from '@/components/auth-modal';
import { products, flashSaleProducts, categories, formatPrice, Product } from '@/lib/data';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { calculateShipping, formatShippingInfo, ShippingEstimate } from '@/lib/shipping';

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
            <span className="font-display text-xl font-bold text-white">
              {item.val.toString().padStart(2, '0')}
            </span>
            <p className="text-xs text-white/70">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const cartTotal = useCartStore((s) => s.getTotal());
  const cartCount = useCartStore((s) => s.getCount());

  // Auth state
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const setLoginModalOpen = useAuthStore((s) => s.setLoginModalOpen);
  const logout = useAuthStore((s) => s.logout);
  const initAuth = useAuthStore((s) => s.init);

  // Init auth on mount
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Helper: require login to add to cart
  const requireLogin = useCallback(() => {
    if (!user) {
      window.location.href = '/login-buyer.html';
      return false;
    }
    return true;
  }, [user]);

  const handleAddToCart = useCallback((product: Product) => {
    if (!requireLogin()) return;
    addItem(product);
  }, [requireLogin, addItem]);

  const handleOpenCart = useCallback(() => {
    if (!requireLogin()) return;
    setCartOpen(true);
  }, [requireLogin]);

  // Swipe-to-close for Sheet panels on mobile
  useEffect(() => {
    const THRESHOLD = 80;

    function handleSwipeOnSheet(sheetSelector: string, onClose: () => void) {
      const panel = document.querySelector(sheetSelector + ' [data-slot="sheet-content"]') as HTMLElement;
      if (!panel) return;

      let startX = 0;
      let currentX = 0;
      let isDragging = false;

      const onTouchStart = (e: TouchEvent) => {
        startX = e.touches[0].clientX;
        currentX = startX;
        isDragging = true;
        panel.style.transition = 'none';
      };

      const onTouchMove = (e: TouchEvent) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        if (diff > 0) {
          panel.style.transform = `translateX(${diff}px)`;
          const overlay = panel.previousElementSibling as HTMLElement;
          if (overlay) {
            const progress = Math.min(diff / panel.offsetWidth, 1);
            overlay.style.opacity = String(1 - progress * 0.7);
          }
        }
      };

      const onTouchEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        panel.style.transition = '';
        const overlay = panel.previousElementSibling as HTMLElement;
        if (overlay) overlay.style.opacity = '';
        const diff = currentX - startX;
        if (diff > THRESHOLD) {
          onClose();
        } else {
          panel.style.transform = '';
          if (overlay) overlay.style.opacity = '';
        }
        setTimeout(() => { panel.style.transform = ''; }, 350);
      };

      panel.addEventListener('touchstart', onTouchStart, { passive: true });
      panel.addEventListener('touchmove', onTouchMove, { passive: true });
      panel.addEventListener('touchend', onTouchEnd, { passive: true });

      return () => {
        panel.removeEventListener('touchstart', onTouchStart);
        panel.removeEventListener('touchmove', onTouchMove);
        panel.removeEventListener('touchend', onTouchEnd);
      };
    }

    // Apply to cart and detail sheets when they're open
    const cleanups: (() => void)[] = [];
    if (cartOpen) {
      const cleanup = handleSwipeOnSheet('[data-radix-portal]', () => setCartOpen(false));
      if (cleanup) cleanups.push(cleanup);
    }
    if (detailOpen) {
      const cleanup = handleSwipeOnSheet('[data-radix-portal]:last-child', () => setDetailOpen(false));
      if (cleanup) cleanups.push(cleanup);
    }

    return () => cleanups.forEach(fn => fn());
  }, [cartOpen, detailOpen]);

  // Scroll listener for navbar
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Intersection observer for reveal animations
  const sectionRefs = useRef<Map<string, IntersectionObserverEntry>>(new Map());
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal-section').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeFilter]);

  const openProductDetail = useCallback((product: Product) => {
    setSelectedProduct(product);
    setDetailOpen(true);
  }, []);

  const filteredProducts = activeFilter === 'all'
    ? products
    : products.filter((p) => p.category === activeFilter);

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

  return (
    <div className="min-h-screen flex flex-col bg-[#f0fdf4]">
      {/* ===== NAVIGATION ===== */}
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
              <span className="font-bold text-xl text-emerald-700" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                GrosirPJ
              </span>
            </a>

            {/* Desktop Search */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="search-bar w-full flex items-center bg-white rounded-full border border-gray-200 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-emerald-300">
                <select className="bg-gray-50 px-4 py-3 text-sm text-gray-600 border-r border-gray-200 focus:outline-none cursor-pointer">
                  <option>Semua Kategori</option>
                  <option>Fashion Pria</option>
                  <option>Fashion Wanita</option>
                  <option>Elektronik</option>
                  <option>Rumah Tangga</option>
                </select>
                <input
                  type="text"
                  placeholder="Cari produk grosir murah..."
                  className="flex-1 px-4 py-3 text-sm focus:outline-none"
                />
                <button className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Nav Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              <a href="/login-seller.html" className="hidden sm:flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-emerald-600 transition-colors cursor-pointer">
                <Upload className="w-5 h-5" />
                <span className="text-sm font-medium">Jual</span>
              </a>

              <button
                onClick={handleOpenCart}
                className="relative p-2 text-gray-600 hover:text-emerald-600 transition-colors"
              >
                <ShoppingCart className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              <button className="relative p-2 text-gray-600 hover:text-emerald-600 transition-colors hidden sm:block">
                <Bell className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  5
                </span>
              </button>

              {/* Auth Button */}
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{user.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-emerald-700 max-w-[100px] truncate">{user.name}</span>
                    <MapPin className="w-3 h-3 text-emerald-500" />
                    <span className="text-xs text-emerald-600">{user.city}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Keluar"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <a
                  href="/login-buyer.html"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-full px-4 md:px-6 py-2 transition-colors inline-block"
                >
                  Masuk
                </a>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Search */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center bg-gray-50 rounded-full border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-300">
          <input
            type="text"
            placeholder="Cari produk..."
            className="flex-1 px-4 py-2.5 text-sm bg-transparent focus:outline-none"
          />
          <button className="p-2.5 bg-emerald-500 text-white">
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ===== HERO SECTION ===== */}
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
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Belanja Grosir{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">
                  Mudah &amp; Murah
                </span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-lg">
                Temukan ribuan produk grosir berkualitas dengan harga terbaik. Gratis ongkir, pembayaran aman, dan pengiriman cepat!
              </p>
              <div className="flex flex-wrap gap-4 mb-10">
                <Button className="btn-primary px-8 py-6 bg-emerald-500 text-white font-semibold rounded-2xl hover:bg-emerald-600 transition-all flex items-center gap-2 text-base">
                  Mulai Belanja
                  <ChevronRight className="w-5 h-5" />
                </Button>
                <Button
                  variant="outline"
                  className="px-8 py-6 bg-white text-gray-700 font-semibold rounded-2xl border-gray-200 hover:border-emerald-300 hover:text-emerald-600 transition-all flex items-center gap-2 text-base"
                >
                  <Play className="w-5 h-5" />
                  Cara Belanja
                </Button>
              </div>
              <div className="flex flex-wrap gap-8">
                {[
                  { val: '50K+', label: 'Produk Aktif' },
                  { val: '10K+', label: 'Seller Terpercaya' },
                  { val: '99%', label: 'Kepuasan Pelanggan' },
                ].map((stat) => (
                  <div key={stat.label} className="hover:scale-110 transition-transform cursor-default">
                    <p className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {stat.val}
                    </p>
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
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-orange-400 px-3 py-1 rounded-full text-white text-sm font-semibold">
                      Diskon 70%
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Paket Grosir Fashion Wanita
                  </h3>
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

      {/* ===== FLASH SALE SECTION ===== */}
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
                <h2 className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Flash Sale
                </h2>
                <p className="text-emerald-100">Diskon hingga 90%</p>
              </div>
            </div>
            <FlashSaleTimer />
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            {flashSaleProducts.map((product) => (
              <div
                key={product.id}
                className="flex-shrink-0 w-44 md:w-52 bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
                onClick={() => openProductDetail(product)}
              >
                <div className="relative">
                  <img src={product.image} alt={product.name} className="w-full h-32 md:h-40 object-cover group-hover:scale-105 transition-transform duration-300" />
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                    {product.discount}%
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

      {/* ===== CATEGORIES SECTION ===== */}
      <section id="categories" className={`py-16 bg-white reveal-section transition-all duration-800 ${visibleSections.has('categories') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Kategori Populer</h2>
              <p className="text-gray-500 mt-1">Temukan produk berdasarkan kategori favorit</p>
            </div>
            <a className="hidden md:flex items-center gap-2 text-emerald-600 font-medium hover:text-emerald-700 transition-colors cursor-pointer">
              Lihat Semua <ChevronRight className="w-4 h-4" />
            </a>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {categories.map((cat) => (
              <a key={cat.name} href="#" className="category-card flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 transition-all hover:scale-105">
                <div className={`category-icon w-14 h-14 bg-gradient-to-br ${cat.color} rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 hover:rotate-3`}>
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cat.icon} />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-700 text-center">{cat.name}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRODUCTS SECTION ===== */}
      <section id="products" className={`py-16 reveal-section transition-all duration-800 bg-gradient-to-b from-white to-[#f0fdf4] ${visibleSections.has('products') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Produk Terlaris</h2>
              <p className="text-gray-500 mt-1">Pilihan terbaik untuk kebutuhan grosir Anda</p>
            </div>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-full">
              {[
                { key: 'all', label: 'Semua' },
                { key: 'fashion', label: 'Fashion' },
                { key: 'elektronik', label: 'Elektronik' },
                { key: 'rumah', label: 'Rumah' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${activeFilter === filter.key ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                  onClick={() => setActiveFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {filteredProducts.map((product) => {
              const discount = product.discount || Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
              return (
                <div key={product.id} className="product-card bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl cursor-pointer group" onClick={() => openProductDetail(product)}>
                  <div className="relative overflow-hidden">
                    <img src={product.image} alt={product.name} className="product-image w-full h-40 md:h-48 object-cover" />
                    {discount > 0 && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">-{discount}%</span>
                    )}
                    <button
                      className="absolute bottom-3 right-3 w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-emerald-600 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                    >
                      <ShoppingCart className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-3 md:p-4">
                    <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 h-10">{product.name}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base md:text-lg font-bold text-emerald-600">{formatPrice(product.price)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{product.rating}</span>
                      </div>
                      <span>{product.sold.toLocaleString('id-ID')} terjual</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{product.location}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <Button variant="outline" className="px-8 py-6 bg-white text-emerald-600 font-semibold rounded-2xl border-2 border-emerald-500 hover:bg-emerald-50 transition-all inline-flex items-center gap-2">
              Lihat Lebih Banyak <ChevronDown className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ===== PROMO BANNERS ===== */}
      <section id="promo" className={`py-12 reveal-section transition-all duration-800 ${visibleSections.has('promo') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 to-emerald-500 p-8 md:p-10 group cursor-pointer">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
              <div className="relative z-10">
                <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-white text-sm font-medium mb-4">Promo Spesial</span>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Gratis Ongkir Seluruh Indonesia</h3>
                <p className="text-white/80 mb-6">Minimal pembelian Rp 100.000</p>
                <Button className="px-6 py-3 bg-white text-emerald-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors">Belanja Sekarang</Button>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-pink-500 p-8 md:p-10 group cursor-pointer">
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
              <div className="relative z-10">
                <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-white text-sm font-medium mb-4">New Seller</span>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Mulai Jual di GrosirPJ</h3>
                <p className="text-white/80 mb-6">Gratis biaya pendaftaran, potongan 0%!</p>
                <a href="/login-seller.html" className="px-6 py-3 bg-white text-orange-500 font-semibold rounded-xl hover:bg-gray-50 transition-colors inline-block">Daftar Sekarang</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-900 text-gray-300 pt-16 pb-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-xl text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>GrosirPJ</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">Marketplace grosir terpercaya di Indonesia dengan jutaan produk berkualitas dan harga bersaing.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Layanan</h4>
              <ul className="space-y-2 text-sm">
                {['Cara Belanja', 'Pengiriman', 'Pengembalian', 'FAQ'].map((item) => (
                  <li key={item}><a href="#" className="hover:text-emerald-400 transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Tentang</h4>
              <ul className="space-y-2 text-sm">
                {['Tentang Kami', 'Karir', 'Blog', 'Kontak'].map((item) => (
                  <li key={item}><a href="#" className="hover:text-emerald-400 transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Download Aplikasi</h4>
              <div className="space-y-3">
                <a href="#" className="flex items-center gap-3 bg-gray-800 rounded-xl p-3 hover:bg-gray-700 transition-colors">
                  <Smartphone className="w-8 h-8 text-white" />
                  <div><p className="text-xs text-gray-400">Download di</p><p className="text-sm font-semibold text-white">Play Store</p></div>
                </a>
                <a href="#" className="flex items-center gap-3 bg-gray-800 rounded-xl p-3 hover:bg-gray-700 transition-colors">
                  <Apple className="w-8 h-8 text-white" />
                  <div><p className="text-xs text-gray-400">Download di</p><p className="text-sm font-semibold text-white">App Store</p></div>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 mb-8">
            <p className="text-sm text-gray-400 mb-4">Metode Pembayaran</p>
            <div className="flex flex-wrap gap-3">
              {['VISA', 'Mastercard', 'BCA', 'Mandiri', 'BNI', 'BRI', 'GoPay', 'OVO', 'DANA'].map((method) => (
                <div key={method} className="px-4 py-2 bg-gray-800 rounded-lg text-xs font-medium">{method}</div>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            <p>&copy; 2024 GrosirPJ. Hak cipta dilindungi.</p>
          </div>
        </div>
      </footer>

      {/* ===== CART SIDEBAR ===== */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="w-full sm:w-96 p-0 flex flex-col gap-0 overflow-hidden">
          <SheetHeader className="p-6 pb-4 border-b border-gray-100">
            <SheetTitle className="text-xl" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Keranjang Belanja
            </SheetTitle>
            <SheetDescription>Produk yang sudah ditambahkan</SheetDescription>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <div className="p-6">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <ShoppingCart className="w-20 h-20 text-gray-300 mb-4" />
                  <p className="text-gray-500">Keranjang kosong</p>
                  <p className="text-sm text-gray-400">Mulai belanja sekarang!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => {
                    // Calculate shipping for this item
                    const shipping = user ? calculateShipping(item.location, user.city) : null;
                    return (
                      <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-100">
                        <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-xl" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm line-clamp-2">{item.name}</h4>
                          <p className="text-emerald-600 font-bold mt-1">{formatPrice(item.price)}</p>
                          {shipping && shipping.cost > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              Ongkir: {formatShippingInfo(shipping)}
                            </p>
                          )}
                          {shipping && shipping.cost === 0 && (
                            <p className="text-xs text-emerald-500 mt-0.5 flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              Gratis Ongkir
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, -1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors self-start">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {cartItems.length > 0 && (
            <div className="p-6 border-t border-gray-100">
              {/* Shipping summary */}
              {user && (() => {
                const totalShipping = cartItems.reduce((sum, item) => {
                  const s = calculateShipping(item.location, user.city);
                  return sum + s.cost;
                }, 0);
                return totalShipping > 0 ? (
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-gray-500 flex items-center gap-1"><Truck className="w-4 h-4" /> Total Ongkir</span>
                    <span className="font-medium text-gray-700">{formatPrice(totalShipping)}</span>
                  </div>
                ) : null;
              })()}
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-600">Total</span>
                <span className="text-xl font-bold text-emerald-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {formatPrice(cartTotal + (user ? cartItems.reduce((sum, item) => sum + calculateShipping(item.location, user.city).cost, 0) : 0))}
                </span>
              </div>
              <Button className="w-full py-6 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl">
                Checkout Sekarang
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ===== PRODUCT DETAIL SHEET ===== */}
      <ProductDetail
        product={selectedProduct}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* ===== AUTH MODAL ===== */}
      <AuthModal />
    </div>
  );
}
