'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Search, ShoppingCart, Bell, Upload, Menu, X, Star,
  ChevronRight, ChevronDown, Play, MapPin, Minus, Plus,
  Truck, Shield, RotateCcw, Store, Users, Package, Heart,
  MessageCircle, LogOut, User, ClipboardList, ArrowRight,
  Ticket, ShoppingBag, Sparkles, Wallet, Award, Smartphone,
  Flame,
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

// ===== QUICK NAV ICONS (Shopee-style) =====
const QUICK_NAV_ITEMS = [
  { key: 'flash-sale', label: 'Flash Sale', icon: Flame, color: '#EF4444', bg: '#FEE2E2' },
  { key: 'gratis-ongkir', label: 'Gratis Ongkir', icon: Truck, color: '#10B981', bg: '#D1FAE5' },
  { key: 'voucher', label: 'Voucher', icon: Ticket, color: '#F59E0B', bg: '#FEF3C7' },
  { key: 'belanja', label: 'Belanja', icon: ShoppingBag, color: '#3B82F6', bg: '#DBEAFE' },
  { key: 'produk-baru', label: 'Produk Baru', icon: Sparkles, color: '#8B5CF6', bg: '#EDE9FE' },
  { key: 'bayar-tempat', label: 'Bayar Tempat', icon: Wallet, color: '#F59E0B', bg: '#FEF3C7' },
  { key: 'official', label: 'Official Store', icon: Award, color: '#EC4899', bg: '#FCE7F3' },
  { key: 'garansi', label: 'Garansi', icon: Shield, color: '#14B8A6', bg: '#CCFBF1' },
  { key: 'top-up', label: 'Top Up', icon: Smartphone, color: '#6366F1', bg: '#E0E7FF' },
  { key: 'wishlist', label: 'Wishlist', icon: Heart, color: '#EF4444', bg: '#FEE2E2' },
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
    <div className="flex items-center gap-2">
      <span className="text-white/80 text-sm">Berakhir dalam</span>
      <div className="flex gap-1.5">
        {[
          { val: time.hours, label: 'Jam' },
          { val: time.minutes, label: 'Menit' },
          { val: time.seconds, label: 'Detik' },
        ].map((item, idx) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="bg-white/20 px-2.5 py-1.5 rounded text-center min-w-[40px]">
              <span className="text-lg font-bold text-white">{item.val.toString().padStart(2, '0')}</span>
              <p className="text-[10px] text-white/60">{item.label}</p>
            </div>
            {idx < 2 && <span className="text-white/60 font-bold">:</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== FLASH SALE SECTION =====
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
        const flashProducts = (data.products || []).filter((p: FlashProduct) => p.discount > 0).slice(0, 8);
        setProducts(flashProducts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || products.length === 0) return null;

  return (
    <section className="py-6 bg-[#00A651] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">Flash Sale</h2>
              <p className="text-white/70 text-sm">Diskon hingga 90%</p>
            </div>
          </div>
          <FlashSaleTimer />
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex-shrink-0 w-[140px] md:w-[160px] bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => openProductDetail(product.id)}
            >
              <div className="relative">
                <img
                  src={product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop'}
                  alt={product.name}
                  className="w-full h-32 md:h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <span className="absolute top-1 left-1 bg-[#FFC107] text-black text-[10px] font-bold px-1.5 py-0.5 rounded">
                  -{product.discount}%
                </span>
              </div>
              <div className="p-2">
                <h3 className="text-xs font-medium text-gray-800 line-clamp-2 mb-1 h-8">{product.name}</h3>
                <p className="text-[#00A651] font-bold text-sm">{formatPrice(product.price)}</p>
                <p className="text-[10px] text-gray-400 line-through">{formatPrice(product.originalPrice)}</p>
                <div className="mt-1.5 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-[#00A651] to-[#FFC107] h-full rounded-full" style={{ width: `${Math.min((product.sold / 5000) * 100, 90)}%` }} />
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">{product.sold.toLocaleString('id-ID')} terjual</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== QUICK NAV SECTION =====
function QuickNavSection() {
  const openProductDetail = useUIStore((s) => s.openProductDetail);
  const setActiveCategory = useUIStore((s) => s.setActiveCategory);

  const handleClick = (key: string) => {
    if (key === 'flash-sale') {
      document.getElementById('flash-sale')?.scrollIntoView({ behavior: 'smooth' });
    } else if (key === 'wishlist') {
      // Wishlist is in navbar
    } else if (key === 'gratis-ongkir' || key === 'belanja') {
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
    } else if (key === 'voucher') {
      document.getElementById('promo')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-5 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {QUICK_NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className="flex flex-col items-center gap-1.5 min-w-[64px] p-2 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => handleClick(item.key)}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                style={{ backgroundColor: item.bg }}
              >
                <item.icon className="w-6 h-6" style={{ color: item.color }} />
              </div>
              <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== NAVBAR =====
function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#00A651] shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white">GrosirPJ</span>
          </a>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-xl mx-6">
            <div className="search-bar-shopee w-full flex items-center bg-white rounded overflow-hidden">
              <input
                type="text"
                placeholder="Cari produk grosir murah..."
                className="flex-1 px-3 py-2 text-sm focus:outline-none text-gray-700"
                onKeyDown={(e) => { if (e.key === 'Enter') { setSearchQuery((e.target as HTMLInputElement).value); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); } }}
              />
              <button
                className="px-4 py-2 bg-[#FFC107] hover:bg-[#FFB300] transition-colors"
                onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Search className="w-5 h-5 text-gray-800" />
              </button>
            </div>
          </div>

          {/* Nav Actions */}
          <div className="flex items-center gap-1 md:gap-3">
            <button
              onClick={() => {
                if (!user) {
                  setLoginModalOpen(true);
                  localStorage.setItem('grosirpj_pending_seller', 'true');
                  return;
                }
                setSellerMode(true);
              }}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-white/90 hover:text-white transition-colors text-sm"
            >
              <Upload className="w-4 h-4" />
              <span className="font-medium">Jual</span>
            </button>

            {/* Wishlist */}
            <button className="relative p-2 text-white/90 hover:text-white transition-colors" title="Wishlist">
              <Heart className="w-5 h-5" />
              {user && wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#FFC107] text-black text-[10px] font-bold rounded-full flex items-center justify-center">{wishlistCount}</span>
              )}
            </button>

            {/* Cart */}
            <button onClick={() => { if (user) openCart(); else setLoginModalOpen(true); }} className="relative p-2 text-white/90 hover:text-white transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#FFC107] text-black text-[10px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>
              )}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                className="relative p-2 text-white/90 hover:text-white transition-colors"
                onClick={() => {
                  if (!user) { setLoginModalOpen(true); return; }
                  setNotifOpen(!notifOpen);
                }}
                title="Notifikasi"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadNotifs}</span>
                )}
              </button>
              {notifOpen && user && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-2xl border border-gray-100 z-50 max-h-96 overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-gray-100">
                    <h3 className="font-semibold text-sm text-gray-800">Notifikasi</h3>
                    {unreadNotifs > 0 && (
                      <button
                        className="text-xs text-[#00A651] hover:text-[#008F46] font-medium"
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
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!notif.read ? 'bg-[#00A651]' : 'bg-transparent'}`} />
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
                <button onClick={openOrderHistory} className="relative p-2 text-white/90 hover:text-white transition-colors hidden sm:block" title="Pesanan">
                  <ClipboardList className="w-5 h-5" />
                </button>
                <button onClick={() => openChat()} className="relative p-2 text-white/90 hover:text-white transition-colors hidden sm:block" title="Chat">
                  <MessageCircle className="w-5 h-5" />
                </button>
              </>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-full">
                  <div className="w-6 h-6 bg-[#FFC107] rounded-full flex items-center justify-center">
                    <span className="text-black text-xs font-bold">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium text-white max-w-[70px] truncate">{user.name}</span>
                </div>
                <button onClick={logout} className="p-1.5 text-white/60 hover:text-white transition-colors" title="Keluar">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="bg-[#FFC107] hover:bg-[#FFB300] text-black font-semibold rounded px-4 py-1.5 text-sm transition-colors"
              >
                Masuk
              </button>
            )}

            {/* Mobile menu button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-white/90 hover:text-white">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden bg-[#009B4C] px-4 py-2">
        <div className="flex items-center bg-white rounded overflow-hidden">
          <input
            type="text"
            placeholder="Cari produk..."
            className="flex-1 px-3 py-2 text-sm focus:outline-none"
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearchQuery((e.target as HTMLInputElement).value); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); } }}
          />
          <button className="px-3 py-2 bg-[#FFC107]" onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}>
            <Search className="w-4 h-4 text-gray-800" />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#009B4C] border-t border-white/10 px-4 py-3 space-y-2">
          <button
            onClick={() => {
              if (!user) { setLoginModalOpen(true); localStorage.setItem('grosirpj_pending_seller', 'true'); return; }
              setSellerMode(true);
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-white/90 hover:text-white text-sm"
          >
            <Upload className="w-4 h-4" /> Jual Produk
          </button>
          {user && (
            <>
              <button onClick={() => { openOrderHistory(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-white/90 hover:text-white text-sm">
                <ClipboardList className="w-4 h-4" /> Pesanan
              </button>
              <button onClick={() => { openChat(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-white/90 hover:text-white text-sm">
                <MessageCircle className="w-4 h-4" /> Chat
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

// ===== HERO BANNER (Shopee-style) =====
function HeroBanner() {
  return (
    <section className="pt-[108px] md:pt-[64px] bg-[#00A651] pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-lg overflow-hidden h-[200px] md:h-[320px]">
          {/* Background image collage */}
          <div className="absolute inset-0 grid grid-cols-4 gap-0.5">
            <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop" alt="" className="w-full h-full object-cover" />
            <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop" alt="" className="w-full h-full object-cover" />
            <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop" alt="" className="w-full h-full object-cover" />
            <img src="https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&h=400&fit=crop" alt="" className="w-full h-full object-cover" />
          </div>
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#00A651]/90 via-[#00A651]/60 to-transparent" />
          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFC107] rounded-full mb-4 w-fit">
              <Flame className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold text-black">Flash Sale Hari Ini</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-3">
              Belanja Grosir{' '}
              <span className="text-[#FFC107]">Mudah & Murah</span>
            </h1>
            <p className="text-white/80 text-sm md:text-base mb-6 max-w-md">
              Temukan ribuan produk grosir berkualitas dengan harga terbaik. Gratis ongkir & pengiriman cepat!
            </p>
            <div className="flex gap-3">
              <Button
                className="bg-[#FFC107] hover:bg-[#FFB300] text-black font-semibold rounded px-6 py-2.5 transition-colors"
                onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Selengkapnya <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
          {/* Pagination dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white/40" />
            <div className="w-2 h-2 rounded-full bg-white" />
            <div className="w-2 h-2 rounded-full bg-white/40" />
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
    <section id="promo" className="py-8 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#00A651] to-[#00C46A] p-6 md:p-8 group cursor-pointer">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 rounded text-white text-xs font-medium mb-3">Promo Spesial</span>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Gratis Ongkir Seluruh Indonesia</h3>
              <p className="text-white/80 text-sm mb-4">Minimal pembelian Rp 100.000</p>
              <Button
                className="bg-[#FFC107] hover:bg-[#FFB300] text-black font-semibold rounded text-sm px-5 py-2 transition-colors"
                onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Belanja Sekarang
              </Button>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 p-6 md:p-8 group cursor-pointer">
            <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 rounded text-white text-xs font-medium mb-3">New Seller</span>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Mulai Jual di GrosirPJ</h3>
              <p className="text-white/80 text-sm mb-4">Gratis biaya pendaftaran, potongan 0%!</p>
              <Button
                className="bg-[#FFC107] hover:bg-[#FFB300] text-black font-semibold rounded text-sm px-5 py-2 transition-colors"
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
    { icon: Truck, title: 'Gratis Ongkir', desc: 'Pembelian di atas Rp 100.000 ke seluruh Indonesia', color: '#10B981', bg: '#D1FAE5' },
    { icon: Shield, title: 'Garansi Original', desc: 'Semua produk dijamin 100% original dan berkualitas', color: '#3B82F6', bg: '#DBEAFE' },
    { icon: RotateCcw, title: 'Mudah Retur', desc: 'Pengembalian mudah dalam 7 hari setelah penerimaan', color: '#F59E0B', bg: '#FEF3C7' },
    { icon: Store, title: 'Seller Terpercaya', desc: 'Seller terverifikasi dengan rating tinggi', color: '#EC4899', bg: '#FCE7F3' },
  ];

  return (
    <section className="py-10 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-8">Kenapa Belanja di GrosirPJ?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="text-center p-4 rounded-xl hover:bg-gray-50 transition-colors">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: feature.bg }}
              >
                <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 text-sm md:text-base">{feature.title}</h3>
              <p className="text-xs md:text-sm text-gray-500">{feature.desc}</p>
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

  // Ensure database is seeded
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 bg-[#00A651] rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
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
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <HeroBanner />
        <QuickNavSection />
        <FlashSaleSection />
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
