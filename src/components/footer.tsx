'use client';

import { Zap, Smartphone, Apple, Mail, Phone, MapPin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function Footer() {
  return (
    <footer className="bg-[#1a1a2e] text-gray-300 pt-12 pb-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-[#00A651] rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-white">GrosirPJ</span>
            </div>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              Marketplace grosir terpercaya di Indonesia dengan jutaan produk berkualitas dan harga bersaing.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 bg-gray-800 hover:bg-[#00A651] rounded-lg flex items-center justify-center transition-colors" aria-label="Instagram">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="#" className="w-9 h-9 bg-gray-800 hover:bg-[#00A651] rounded-lg flex items-center justify-center transition-colors" aria-label="Facebook">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="#" className="w-9 h-9 bg-gray-800 hover:bg-[#00A651] rounded-lg flex items-center justify-center transition-colors" aria-label="Twitter">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
          </div>

          {/* Layanan */}
          <div>
            <h4 className="font-semibold text-white mb-4">Layanan</h4>
            <ul className="space-y-2.5 text-sm">
              {['Cara Belanja', 'Pengiriman', 'Pengembalian', 'FAQ', 'Bantuan'].map((item) => (
                <li key={item}><a href="#" className="hover:text-[#FFC107] transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>

          {/* Tentang */}
          <div>
            <h4 className="font-semibold text-white mb-4">Tentang</h4>
            <ul className="space-y-2.5 text-sm">
              {['Tentang Kami', 'Karir', 'Blog', 'Kontak', 'Kebijakan Privasi'].map((item) => (
                <li key={item}><a href="#" className="hover:text-[#FFC107] transition-colors">{item}</a></li>
              ))}
            </ul>
            <div className="mt-4 space-y-1.5 text-sm text-gray-400">
              <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> <span>hello@grosirpj.id</span></div>
              <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> <span>021-1234-5678</span></div>
              <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> <span>Jakarta, Indonesia</span></div>
            </div>
          </div>

          {/* Download */}
          <div>
            <h4 className="font-semibold text-white mb-4">Download Aplikasi</h4>
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

        <Separator className="bg-gray-800 mb-8" />

        {/* Payment Methods */}
        <div className="mb-8">
          <p className="text-sm text-gray-400 mb-3">Metode Pembayaran</p>
          <div className="flex flex-wrap gap-2">
            {['VISA', 'Mastercard', 'BCA', 'Mandiri', 'BNI', 'BRI', 'GoPay', 'OVO', 'DANA', 'ShopeePay'].map((method) => (
              <div key={method} className="px-3 py-1.5 bg-gray-800 rounded-lg text-xs font-medium text-gray-300">{method}</div>
            ))}
          </div>
        </div>

        <Separator className="bg-gray-800 mb-6" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>&copy; 2024 GrosirPJ. Hak cipta dilindungi.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-[#FFC107] transition-colors">Syarat & Ketentuan</a>
            <a href="#" className="hover:text-[#FFC107] transition-colors">Kebijakan Privasi</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
