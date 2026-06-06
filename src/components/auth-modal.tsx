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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/auth';
import { getCityNames } from '@/lib/shipping';
import { Zap, Mail, Lock, User, MapPin, ArrowRight, AlertCircle } from 'lucide-react';

export function AuthModal() {
  const { loginModalOpen, setLoginModalOpen, login, register } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if this is a seller registration attempt
  const isSellerIntent = typeof window !== 'undefined' && localStorage.getItem('grosirpj_pending_seller') === 'true';

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('Jakarta');

  const cityNames = getCityNames();

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setCity('Jakarta');
    setError('');
    setLoading(false);
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    resetForm();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(email, password);
    if (!success) {
      setError('Email atau password salah. Silakan coba lagi.');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setLoading(true);
    // Check if registering as seller (from "Jual" button click)
    const pendingSeller = localStorage.getItem('grosirpj_pending_seller') === 'true';
    const role = pendingSeller ? 'seller' : 'buyer';
    const success = await register(name, email, password, city, role);
    if (!success) {
      setError('Registrasi gagal. Email mungkin sudah terdaftar.');
    }
    setLoading(false);
  };

  return (
    <Dialog open={loginModalOpen} onOpenChange={(open) => {
      setLoginModalOpen(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
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
                ? isSellerIntent
                  ? 'Masuk ke akun seller untuk mulai berjualan'
                  : 'Masuk ke akun Anda untuk mulai berbelanja'
                : isSellerIntent
                  ? 'Buat akun seller baru dan mulai berjualan'
                  : 'Buat akun baru dan mulai belanja grosir'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          {/* Tab Switcher */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-full mb-6">
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${
                mode === 'login'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => switchMode('login')}
            >
              Masuk
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${
                mode === 'register'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => switchMode('register')}
            >
              Daftar
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="contoh@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
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
              <p className="text-center text-sm text-gray-500">
                Belum punya akun?{' '}
                <button
                  type="button"
                  className="text-emerald-600 font-semibold hover:underline"
                  onClick={() => switchMode('register')}
                >
                  Daftar Sekarang
                </button>
              </p>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name" className="text-sm font-medium text-gray-700">
                  Nama Lengkap
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="reg-name"
                    type="text"
                    placeholder="Nama lengkap Anda"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="contoh@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Kota Anda
                  </div>
                </Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih kota" />
                  </SelectTrigger>
                  <SelectContent>
                    {cityNames.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">
                  Digunakan untuk menghitung estimasi ongkos kirim
                </p>
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-6 rounded-xl"
                disabled={loading}
              >
                {loading ? 'Memproses...' : 'Daftar'}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
              <p className="text-center text-sm text-gray-500">
                Sudah punya akun?{' '}
                <button
                  type="button"
                  className="text-emerald-600 font-semibold hover:underline"
                  onClick={() => switchMode('login')}
                >
                  Masuk
                </button>
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
