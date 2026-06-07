'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, ImagePlus, X, Package, DollarSign,
  Tag, MapPin, FileText, Layers, Box, ChevronLeft, Store,
  Upload, Eye, BarChart3, ShoppingBag, Star, ArrowRight, AlertCircle, CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export function SellerDashboard({ onBack }: SellerDashboardProps) {
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');

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

  // Stats
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.active).length;
  const totalSold = products.reduce((sum, p) => sum + p.sold, 0);
  const totalRevenue = products.reduce((sum, p) => sum + p.sold * p.price, 0);

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
    // Simulate monthly revenue from sold data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];
    return months.map((m, i) => ({
      name: m,
      pendapatan: Math.round(totalRevenue / 6 * (0.5 + Math.random() * 0.8)),
    }));
  }, [totalRevenue]);

  // Variant option input state per group
  const [variantOptionInputs, setVariantOptionInputs] = useState<Record<number, string>>({});

  return (
    <div className="min-h-screen flex flex-col bg-[#f0fdf4]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md shadow-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900 text-sm font-display">Dashboard Seller</h1>
                  <p className="text-xs text-gray-500">{user?.name || 'Seller'} · {user?.city || 'Jakarta'}</p>
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>Online
            </Badge>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 md:pt-24 pb-8 flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Package, label: 'Total Produk', value: totalProducts, color: 'from-emerald-500 to-emerald-600' },
              { icon: Eye, label: 'Produk Aktif', value: activeProducts, color: 'from-cyan-500 to-cyan-600' },
              { icon: ShoppingBag, label: 'Total Terjual', value: totalSold, color: 'from-orange-500 to-orange-600' },
              { icon: DollarSign, label: 'Pendapatan', value: formatPrice(totalRevenue), color: 'from-pink-500 to-pink-600' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
                <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-900 font-display">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 bg-gray-100 p-1 rounded-full h-auto w-fit">
              <TabsTrigger value="products" className="rounded-full px-4 py-2">Kelola Produk</TabsTrigger>
              <TabsTrigger value="orders" className="rounded-full px-4 py-2">Pesanan</TabsTrigger>
              <TabsTrigger value="stats" className="rounded-full px-4 py-2">Statistik</TabsTrigger>
            </TabsList>

            {/* ===== KELOLA PRODUK TAB ===== */}
            <TabsContent value="products">
              {!showForm ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 font-display">Produk Saya ({products.length})</h2>
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
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
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
                    <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto pr-1">
                      {products.map(product => {
                        const discount = product.originalPrice > product.price
                          ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
                        return (
                          <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-4 hover:shadow-md transition-shadow">
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
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 font-display">{editingId ? 'Edit Produk' : 'Tambah Produk Baru'}</h2>
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
            </TabsContent>

            {/* ===== PESANAN TAB ===== */}
            <TabsContent value="orders">
              <h2 className="text-xl font-bold text-gray-900 font-display mb-6">Pesanan Masuk ({orders.length})</h2>
              {loading ? (
                <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
              ) : orders.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                  <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Belum ada pesanan</h3>
                  <p className="text-gray-500">Pesanan dari buyer akan muncul di sini</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto pr-1">
                  {orders.map(order => {
                    const statusInfo = getStatusInfo(order.status);
                    return (
                      <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
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
            </TabsContent>

            {/* ===== STATISTIK TAB ===== */}
            <TabsContent value="stats">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 font-display">Pendapatan Bulanan</h3>
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
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 font-display">Distribusi Kategori</h3>
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
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:col-span-2">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 font-display">Performa Produk</h3>
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
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>&copy; 2024 GrosirPJ. Dashboard Seller</p>
        </div>
      </footer>

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
