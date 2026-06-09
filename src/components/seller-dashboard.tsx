'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, ImagePlus, X, Package, DollarSign,
  Tag, MapPin, FileText, Layers, Box, ChevronLeft, Store,
  Upload, Eye, BarChart3, ShoppingBag, Star, ArrowRight, AlertCircle, CheckCircle,
  Home, ClipboardList, MessageCircle, Bell, Megaphone, Clock, Truck,
  RotateCcw, Download, TrendingUp, Target, Newspaper, Menu, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuthStore } from '@/store/auth';
import { useUIStore } from '@/store/ui';
import { useNotificationStore } from '@/store/notification';
import { ChatPanel } from '@/components/chat-panel';
import { formatPrice, getStatusInfo, CATEGORIES, PAYMENT_METHODS } from '@/lib/constants';
import { calculateShipping, getCityNames } from '@/lib/shipping';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

// Types
interface VariantGroupData {
  name: string;
  options: string[];
}

interface SellerProduct {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  images: string[];
  category: string;
  description: string;
  minOrder: number;
  stock: number;
  location: string;
  variantGroups: { id: string; name: string; options: { id: string; value: string }[] }[];
  rating: number;
  sold: number;
  active: boolean;
  createdAt: string;
}

interface SellerOrder {
  id: string;
  buyerId: string;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  paymentMethod: string;
  createdAt: string;
  items: { id: string; productName: string; quantity: number; price: number; variants: string }[];
  buyer: { id: string; name: string; email: string; city?: string };
}

const CATEGORY_OPTIONS = CATEGORIES.map(c => ({ value: c.value, label: c.label }));

const INITIAL_FORM = {
  name: '',
  price: 0,
  originalPrice: 0,
  images: [] as string[],
  category: 'fashion',
  description: '',
  minOrder: 1,
  stock: 100,
  location: '',
};

interface SellerDashboardProps {
  onBack: () => void;
}

const CHART_COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// Sidebar navigation items
const SIDEBAR_ITEMS = [
  { id: 'beranda', label: 'Beranda', icon: Home },
  { id: 'orders', label: 'Pesanan', icon: ClipboardList, showBadge: 'orders' },
  { id: 'products', label: 'Produk Saya', icon: Package },
  { id: 'addProduct', label: 'Tambah Produk', icon: Plus },
  { id: 'chat', label: 'Chat Pembeli', icon: MessageCircle, showBadge: 'chat' },
  { id: 'stats', label: 'Statistik', icon: BarChart3 },
  { id: 'notifications', label: 'Notifikasi', icon: Bell, showBadge: 'notifications' },
  { id: 'promotions', label: 'Pusat Promosi', icon: Megaphone },
] as const;

export function SellerDashboard({ onBack }: SellerDashboardProps) {
  const user = useAuthStore((s) => s.user);
  const openChat = useUIStore((s) => s.openChat);

  // Notification state
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadNotifs = useNotificationStore((s) => s.unreadCount);
  const notifications = useNotificationStore((s) => s.notifications);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('beranda');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...INITIAL_FORM, location: user?.city || 'Jakarta' });
  const [variantGroups, setVariantGroups] = useState<VariantGroupData[]>([]);
  const [imageInput, setImageInput] = useState('');

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch data
  const fetchProducts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/products?sellerId=${user.id}&limit=100`);
      const data = await res.json();
      if (res.ok) setProducts(data.products || []);
    } catch (err) {
      console.error('Failed to fetch seller products:', err);
    }
  }, [user]);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/orders?sellerId=${user.id}`);
      const data = await res.json();
      if (res.ok) setOrders(data.orders || []);
    } catch (err) {
      console.error('Failed to fetch seller orders:', err);
    }
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchOrders()]);
      setLoading(false);
    };
    if (user) loadData();
  }, [user, fetchProducts, fetchOrders]);

  // Fetch notifications when user is available
  useEffect(() => {
    if (user) fetchNotifications(user.id);
  }, [user, fetchNotifications]);

  // Stats
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.active).length;
  const totalSold = products.reduce((sum, p) => sum + p.sold, 0);
  const totalRevenue = products.reduce((sum, p) => sum + p.sold * p.price, 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const readyToShipOrders = orders.filter(o => o.status === 'paid').length;
  const returnOrders = orders.filter(o => o.status === 'cancelled').length;
  const avgRating = products.length > 0 ? (products.reduce((sum, p) => sum + p.rating, 0) / products.length) : 0;
  const conversionRate = totalSold > 0 ? Math.min((totalSold / (totalProducts * 10)) * 100, 100) : 0;

  // Navigation handler
  const handleNavClick = (tabId: string) => {
    if (tabId === 'addProduct') {
      setActiveTab('products');
      resetForm();
      setShowForm(true);
    } else if (tabId === 'chat') {
      // Open chat panel for seller
      openChat();
      setSidebarOpen(false);
      return;
    } else if (tabId === 'notifications') {
      setNotifOpen(true);
      setSidebarOpen(false);
      return;
    } else if (tabId === 'promotions') {
      // Placeholder section - just show a toast
      toast.info('Fitur segera hadir!');
      return;
    } else {
      setActiveTab(tabId);
      setShowForm(false);
    }
    setSidebarOpen(false);
  };

  // Get current tab title for header
  const getTabTitle = () => {
    switch (activeTab) {
      case 'beranda': return 'Beranda';
      case 'products': return showForm ? (editingId ? 'Edit Produk' : 'Tambah Produk') : 'Produk Saya';
      case 'orders': return 'Pesanan';
      case 'stats': return 'Statistik';
      default: return 'Beranda';
    }
  };

  // Form handlers
  const handleAddImage = () => {
    const url = imageInput.trim();
    if (url && form.images.length < 5) {
      setForm(prev => ({ ...prev, images: [...prev.images, url] }));
      setImageInput('');
    }
  };

  const handleRemoveImage = (idx: number) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  };

  const handleAddVariantGroup = () => {
    setVariantGroups(prev => [...prev, { name: '', options: [] }]);
  };

  const handleRemoveVariantGroup = (idx: number) => {
    setVariantGroups(prev => prev.filter((_, i) => i !== idx));
  };

  const handleVariantGroupNameChange = (idx: number, name: string) => {
    setVariantGroups(prev => prev.map((g, i) => i === idx ? { ...g, name } : g));
  };

  const handleAddVariantOption = (groupIdx: number, option: string) => {
    if (!option.trim()) return;
    setVariantGroups(prev => prev.map((g, i) =>
      i === groupIdx ? { ...g, options: [...g.options, option.trim()] } : g
    ));
  };

  const handleRemoveVariantOption = (groupIdx: number, optIdx: number) => {
    setVariantGroups(prev => prev.map((g, i) =>
      i === groupIdx ? { ...g, options: g.options.filter((_, j) => j !== optIdx) } : g
    ));
  };

  const resetForm = () => {
    setForm({ ...INITIAL_FORM, location: user?.city || 'Jakarta' });
    setVariantGroups([]);
    setImageInput('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!user || !form.name.trim() || form.price <= 0) {
      toast.error('Nama dan harga wajib diisi');
      return;
    }

    const body = {
      name: form.name,
      price: form.price,
      originalPrice: form.originalPrice,
      category: form.category,
      description: form.description,
      minOrder: form.minOrder,
      stock: form.stock,
      location: form.location,
      images: form.images,
      sellerId: user.id,
      variantGroups: variantGroups.filter(g => g.name.trim() && g.options.length > 0).map(g => ({
        name: g.name,
        options: g.options,
      })),
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/products/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          toast.success('Produk berhasil diperbarui');
        } else {
          const data = await res.json();
          toast.error(data.error || 'Gagal memperbarui produk');
        }
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          toast.success('Produk berhasil ditambahkan');
        } else {
          const data = await res.json();
          toast.error(data.error || 'Gagal menambahkan produk');
        }
      }
      resetForm();
      fetchProducts();
    } catch (err) {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleEdit = (product: SellerProduct) => {
    setForm({
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      images: product.images,
      category: product.category,
      description: product.description,
      minOrder: product.minOrder,
      stock: product.stock,
      location: product.location,
    });
    setVariantGroups(
      product.variantGroups?.map(g => ({
        name: g.name,
        options: g.options.map(o => o.value),
      })) || []
    );
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Produk berhasil dihapus');
        fetchProducts();
      } else {
        toast.error('Gagal menghapus produk');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan');
    }
    setDeleteId(null);
  };

  const handleToggleActive = async (product: SellerProduct) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !product.active }),
      });
      if (res.ok) {
        toast.success(product.active ? 'Produk dinonaktifkan' : 'Produk diaktifkan');
        fetchProducts();
      }
    } catch (err) {
      toast.error('Gagal mengubah status produk');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success('Status pesanan diperbarui');
        fetchOrders();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Gagal memperbarui status');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan');
    }
  };

  // Chart data
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) {
      const cat = CATEGORY_OPTIONS.find(c => c.value === p.category)?.label || p.category;
      map[cat] = (map[cat] || 0) + 1;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [products]);

  const revenueData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];
    return months.map((m, i) => ({
      name: m,
      pendapatan: Math.round(totalRevenue / 6 * (0.5 + Math.random() * 0.8)),
    }));
  }, [totalRevenue]);

  // Variant option input state per group
  const [variantOptionInputs, setVariantOptionInputs] = useState<Record<number, string>>({});

  // Sidebar content (reused for desktop and mobile)
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Seller profile in sidebar */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{user?.name || 'Seller'}</p>
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 text-[10px] mt-0.5 px-1.5 py-0">Seller</Badge>
          </div>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = activeTab === item.id || (item.id === 'addProduct' && activeTab === 'products' && showForm);
          const badgeCount = item.showBadge === 'orders' ? pendingOrders
            : item.showBadge === 'chat' ? 2
            : item.showBadge === 'notifications' ? unreadNotifs : 0;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {badgeCount > 0 && (
                <span className="min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Back to Buyer */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={onBack}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Pembeli</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-72 bg-white shadow-xl animate-in slide-in-from-left duration-200">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-14 px-4 sm:px-6">
            {/* Left: Mobile menu + Profile */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Store className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{user?.name || 'Seller'}</p>
                  <p className="text-[10px] text-gray-500">Seller</p>
                </div>
              </div>
            </div>

            {/* Center: Tab Title */}
            <h1 className="text-base font-bold text-gray-900">{getTabTitle()}</h1>

            {/* Right: Search, Home, Bell, Online */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-1.5">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Cari..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-sm outline-none w-32 placeholder-gray-400"
                />
              </div>
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Kembali ke Dashboard Utama"
              >
                <Home className="w-5 h-5 text-gray-500" />
              </button>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                title="Notifikasi"
              >
                <Bell className="w-5 h-5 text-gray-500" />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white">
                    {unreadNotifs > 99 ? '99+' : unreadNotifs}
                  </span>
                )}
              </button>
              {/* Notification Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-[480px] overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Notifikasi</h3>
                    {unreadNotifs > 0 && (
                      <button
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                        onClick={() => { if (user) markAllAsRead(user.id); }}
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">Belum ada notifikasi</p>
                      </div>
                    ) : (
                      notifications.slice(0, 20).map((notif) => (
                        <button
                          key={notif.id}
                          className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-50 transition-colors ${!notif.read ? 'bg-emerald-50/40' : ''}`}
                          onClick={() => {
                            if (!notif.read) markAsRead(notif.id);
                            if (notif.type === 'order' || notif.type === 'new_order') {
                              setActiveTab('orders');
                              setNotifOpen(false);
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!notif.read ? 'bg-red-500' : 'bg-transparent'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 line-clamp-1">{notif.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                              <p className="text-[10px] text-gray-400 mt-1">
                                {new Date(notif.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-3 border-t border-gray-100 text-center">
                      <button
                        onClick={() => { setActiveTab('orders'); setNotifOpen(false); }}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        Lihat Semua Pesanan
                      </button>
                    </div>
                  )}
                </div>
              )}
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs hidden sm:flex">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1"></span>Online
              </Badge>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6">
          {activeTab === 'beranda' && (
            /* ===== BERANDA TAB ===== */
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Order Status Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { icon: Clock, label: 'Perlu Diproses', value: pendingOrders, color: 'bg-orange-50 text-orange-600', iconBg: 'bg-orange-100' },
                  { icon: Truck, label: 'Siap Dikirim', value: readyToShipOrders, color: 'bg-blue-50 text-blue-600', iconBg: 'bg-blue-100' },
                  { icon: RotateCcw, label: 'Pengembalian', value: returnOrders, color: 'bg-pink-50 text-pink-600', iconBg: 'bg-pink-100' },
                  { icon: Download, label: 'Produk Diturunkan', value: 0, color: 'bg-gray-50 text-gray-600', iconBg: 'bg-gray-100' },
                ].map((item) => (
                  <div key={item.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className={`w-10 h-10 ${item.iconBg} rounded-xl flex items-center justify-center mb-3`}>
                      <item.icon className={`w-5 h-5 ${item.color.split(' ')[1]}`} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Performa Toko */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4">Performa Toko</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { icon: DollarSign, label: 'Penjualan', value: formatPrice(totalRevenue), color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { icon: Eye, label: 'Total Pengunjung', value: Math.floor(totalSold * 15 + 128).toString(), color: 'text-blue-600', bg: 'bg-blue-50' },
                    { icon: TrendingUp, label: 'Produk Diklik', value: Math.floor(totalSold * 8 + 47).toString(), color: 'text-purple-600', bg: 'bg-purple-50' },
                    { icon: ShoppingBag, label: 'Pesanan', value: orders.length.toString(), color: 'text-orange-600', bg: 'bg-orange-50' },
                    { icon: Target, label: 'Conversion Rate', value: `${conversionRate.toFixed(1)}%`, color: 'text-pink-600', bg: 'bg-pink-50' },
                    { icon: Star, label: 'Rating', value: avgRating > 0 ? avgRating.toFixed(1) : '-', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                        <item.icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <p className="text-sm font-bold text-gray-900">{item.value}</p>
                      <p className="text-[11px] text-gray-500">{item.label}</p>
                    </div>
                  ))}
                </div>
                {avgRating >= 4 && (
                  <div className="mt-4 flex items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                      <Star className="w-3 h-3 mr-1" /> Sangat Baik
                    </Badge>
                    <span className="text-xs text-gray-500">Performa toko Anda sangat baik!</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  onClick={() => { resetForm(); setActiveTab('products'); setShowForm(true); }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl h-12 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Tambah Produk Baru
                </Button>
                <Button
                  onClick={() => setActiveTab('orders')}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl h-12 flex items-center justify-center gap-2"
                >
                  <ClipboardList className="w-5 h-5" /> Lihat Pesanan
                </Button>
                <Button
                  onClick={() => openChat()}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl h-12 flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" /> Cek Chat
                </Button>
              </div>

              {/* Ringkasan Toko */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4">Ringkasan Toko</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { icon: Package, label: 'Total Produk', value: totalProducts, color: 'from-emerald-500 to-emerald-600' },
                    { icon: Eye, label: 'Produk Aktif', value: activeProducts, color: 'from-blue-500 to-blue-600' },
                    { icon: ShoppingBag, label: 'Total Terjual', value: totalSold, color: 'from-orange-500 to-orange-600' },
                    { icon: DollarSign, label: 'Pendapatan', value: formatPrice(totalRevenue), color: 'from-pink-500 to-pink-600' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-gray-50 rounded-xl p-4 text-center">
                      <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                        <stat.icon className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Berita & Tips Seller */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4">Berita & Tips Seller</h2>
                <div className="space-y-3">
                  {[
                    { title: 'Tips Meningkatkan Penjualan di 2024', desc: 'Pelajari strategi terbaru untuk meningkatkan omzet toko Anda', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
                    { title: 'Update Kebijakan Pengiriman Baru', desc: 'Informasi penting mengenai perubahan kebijakan pengiriman', icon: Truck, color: 'text-blue-600 bg-blue-50' },
                    { title: 'Promo Gratis Ongkir untuk Seller Aktif', desc: 'Dapatkan subsidi ongkir dengan memenuhi target penjualan', icon: Megaphone, color: 'text-orange-600 bg-orange-50' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className={`w-10 h-10 ${item.color.split(' ')[1]} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <item.icon className={`w-5 h-5 ${item.color.split(' ')[0]}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Misi Seller */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4">Misi Seller</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Tambah 3 produk baru', current: Math.min(totalProducts, 3), target: 3, color: 'bg-emerald-500' },
                    { label: 'Proses 5 pesanan', current: Math.min(orders.filter(o => ['paid', 'shipped', 'delivered'].includes(o.status)).length, 5), target: 5, color: 'bg-orange-500' },
                    { label: 'Chat balas cepat', current: 2, target: 5, color: 'bg-blue-500' },
                  ].map((mission, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm text-gray-700 font-medium">{mission.label}</p>
                        <span className="text-xs text-gray-500">{mission.current}/{mission.target}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${mission.color} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min((mission.current / mission.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            /* ===== KELOLA PRODUK TAB ===== */
            <div className="max-w-6xl mx-auto">
              {!showForm ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Produk Saya ({products.length})</h2>
                    <Button
                      onClick={() => { resetForm(); setShowForm(true); }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Tambah Produk
                    </Button>
                  </div>

                  {loading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
                    </div>
                  ) : products.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                      <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Package className="w-10 h-10 text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Belum ada produk</h3>
                      <p className="text-gray-500 mb-6">Mulai tambahkan produk pertama Anda</p>
                      <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl">
                        <Plus className="w-4 h-4 mr-2" /> Tambah Produk
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                      {products.map(product => {
                        const discount = product.originalPrice > product.price
                          ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
                        return (
                          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-4 hover:shadow-md transition-shadow">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                              {product.images?.[0] ? (
                                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400"><ImagePlus className="w-8 h-8" /></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{product.name}</h3>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <Badge variant="secondary" className="text-xs capitalize">{CATEGORY_OPTIONS.find(c => c.value === product.category)?.label || product.category}</Badge>
                                    <Badge className={`text-xs ${product.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                      {product.active ? 'Aktif' : 'Nonaktif'}
                                    </Badge>
                                    {discount > 0 && <Badge className="bg-red-100 text-red-600 text-xs">-{discount}%</Badge>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button onClick={() => handleToggleActive(product)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title={product.active ? 'Nonaktifkan' : 'Aktifkan'}>
                                    <Eye className={`w-4 h-4 ${product.active ? 'text-emerald-500' : 'text-gray-400'}`} />
                                  </button>
                                  <button onClick={() => handleEdit(product)} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                    <Pencil className="w-4 h-4 text-blue-500" />
                                  </button>
                                  <button onClick={() => setDeleteId(product.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <span className="text-emerald-600 font-bold">{formatPrice(product.price)}</span>
                                {discount > 0 && <span className="text-xs text-gray-400 line-through">{formatPrice(product.originalPrice)}</span>}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                                <span className="flex items-center gap-1"><Box className="w-3 h-3" /> Min. {product.minOrder}</span>
                                <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Stok: {product.stock}</span>
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {product.location}</span>
                                <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> {product.sold} terjual</span>
                              </div>
                              {product.variantGroups?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {product.variantGroups.map(g => (
                                    <span key={g.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                      {g.name}: {g.options.map(o => o.value).join(', ')}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                /* Product Form */
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Produk' : 'Tambah Produk Baru'}</h2>
                    <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-5">
                      <div>
                        <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700"><Tag className="w-4 h-4 text-emerald-500" /> Nama Produk *</Label>
                        <Input placeholder="Contoh: Kaos Polos Premium Cotton 1 Lusin" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} className="rounded-xl" />
                      </div>
                      <div>
                        <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700"><Layers className="w-4 h-4 text-emerald-500" /> Kategori</Label>
                        <Select value={form.category} onValueChange={(v) => setForm(prev => ({ ...prev, category: v }))}>
                          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>{CATEGORY_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700"><DollarSign className="w-4 h-4 text-emerald-500" /> Harga Jual *</Label>
                          <Input type="number" placeholder="185000" value={form.price || ''} onChange={(e) => setForm(prev => ({ ...prev, price: Number(e.target.value) }))} className="rounded-xl" />
                        </div>
                        <div>
                          <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700"><DollarSign className="w-4 h-4 text-gray-400" /> Harga Coret</Label>
                          <Input type="number" placeholder="350000" value={form.originalPrice || ''} onChange={(e) => setForm(prev => ({ ...prev, originalPrice: Number(e.target.value) }))} className="rounded-xl" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700"><Box className="w-4 h-4 text-emerald-500" /> Min. Pembelian</Label>
                          <Input type="number" min={1} value={form.minOrder || ''} onChange={(e) => setForm(prev => ({ ...prev, minOrder: Number(e.target.value) }))} className="rounded-xl" />
                        </div>
                        <div>
                          <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700"><Package className="w-4 h-4 text-emerald-500" /> Stok</Label>
                          <Input type="number" min={0} value={form.stock || ''} onChange={(e) => setForm(prev => ({ ...prev, stock: Number(e.target.value) }))} className="rounded-xl" />
                        </div>
                      </div>
                      <div>
                        <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700"><MapPin className="w-4 h-4 text-emerald-500" /> Lokasi / Kota</Label>
                        <Select value={form.location} onValueChange={(v) => setForm(prev => ({ ...prev, location: v }))}>
                          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>{getCityNames().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {/* Images */}
                      <div>
                        <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700"><ImagePlus className="w-4 h-4 text-emerald-500" /> Gambar Produk (maks 5)</Label>
                        <div className="flex gap-2 mb-3">
                          <Input placeholder="Paste URL gambar..." value={imageInput} onChange={(e) => setImageInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddImage(); } }} className="rounded-xl flex-1" />
                          <Button type="button" variant="outline" onClick={handleAddImage} disabled={form.images.length >= 5} className="rounded-xl px-4 border-emerald-300 text-emerald-600 hover:bg-emerald-50"><Upload className="w-4 h-4" /></Button>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {form.images.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                              <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />
                              <button onClick={() => handleRemoveImage(idx)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                              {idx === 0 && <span className="absolute bottom-1 left-1 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">Utama</span>}
                            </div>
                          ))}
                          {form.images.length < 5 && (
                            <div className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors cursor-pointer" onClick={() => { }}>
                              <Plus className="w-5 h-5" /><span className="text-[10px] mt-1">Tambah</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Variant Groups */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Layers className="w-4 h-4 text-emerald-500" /> Varian Produk</Label>
                          <Button type="button" variant="outline" size="sm" onClick={handleAddVariantGroup} className="rounded-lg text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-50">
                            <Plus className="w-3 h-3 mr-1" /> Tambah Grup
                          </Button>
                        </div>
                        {variantGroups.map((group, gIdx) => (
                          <div key={gIdx} className="mb-3 p-3 bg-gray-50 rounded-xl space-y-2">
                            <div className="flex items-center gap-2">
                              <Input placeholder="Nama grup (contoh: Ukuran)" value={group.name} onChange={(e) => handleVariantGroupNameChange(gIdx, e.target.value)} className="rounded-lg text-sm flex-1" />
                              <button onClick={() => handleRemoveVariantGroup(gIdx)} className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {group.options.map((opt, oIdx) => (
                                <Badge key={oIdx} variant="secondary" className="bg-emerald-50 text-emerald-700 pr-1 gap-1">{opt}
                                  <button onClick={() => handleRemoveVariantOption(gIdx, oIdx)} className="hover:bg-emerald-200 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                                </Badge>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Tambah opsi (contoh: L, M, Merah)"
                                value={variantOptionInputs[gIdx] || ''}
                                onChange={(e) => setVariantOptionInputs(prev => ({ ...prev, [gIdx]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddVariantOption(gIdx, variantOptionInputs[gIdx] || ''); setVariantOptionInputs(prev => ({ ...prev, [gIdx]: '' })); } }}
                                className="rounded-lg text-xs flex-1"
                              />
                              <Button type="button" variant="outline" size="sm" onClick={() => { handleAddVariantOption(gIdx, variantOptionInputs[gIdx] || ''); setVariantOptionInputs(prev => ({ ...prev, [gIdx]: '' })); }} className="rounded-lg text-xs px-3">
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Description */}
                      <div>
                        <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700"><FileText className="w-4 h-4 text-emerald-500" /> Deskripsi Produk</Label>
                        <Textarea placeholder="Jelaskan produk Anda secara detail..." value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} rows={4} className="rounded-xl resize-none" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                    <Button variant="outline" onClick={resetForm} className="rounded-xl px-6">Batal</Button>
                    <Button onClick={handleSubmit} disabled={!form.name || form.price <= 0} className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl px-8 flex items-center gap-2">
                      <Package className="w-4 h-4" /> {editingId ? 'Simpan Perubahan' : 'Tambah Produk'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            /* ===== PESANAN TAB ===== */
            <div className="max-w-6xl mx-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Pesanan Masuk ({orders.length})</h2>
              {loading ? (
                <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
              ) : orders.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                  <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Belum ada pesanan</h3>
                  <p className="text-gray-500">Pesanan dari buyer akan muncul di sini</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                  {orders.map(order => {
                    const statusInfo = getStatusInfo(order.status);
                    return (
                      <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <span className="text-xs text-gray-400 font-mono">#{order.id.slice(-8)}</span>
                            <Badge className={`text-xs ml-2 ${statusInfo.color}`}>{statusInfo.label}</Badge>
                          </div>
                          <span className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">Pembeli: {order.buyer?.name}</p>
                          <p className="text-xs text-gray-500">{order.shippingAddress}</p>
                        </div>
                        <div className="space-y-1">
                          {order.items.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-gray-600">{item.productName} x{item.quantity}</span>
                              <span className="text-gray-800">{formatPrice(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-600">{formatPrice(order.totalAmount)}</span>
                          <div className="flex gap-2">
                            {order.status === 'pending' && (
                              <>
                                <Button size="sm" variant="outline" className="rounded-lg text-xs border-red-300 text-red-500 hover:bg-red-50" onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}>Tolak</Button>
                                <Button size="sm" className="rounded-lg text-xs bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => handleUpdateOrderStatus(order.id, 'paid')}>Konfirmasi Bayar</Button>
                              </>
                            )}
                            {order.status === 'paid' && (
                              <Button size="sm" className="rounded-lg text-xs bg-cyan-500 hover:bg-cyan-600 text-white" onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}>Kirim Pesanan</Button>
                            )}
                            {order.status === 'shipped' && (
                              <Button size="sm" className="rounded-lg text-xs bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}>Selesai</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            /* ===== STATISTIK TAB ===== */
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Pendapatan Bulanan</h3>
                  {totalRevenue === 0 ? (
                    <div className="flex items-center justify-center h-48 text-gray-400">
                      <div className="text-center">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Belum ada data</p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} />
                        <YAxis fontSize={12} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip formatter={(value: number) => [formatPrice(value), 'Pendapatan']} />
                        <Line type="monotone" dataKey="pendapatan" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Category Distribution */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Distribusi Kategori</h3>
                  {categoryData.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-gray-400">
                      <div className="text-center">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Belum ada data</p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {categoryData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Product Performance */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:col-span-2">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Performa Produk</h3>
                  {products.length === 0 ? (
                    <div className="text-center py-8 text-gray-400"><p>Tambahkan produk untuk melihat statistik</p></div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={products.slice(0, 10).map(p => ({ name: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name, terjual: p.sold, pendapatan: p.sold * p.price }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" fontSize={10} tickLine={false} />
                        <YAxis fontSize={12} tickLine={false} />
                        <Tooltip formatter={(value: number, name: string) => [name === 'pendapatan' ? formatPrice(value) : value, name === 'pendapatan' ? 'Pendapatan' : 'Terjual']} />
                        <Bar dataKey="terjual" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="pendapatan" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300 py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
            <p>&copy; 2024 GrosirPJ. Dashboard Seller</p>
          </div>
        </footer>
      </div>

      {/* Chat Panel */}
      <ChatPanel />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk?</AlertDialogTitle>
            <AlertDialogDescription>Produk yang dihapus tidak dapat dikembalikan. Apakah Anda yakin?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-red-500 hover:bg-red-600 text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
