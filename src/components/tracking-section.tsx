'use client';

import { useState, useCallback } from 'react';
import {
  MapPin, Truck, Navigation, Search, ArrowRight, Package,
  CheckCircle, Clock, Zap, Shield, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TrackingPanel } from '@/components/tracking-panel';

// ===== DEMO TRACKING NUMBERS =====
const DEMO_TRACKINGS = [
  { resi: 'JNE1234567890', courier: 'JNE', from: 'Jakarta', to: 'Surabaya', label: 'JNE Reguler' },
  { resi: 'SICEPAT9876543210', courier: 'SiCepat', from: 'Jakarta', to: 'Makassar', label: 'SiCepat BEST' },
  { resi: 'JNT5678901234', courier: 'J&T', from: 'Jakarta', to: 'Medan', label: 'J&T Express' },
  { resi: 'TIK2468013579', courier: 'Tiki', from: 'Bandung', to: 'Denpasar', label: 'Tiki ONS' },
];

// ===== FEATURES DATA =====
const FEATURES = [
  {
    icon: Navigation,
    title: 'Peta Interaktif',
    desc: 'Lihat posisi paket di peta secara real-time',
    color: 'text-emerald-500 bg-emerald-50',
  },
  {
    icon: RefreshCw,
    title: 'Auto Refresh',
    desc: 'Update otomatis setiap 30 detik',
    color: 'text-sky-500 bg-sky-50',
  },
  {
    icon: Clock,
    title: 'Timeline Lengkap',
    desc: 'Riwayat perjalanan paket dari pickup sampai tiba',
    color: 'text-amber-500 bg-amber-50',
  },
  {
    icon: Shield,
    title: 'Multi Ekspedisi',
    desc: 'JNE, J&T, SiCepat, Tiki, Anteraja & lainnya',
    color: 'text-purple-500 bg-purple-50',
  },
];

export function TrackingSection() {
  const [resi, setResi] = useState('');
  const [courier, setCourier] = useState('JNE');
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [selectedResi, setSelectedResi] = useState('');
  const [selectedCourier, setSelectedCourier] = useState('JNE');
  const [selectedOrigin, setSelectedOrigin] = useState('Jakarta');
  const [selectedDestination, setSelectedDestination] = useState('Surabaya');

  const handleTrack = useCallback(() => {
    if (!resi.trim()) return;
    setSelectedResi(resi.trim());
    setSelectedCourier(courier);
    setSelectedOrigin('Jakarta');
    setSelectedDestination('Surabaya');
    setTrackingOpen(true);
  }, [resi, courier]);

  const handleDemoTrack = useCallback((demo: typeof DEMO_TRACKINGS[number]) => {
    setSelectedResi(demo.resi);
    setSelectedCourier(demo.courier);
    setSelectedOrigin(demo.from);
    setSelectedDestination(demo.to);
    setTrackingOpen(true);
  }, []);

  return (
    <>
      <section id="tracking" className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Navigation className="w-4 h-4" />
              Pseudo Live Tracking
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 font-display mb-3">
              Lacak Pengiriman Paket
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Pantau posisi paket Anda secara real-time dengan peta interaktif.
              Masukkan nomor resi untuk mulai melacak.
            </p>
          </div>

          {/* Search Card */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
              <div className="flex flex-col gap-4">
                {/* Courier Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ekspedisi</label>
                  <div className="flex flex-wrap gap-2">
                    {['JNE', 'J&T', 'SiCepat', 'Tiki', 'Anteraja', 'POS', 'Ninja', 'SAP'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setCourier(c)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          courier === c
                            ? 'bg-emerald-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resi Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Resi</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={resi}
                        onChange={(e) => setResi(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleTrack(); }}
                        placeholder="Masukkan nomor resi pengiriman..."
                        className="pl-10 h-12 rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                      />
                    </div>
                    <Button
                      onClick={handleTrack}
                      disabled={!resi.trim()}
                      className="h-12 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-md"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Lacak
                    </Button>
                  </div>
                </div>

                {/* Demo Quick Access */}
                <div>
                  <p className="text-xs text-gray-400 mb-2">Coba demo tracking:</p>
                  <div className="flex flex-wrap gap-2">
                    {DEMO_TRACKINGS.map((demo) => (
                      <button
                        key={demo.resi}
                        onClick={() => handleDemoTrack(demo)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-lg text-xs text-gray-600 hover:text-emerald-700 transition-all"
                      >
                        <Truck className="w-3 h-3" />
                        <span className="font-medium">{demo.label}</span>
                        <span className="text-gray-400">{demo.from} → {demo.to}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="text-center p-4 md:p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 ${feat.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                  <feat.icon className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">{feat.title}</h3>
                <p className="text-xs text-gray-500">{feat.desc}</p>
              </div>
            ))}
          </div>

          {/* How It Works */}
          <div className="mt-12 max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 md:p-8 border border-emerald-100">
              <h3 className="text-lg font-bold text-gray-800 font-display mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-500" />
                Cara Kerja Pseudo Live Tracking
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Masukkan Nomor Resi</p>
                    <p className="text-xs text-gray-500">Input resi & pilih ekspedisi</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Cek API Ekspedisi</p>
                    <p className="text-xs text-gray-500">Data diambil dari API ekspedisi</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Tampil di Peta + Timeline</p>
                    <p className="text-xs text-gray-500">Auto-refresh tiap 30 detik</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tracking Dialog */}
      <TrackingPanel
        open={trackingOpen}
        onOpenChange={setTrackingOpen}
        trackingNumber={selectedResi}
        courier={selectedCourier}
        origin={selectedOrigin}
        destination={selectedDestination}
      />
    </>
  );
}
