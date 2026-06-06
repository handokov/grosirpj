'use client';

import { useState, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, ImagePlus, X, Package, DollarSign,
  Tag, MapPin, FileText, Layers, Box, ChevronLeft, Store,
  Upload, Eye, BarChart3, ShoppingBag, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export interface SellerProduct {
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
  variants: string[];
  sellerName: string;
  sellerRating: number;
  rating: number;
  sold: number;
  createdAt: string;
  status: 'active' | 'draft' | 'inactive';
}

interface SellerDashboardProps {
  sellerName: string;
  sellerCity: string;
  onBack: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'fashion', label: 'Fashion' },
  { value: 'elektronik', label: 'Elektronik' },
  { value: 'rumah', label: 'Rumah Tangga' },
  { value: 'kecantikan', label: 'Kecantikan' },
  { value: 'kesehatan', label: 'Kesehatan' },
  { value: 'olahraga', label: 'Olahraga' },
  { value: 'mainan', label: 'Mainan' },
];

const INITIAL_FORM: Omit<SellerProduct, 'id' | 'createdAt' | 'status' | 'sold' | 'rating' | 'sellerRating'> = {
  name: '',
  price: 0,
  originalPrice: 0,
  images: [],
  category: 'fashion',
  description: '',
  minOrder: 1,
  stock: 100,
  location: '',
  variants: [],
  sellerName: '',
};

export function SellerDashboard({ sellerName, sellerCity, onBack }: SellerDashboardProps) {
  const [products, setProducts] = useState<SellerProduct[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('grosirpj_seller_products');
      if (stored) return JSON.parse(stored);
    }
    return [];
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...INITIAL_FORM, sellerName, location: sellerCity });
  const [variantInput, setVariantInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'stats'>('products');

  const saveProducts = useCallback((items: SellerProduct[]) => {
    setProducts(items);
    localStorage.setItem('grosirpj_seller_products', JSON.stringify(items));
  }, []);

  const handleAddVariant = useCallback(() => {
    const v = variantInput.trim();
    if (v && !form.variants.includes(v)) {
      setForm(prev => ({ ...prev, variants: [...prev.variants, v] }));
      setVariantInput('');
    }
  }, [variantInput, form.variants]);

  const handleRemoveVariant = useCallback((v: string) => {
    setForm(prev => ({ ...prev, variants: prev.variants.filter(x => x !== v) }));
  }, []);

  const handleAddImage = useCallback(() => {
    const url = imageInput.trim();
    if (url && form.images.length < 5) {
      setForm(prev => ({ ...prev, images: [...prev.images, url] }));
      setImageInput('');
    }
  }, [imageInput, form.images.length]);

  const handleRemoveImage = useCallback((idx: number) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!form.name || form.price <= 0) return;

    if (editingId) {
      const updated = products.map(p =>
        p.id === editingId
          ? { ...p, ...form, price: Number(form.price), originalPrice: Number(form.originalPrice), minOrder: Number(form.minOrder), stock: Number(form.stock) }
          : p
      );
      saveProducts(updated);
      setEditingId(null);
    } else {
      const newProduct: SellerProduct = {
        ...form,
        id: Date.now().toString(),
        price: Number(form.price),
        originalPrice: Number(form.originalPrice),
        minOrder: Number(form.minOrder),
        stock: Number(form.stock),
        sold: 0,
        rating: 0,
        sellerRating: 4.5,
        createdAt: new Date().toISOString(),
        status: 'active',
      };
      saveProducts([...products, newProduct]);
    }

    setForm({ ...INITIAL_FORM, sellerName, location: sellerCity });
    setShowForm(false);
  }, [form, editingId, products, saveProducts, sellerName, sellerCity]);

  const handleEdit = useCallback((product: SellerProduct) => {
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
      variants: product.variants,
      sellerName: product.sellerName,
    });
    setEditingId(product.id);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    saveProducts(products.filter(p => p.id !== id));
  }, [products, saveProducts]);

  const handleToggleStatus = useCallback((id: string) => {
    const updated = products.map(p =>
      p.id === id
        ? { ...p, status: (p.status === 'active' ? 'inactive' : 'active') as SellerProduct['status'] }
        : p
    );
    saveProducts(updated);
  }, [products, saveProducts]);

  const formatPrice = (price: number) => `Rp ${price.toLocaleString('id-ID')}`;

  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === 'active').length;
  const totalSold = products.reduce((sum, p) => sum + p.sold, 0);
  const totalRevenue = products.reduce((sum, p) => sum + p.sold * p.price, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#f0fdf4]">
      {/* ===== NAVBAR ===== */}
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
                  <h1 className="font-bold text-gray-900 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Dashboard Seller</h1>
                  <p className="text-xs text-gray-500">{sellerName} · {sellerCity}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                Online
              </Badge>
            </div>
          </div>
        </div>
      </nav>

      {/* ===== MAIN CONTENT ===== */}
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
                <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-full w-fit">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${activeTab === 'products' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600'}`}
              onClick={() => setActiveTab('products')}
            >
              Kelola Produk
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${activeTab === 'stats' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600'}`}
              onClick={() => setActiveTab('stats')}
            >
              Statistik
            </button>
          </div>

          {activeTab === 'products' && (
            <>
              {/* Add Product Button */}
              {!showForm && (
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Produk Saya ({products.length})
                  </h2>
                  <Button
                    onClick={() => { setForm({ ...INITIAL_FORM, sellerName, location: sellerCity }); setEditingId(null); setShowForm(true); }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Produk
                  </Button>
                </div>
              )}

              {/* Product Form */}
              {showForm && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {editingId ? 'Edit Produk' : 'Tambah Produk Baru'}
                    </h2>
                    <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-5">
                      {/* Product Name */}
                      <div>
                        <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                          <Tag className="w-4 h-4 text-emerald-500" /> Nama Produk *
                        </Label>
                        <Input
                          placeholder="Contoh: Kaos Polos Premium Cotton 1 Lusin"
                          value={form.name}
                          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                          <Layers className="w-4 h-4 text-emerald-500" /> Kategori
                        </Label>
                        <select
                          value={form.category}
                          onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        >
                          {CATEGORY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Price Row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                            <DollarSign className="w-4 h-4 text-emerald-500" /> Harga Jual *
                          </Label>
                          <Input
                            type="number"
                            placeholder="185000"
                            value={form.price || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                            className="rounded-xl"
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                            <DollarSign className="w-4 h-4 text-gray-400" /> Harga Coret
                          </Label>
                          <Input
                            type="number"
                            placeholder="350000"
                            value={form.originalPrice || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, originalPrice: Number(e.target.value) }))}
                            className="rounded-xl"
                          />
                        </div>
                      </div>

                      {/* Min Order & Stock */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                            <Box className="w-4 h-4 text-emerald-500" /> Min. Pembelian
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={form.minOrder || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, minOrder: Number(e.target.value) }))}
                            className="rounded-xl"
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                            <Package className="w-4 h-4 text-emerald-500" /> Stok
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={form.stock || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, stock: Number(e.target.value) }))}
                            className="rounded-xl"
                          />
                        </div>
                      </div>

                      {/* Location */}
                      <div>
                        <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                          <MapPin className="w-4 h-4 text-emerald-500" /> Lokasi / Kota
                        </Label>
                        <Input
                          placeholder="Jakarta"
                          value={form.location}
                          onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-5">
                      {/* Images */}
                      <div>
                        <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                          <ImagePlus className="w-4 h-4 text-emerald-500" /> Gambar Produk (maks 5)
                        </Label>
                        <div className="flex gap-2 mb-3">
                          <Input
                            placeholder="Paste URL gambar..."
                            value={imageInput}
                            onChange={(e) => setImageInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddImage(); } }}
                            className="rounded-xl flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddImage}
                            disabled={form.images.length >= 5}
                            className="rounded-xl px-4 border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {form.images.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                              <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />
                              <button
                                onClick={() => handleRemoveImage(idx)}
                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              {idx === 0 && (
                                <span className="absolute bottom-1 left-1 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">Utama</span>
                              )}
                            </div>
                          ))}
                          {form.images.length < 5 && (
                            <div className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors cursor-pointer"
                              onClick={() => document.getElementById('image-input')?.focus()}
                            >
                              <Plus className="w-5 h-5" />
                              <span className="text-[10px] mt-1">Tambah</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Variants / Sizes */}
                      <div>
                        <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                          <Layers className="w-4 h-4 text-emerald-500" /> Varian / Ukuran
                        </Label>
                        <div className="flex gap-2 mb-2">
                          <Input
                            placeholder="Contoh: S, M, L, XL atau Hitam, Putih"
                            value={variantInput}
                            onChange={(e) => setVariantInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddVariant(); } }}
                            className="rounded-xl flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddVariant}
                            className="rounded-xl px-4 border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {form.variants.map(v => (
                            <Badge key={v} variant="secondary" className="bg-emerald-50 text-emerald-700 pr-1 gap-1">
                              {v}
                              <button onClick={() => handleRemoveVariant(v)} className="hover:bg-emerald-200 rounded-full p-0.5">
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                          <FileText className="w-4 h-4 text-emerald-500" /> Deskripsi Produk
                        </Label>
                        <Textarea
                          placeholder="Jelaskan produk Anda secara detail: bahan, ukuran, keunggulan, dll. Semakin detail, semakin menarik bagi buyer!"
                          value={form.description}
                          onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={4}
                          className="rounded-xl resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                    <Button
                      variant="outline"
                      onClick={() => { setShowForm(false); setEditingId(null); }}
                      className="rounded-xl px-6"
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={!form.name || form.price <= 0}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl px-8 flex items-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      {editingId ? 'Simpan Perubahan' : 'Tambah Produk'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Product List */}
              {!showForm && (
                <>
                  {products.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                      <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Package className="w-10 h-10 text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Belum ada produk</h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Mulai tambahkan produk pertama Anda untuk mulai berjualan di GrosirPJ
                      </p>
                      <Button
                        onClick={() => { setForm({ ...INITIAL_FORM, sellerName, location: sellerCity }); setShowForm(true); }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl flex items-center gap-2 mx-auto"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah Produk Pertama
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto">
                      {products.map(product => {
                        const discount = product.originalPrice > 0
                          ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                          : 0;
                        return (
                          <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-4 hover:shadow-md transition-shadow">
                            {/* Product Image */}
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                              {product.images[0] ? (
                                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <ImagePlus className="w-8 h-8" />
                                </div>
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{product.name}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs capitalize">{CATEGORY_OPTIONS.find(c => c.value === product.category)?.label || product.category}</Badge>
                                    <Badge className={`text-xs ${product.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                      {product.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => handleToggleStatus(product.id)}
                                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                    title={product.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                                  >
                                    <Eye className={`w-4 h-4 ${product.status === 'active' ? 'text-emerald-500' : 'text-gray-400'}`} />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(product)}
                                    className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil className="w-4 h-4 text-blue-500" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(product.id)}
                                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <span className="text-emerald-600 font-bold">{formatPrice(product.price)}</span>
                                {discount > 0 && (
                                  <span className="text-xs text-gray-400 line-through">{formatPrice(product.originalPrice)}</span>
                                )}
                                {discount > 0 && (
                                  <Badge className="bg-red-100 text-red-600 text-xs">-{discount}%</Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Box className="w-3 h-3" /> Min. {product.minOrder} pcs</span>
                                <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Stok: {product.stock}</span>
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {product.location}</span>
                                <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> {product.sold} terjual</span>
                              </div>

                              {product.variants.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {product.variants.map(v => (
                                    <span key={v} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{v}</span>
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
              )}
            </>
          )}

          {activeTab === 'stats' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Statistik Penjualan
              </h3>
              {products.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Belum ada data penjualan</p>
                  <p className="text-sm text-gray-400">Tambahkan produk untuk mulai melihat statistik</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Per Product Stats */}
                  <div className="space-y-3">
                    {products.map(product => (
                      <div key={product.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white flex-shrink-0">
                          {product.images[0] ? (
                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{product.name}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {product.rating || 'Baru'}</span>
                            <span>{product.sold} terjual</span>
                            <span>{formatPrice(product.price)}/pcs</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-emerald-600">{formatPrice(product.sold * product.price)}</p>
                          <p className="text-xs text-gray-400">Stok: {product.stock}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{formatPrice(totalRevenue)}</p>
                      <p className="text-sm text-gray-600">Total Pendapatan</p>
                    </div>
                    <div className="bg-cyan-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-cyan-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{totalSold}</p>
                      <p className="text-sm text-gray-600">Total Terjual</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>&copy; 2024 GrosirPJ. Dashboard Seller</p>
        </div>
      </footer>
    </div>
  );
}
