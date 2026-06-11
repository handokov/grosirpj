'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin, Truck, Package, Clock, CheckCircle, Navigation,
  RefreshCw, ArrowRight, ChevronDown, ChevronUp, Copy,
  CircleDot, Circle, Zap, Building2, Bike, Info,
} from 'lucide-react';
import { toast } from 'sonner';

// ===== TYPES =====
interface TrackingCheckpoint {
  date: string;
  time: string;
  status: string;
  description: string;
  location: string;
  lat: number;
  lng: number;
  icon: 'pickup' | 'transit' | 'hub' | 'delivery' | 'delivered';
}

interface TrackingResult {
  waybillNumber: string;
  courier: string;
  courierCode: string;
  status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered';
  statusDescription: string;
  origin: string;
  destination: string;
  estimatedDelivery: string;
  progress: number;
  checkpoints: TrackingCheckpoint[];
  currentLat: number;
  currentLng: number;
  lastUpdate: string;
  service: string;
  weight: string;
}

interface TrackingPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackingNumber: string;
  courier: string;
  origin?: string;
  destination?: string;
}

// ===== STATUS CONFIG =====
const STATUS_CONFIG = {
  pending: { label: 'Menunggu Pickup', color: 'bg-amber-100 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
  in_transit: { label: 'Dalam Perjalanan', color: 'bg-sky-100 text-sky-700 border-sky-200', dotColor: 'bg-sky-500' },
  out_for_delivery: { label: 'Sedang Diantar', color: 'bg-purple-100 text-purple-700 border-purple-200', dotColor: 'bg-purple-500' },
  delivered: { label: 'Terkirim', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
};

const CHECKPOINT_ICONS = {
  pickup: Package,
  transit: ArrowRight,
  hub: Building2,
  delivery: Bike,
  delivered: CheckCircle,
};

const CHECKPOINT_COLORS = {
  pickup: 'text-amber-500 bg-amber-50',
  transit: 'text-sky-500 bg-sky-50',
  hub: 'text-purple-500 bg-purple-50',
  delivery: 'text-orange-500 bg-orange-50',
  delivered: 'text-emerald-500 bg-emerald-50',
};

// ===== MAP COMPONENT (Dynamic Import) =====
// We use a simplified SVG map instead of Leaflet to avoid SSR/hydration issues
function TrackingMap({ checkpoints, currentLat, currentLng, origin, destination }: {
  checkpoints: TrackingCheckpoint[];
  currentLat: number;
  currentLng: number;
  origin: string;
  destination: string;
}) {
  const leafletRef = useRef<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any>(null);

  // Load Leaflet dynamically
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let cancelled = false;

    const loadMap = async () => {
      try {
        const L = (await import('leaflet')).default;
        leafletRef.current = L;

        // Fix default marker icon paths
        delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        if (cancelled || !mapRef.current) return;

        // Import CSS
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        const map = L.map(mapRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView([currentLat, currentLng], 6);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        mapInstanceRef.current = map;
        markersRef.current = L.layerGroup().addTo(map);
        setMapLoaded(true);
      } catch (err) {
        console.error('Failed to load Leaflet:', err);
      }
    };

    loadMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Only run once

  // Update markers when checkpoints change
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !markersRef.current) return;

    const L = leafletRef.current;
    if (!L) return;
    markersRef.current.clearLayers();

    if (checkpoints.length === 0) return;

    // Create custom icons
    const createIcon = (color: string, size: number = 12) => L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });

    const currentIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #10b981;
        border: 3px solid white;
        box-shadow: 0 0 0 3px rgba(16,185,129,0.3), 0 2px 8px rgba(0,0,0,0.3);
        animation: pulse-marker 2s infinite;
      "></div>
      <style>
        @keyframes pulse-marker {
          0%, 100% { box-shadow: 0 0 0 3px rgba(16,185,129,0.3), 0 2px 8px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(16,185,129,0.1), 0 2px 8px rgba(0,0,0,0.3); }
        }
      </style>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    // Add checkpoint markers
    const coords: [number, number][] = [];
    checkpoints.forEach((cp, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === checkpoints.length - 1;
      const color = isLast ? '#10b981' : isFirst ? '#f59e0b' : '#0ea5e9';

      const marker = L.marker([cp.lat, cp.lng], {
        icon: createIcon(color, isLast || isFirst ? 14 : 10),
      });
      marker.bindPopup(`
        <div style="font-family: system-ui; min-width: 150px;">
          <div style="font-weight: 600; font-size: 12px; margin-bottom: 4px;">${cp.status}</div>
          <div style="font-size: 11px; color: #666;">${cp.description}</div>
          <div style="font-size: 10px; color: #999; margin-top: 4px;">${cp.date} ${cp.time}</div>
          <div style="font-size: 10px; color: #999;">📍 ${cp.location}</div>
        </div>
      `);
      markersRef.current!.addLayer(marker);
      coords.push([cp.lat, cp.lng]);
    });

    // Draw route line
    if (coords.length >= 2) {
      const polyline = L.polyline(coords, {
        color: '#10b981',
        weight: 3,
        opacity: 0.6,
        dashArray: '8, 8',
      });
      markersRef.current!.addLayer(polyline);
    }

    // Add current position marker
    const currentMarker = L.marker([currentLat, currentLng], {
      icon: currentIcon,
      zIndexOffset: 1000,
    });
    currentMarker.bindPopup(`
      <div style="font-family: system-ui;">
        <div style="font-weight: 600; font-size: 12px;">📍 Posisi Paket Saat Ini</div>
      </div>
    `);
    markersRef.current!.addLayer(currentMarker);

    // Fit map to show all markers
    const group = L.featureGroup(markersRef.current.getLayers() as L.Layer[]);
    mapInstanceRef.current.fitBounds(group.getBounds().pad(0.2));

  }, [mapLoaded, checkpoints, currentLat, currentLng]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
      <div ref={mapRef} className="w-full h-[250px] md:h-[300px]" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Memuat peta...</p>
          </div>
        </div>
      )}
      {/* Map overlay info */}
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-gray-700">Live Tracking</span>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN TRACKING PANEL =====
export function TrackingPanel({
  open,
  onOpenChange,
  trackingNumber,
  courier,
  origin = 'Jakarta',
  destination = 'Surabaya',
}: TrackingPanelProps) {
  const [tracking, setTracking] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [lastPolled, setLastPolled] = useState<Date | null>(null);
  const [showAllCheckpoints, setShowAllCheckpoints] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch tracking data
  const fetchTracking = useCallback(async () => {
    if (!trackingNumber) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        resi: trackingNumber,
        kurir: courier,
        origin,
        destination,
      });
      const res = await fetch(`/api/tracking?${params}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setTracking(data.data);
        setLastPolled(new Date());
        setPollCount(prev => prev + 1);
      } else {
        setError(data.error || 'Gagal mengambil data tracking');
      }
    } catch {
      setError('Koneksi gagal. Coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  }, [trackingNumber, courier, origin, destination]);

  // Initial fetch and auto-polling
  useEffect(() => {
    if (open && trackingNumber) {
      fetchTracking();

      // Auto-poll every 30 seconds
      pollingRef.current = setInterval(() => {
        fetchTracking();
      }, 30000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [open, trackingNumber, fetchTracking]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTracking(null);
      setError(null);
      setPollCount(0);
      setLastPolled(null);
      setShowAllCheckpoints(false);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [open]);

  const copyResi = () => {
    navigator.clipboard.writeText(trackingNumber).then(() => {
      toast.success('Nomor resi berhasil disalin!');
    });
  };

  const statusConfig = tracking ? STATUS_CONFIG[tracking.status] : STATUS_CONFIG.pending;

  // Visible checkpoints (show last 3 by default)
  const visibleCheckpoints = useMemo(() => {
    if (!tracking) return [];
    if (showAllCheckpoints) return tracking.checkpoints;
    return tracking.checkpoints.slice(-3);
  }, [tracking, showAllCheckpoints]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-display">Lacak Pengiriman</DialogTitle>
                <DialogDescription className="text-sm">
                  Pseudo Live Tracking — Update otomatis setiap 30 detik
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Resi Info Card */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold text-gray-800">{courier}</span>
                {tracking && (
                  <Badge variant="outline" className="text-[10px]">
                    {tracking.service}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-emerald-600 h-7 text-xs"
                onClick={fetchTracking}
                disabled={loading}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <code className="text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-gray-200 flex-1">
                {trackingNumber}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={copyResi}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Origin → Destination */}
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-medium text-gray-700">{origin}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-medium text-gray-700">{destination}</span>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && !tracking && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-[250px] w-full rounded-xl" />
            </div>
          )}

          {/* Error State */}
          {error && !tracking && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-sm text-red-600 font-medium">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-red-200 text-red-600 hover:bg-red-50"
                onClick={fetchTracking}
              >
                Coba Lagi
              </Button>
            </div>
          )}

          {/* Tracking Data */}
          {tracking && (
            <>
              {/* Status Badge + Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className={`${statusConfig.color} text-xs font-medium`}>
                    <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor} mr-1.5 inline-block`} />
                    {statusConfig.label}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {tracking.progress}% selesai
                  </span>
                </div>

                <Progress
                  value={tracking.progress}
                  className="h-2.5"
                />

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Estimasi: {tracking.estimatedDelivery}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    <span>{tracking.weight}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 font-medium">
                  {tracking.statusDescription}
                </p>
              </div>

              {/* Map */}
              <TrackingMap
                checkpoints={tracking.checkpoints}
                currentLat={tracking.currentLat}
                currentLng={tracking.currentLng}
                origin={origin}
                destination={destination}
              />

              <Separator />

              {/* Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">Riwayat Pengiriman</h3>
                  {lastPolled && (
                    <span className="text-[10px] text-gray-400">
                      Update: {lastPolled.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <div className="space-y-0">
                  {visibleCheckpoints.map((cp, idx) => {
                    const IconComp = CHECKPOINT_ICONS[cp.icon] || CircleDot;
                    const colorClass = CHECKPOINT_COLORS[cp.icon] || 'text-gray-500 bg-gray-50';
                    const isLatest = idx === visibleCheckpoints.length - 1 && tracking.status !== 'delivered';

                    return (
                      <div key={`${cp.date}-${cp.time}-${idx}`} className="flex gap-3">
                        {/* Timeline line + icon */}
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorClass} ${isLatest ? 'ring-2 ring-emerald-200' : ''}`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          {idx < visibleCheckpoints.length - 1 && (
                            <div className="w-0.5 flex-1 min-h-[24px] bg-gray-200" />
                          )}
                        </div>

                        {/* Content */}
                        <div className={`pb-4 ${idx === visibleCheckpoints.length - 1 ? 'pb-0' : ''}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">{cp.status}</span>
                            {isLatest && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">
                                Terbaru
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">{cp.description}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-gray-400">{cp.date} {cp.time}</span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5" /> {cp.location}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Show more/less */}
                {tracking.checkpoints.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-gray-500 hover:text-emerald-600"
                    onClick={() => setShowAllCheckpoints(!showAllCheckpoints)}
                  >
                    {showAllCheckpoints ? (
                      <><ChevronUp className="w-3 h-3 mr-1" /> Tampilkan sedikit</>
                    ) : (
                      <><ChevronDown className="w-3 h-3 mr-1" /> Lihat semua ({tracking.checkpoints.length} checkpoint)</>
                    )}
                  </Button>
                )}
              </div>

              {/* Auto-polling indicator */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg p-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>Auto-refresh setiap 30 detik</span>
                {pollCount > 1 && (
                  <span className="text-gray-300">· Polled {pollCount}x</span>
                )}
              </div>

              {/* Info box */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700">
                  <p className="font-medium mb-0.5">Pseudo Live Tracking</p>
                  <p>Data tracking disimulasikan dari API ekspedisi. Posisi pada peta adalah estimasi berdasarkan checkpoint terakhir. Untuk integrasi nyata, hubungkan ke API Binderbyte/RajaOngkir.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
