'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/store/auth';
import { getCityNames } from '@/lib/shipping';
import { Zap, Mail, Lock, User, MapPin, ArrowRight, AlertCircle, Store, Phone } from 'lucide-react';

// Helper to check seller intent from localStorage
function checkSellerIntent(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('grosirpj_pending_seller') === 'true';
}

export function AuthModal() {
  const { loginModalOpen, setLoginModalOpen, login, register, error: storeError } = useAuthStore();

  // Detect seller intent at component creation time
  const [initialSellerIntent] = useState(checkSellerIntent);
  const [mode, setMode] = useState<'login' | 'register'>(initialSellerIntent ? 'register' : 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCity, setRegCity] = useState('Jakarta');
  const [regPhone, setRegPhone] = useState('');
  const [isSeller, setIsSeller] = useState(initialSellerIntent);
  const [regStoreName, setRegStoreName] = useState('');
  const [regStoreDesc, setRegStoreDesc] = useState('');

  const cityNames = getCityNames();

  const resetForm = () => {
    setLoginEmail('');
    setLoginPassword('');
    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setRegCity('Jakarta');
    setRegPhone('');
    setIsSeller(false);
    setRegStoreName('');
    setRegStoreDesc('');
    setError('');
    setLoading(false);
    setMode('login');
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(loginEmail, loginPassword);
    if (!result.success) {
      setError(result.error || 'Email atau password salah. Silakan coba lagi.');
    } else {
      resetForm();
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (regPassword.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }
    if (isSeller && !regStoreName.trim()) {
      setError('Nama toko wajib diisi untuk seller');
      return;
    }

    setLoading(true);
    const role = isSeller ? 'seller' : 'buyer';
    const result = await register({
      name: regName,
      email: regEmail,
      password: regPassword,
      city: regCity,
      role,
      phone: regPhone,
      storeName: isSeller ? regStoreName : undefined,
      storeDescription: isSeller ? regStoreDesc : undefined,
    });

    if (!result.success) {
      setError(result.error || 'Registrasi gagal. Email mungkin sudah terdaftar.');
    } else {
      localStorage.removeItem('grosirpj_pending_seller');
      resetForm();
    }
    setLoading(false);
  };

  return (
    <Dialog open={loginModalOpen} onOpenChange={(open) => {
      setLoginModalOpen(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-white font-display text-xl">
                GrosirPJ
              </DialogTitle>
            </div>
            <DialogDescription className="text-emerald-100">
              {mode === 'login'
                ? isSeller
                  ? 'Masuk ke akun seller untuk mulai berjualan'
                  : 'Masuk ke akun Anda untuk mulai berbelanja'
                : isSeller
                  ? 'Buat akun seller baru dan mulai berjualan'
                  : 'Buat akun baru dan mulai belanja grosir'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          {/* Tab Switcher */}
          <Tabs value={mode} onValueChange={(v) => switchMode(v as 'login' | 'register')} className="w-full">
            <TabsList className="w-full mb-6 bg-gray-100 p-1 rounded-full h-auto">
              <TabsTrigger value="login" className="flex-1 py-2 rounded-full data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">Masuk</TabsTrigger>
              <TabsTrigger value="register" className="flex-1 py-2 rounded-full data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">Daftar</TabsTrigger>
            </TabsList>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="contoh@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10 rounded-xl"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Masukkan password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 rounded-xl"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-6 rounded-xl"
                  disabled={loading}
                >
                  {loading ? 'Memproses...' : 'Masuk'}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
                <div className="bg-emerald-50 rounded-xl p-3 text-xs text-emerald-700 space-y-1">
                  <p className="font-semibold">Demo Accounts:</p>
                  <p>Buyer: buyer@grosirpj.id / password123</p>
                  <p>Seller: seller1@grosirpj.id / password123</p>
                </div>
              </form>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name" className="text-sm font-medium text-gray-700">Nama Lengkap</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="Nama lengkap Anda"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="pl-10 rounded-xl"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-sm font-medium text-gray-700">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="contoh@email.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="pl-10 rounded-xl"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-sm font-medium text-gray-700">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Minimal 6 karakter"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="pl-10 rounded-xl"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-phone" className="text-sm font-medium text-gray-700">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> No. Telepon (opsional)</span>
                  </Label>
                  <Input
                    id="reg-phone"
                    type="tel"
                    placeholder="0812-xxxx-xxxx"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Kota Anda</span>
                  </Label>
                  <Select value={regCity} onValueChange={setRegCity}>
                    <SelectTrigger className="w-full rounded-xl">
                      <SelectValue placeholder="Pilih kota" />
                    </SelectTrigger>
                    <SelectContent>
                      {cityNames.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400">Digunakan untuk menghitung estimasi ongkos kirim</p>
                </div>

                {/* Seller Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Store className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">Daftar sebagai Seller</p>
                      <p className="text-xs text-gray-500">Mulai berjualan di GrosirPJ</p>
                    </div>
                  </div>
                  <Switch checked={isSeller} onCheckedChange={setIsSeller} />
                </div>

                {/* Seller-only fields */}
                {isSeller && (
                  <div className="space-y-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="space-y-2">
                      <Label htmlFor="reg-store-name" className="text-sm font-medium text-gray-700">Nama Toko *</Label>
                      <Input
                        id="reg-store-name"
                        type="text"
                        placeholder="Contoh: Toko Fashion Bandung"
                        value={regStoreName}
                        onChange={(e) => setRegStoreName(e.target.value)}
                        className="rounded-xl"
                        required={isSeller}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-store-desc" className="text-sm font-medium text-gray-700">Deskripsi Toko</Label>
                      <Textarea
                        id="reg-store-desc"
                        placeholder="Ceritakan tentang toko Anda..."
                        value={regStoreDesc}
                        onChange={(e) => setRegStoreDesc(e.target.value)}
                        className="rounded-xl resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-6 rounded-xl"
                  disabled={loading}
                >
                  {loading ? 'Memproses...' : 'Daftar'}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
