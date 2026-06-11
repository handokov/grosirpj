// ===== TRACKING SIMULATION LIBRARY =====
// Simulates expedition API responses with realistic Indonesian shipping data
// In production, replace this with actual API calls to Binderbyte/RajaOngkir

import { cities, type CityLocation } from './shipping';

// ===== TYPES =====
export interface TrackingCheckpoint {
  date: string;
  time: string;
  status: string;
  description: string;
  location: string;
  lat: number;
  lng: number;
  icon: 'pickup' | 'transit' | 'hub' | 'delivery' | 'delivered';
}

export interface TrackingResult {
  waybillNumber: string;
  courier: string;
  courierCode: string;
  status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered';
  statusDescription: string;
  origin: string;
  destination: string;
  estimatedDelivery: string;
  progress: number; // 0-100
  checkpoints: TrackingCheckpoint[];
  currentLat: number;
  currentLng: number;
  lastUpdate: string;
  service: string;
  weight: string;
}

// ===== SHIPPING ROUTES =====
// Predefined routes between major Indonesian cities
const SHIPPING_ROUTES: Record<string, string[]> = {
  'Jakarta-Surabaya': ['Jakarta', 'Cirebon', 'Semarang', 'Solo', 'Surabaya'],
  'Jakarta-Bandung': ['Jakarta', 'Bogor', 'Bandung'],
  'Jakarta-Semarang': ['Jakarta', 'Cirebon', 'Semarang'],
  'Jakarta-Yogyakarta': ['Jakarta', 'Cirebon', 'Semarang', 'Yogyakarta'],
  'Jakarta-Medan': ['Jakarta', 'Palembang', 'Lampung', 'Medan'],
  'Jakarta-Makassar': ['Jakarta', 'Surabaya', 'Denpasar', 'Makassar'],
  'Jakarta-Denpasar': ['Jakarta', 'Semarang', 'Surabaya', 'Denpasar'],
  'Jakarta-Balikpapan': ['Jakarta', 'Surabaya', 'Banjarmasin', 'Balikpapan'],
  'Jakarta-Pontianak': ['Jakarta', 'Semarang', 'Pontianak'],
  'Jakarta-Manado': ['Jakarta', 'Surabaya', 'Makassar', 'Manado'],
  'Surabaya-Jakarta': ['Surabaya', 'Solo', 'Semarang', 'Cirebon', 'Jakarta'],
  'Surabaya-Bandung': ['Surabaya', 'Semarang', 'Bandung'],
  'Surabaya-Denpasar': ['Surabaya', 'Denpasar'],
  'Bandung-Jakarta': ['Bandung', 'Bogor', 'Jakarta'],
  'Bandung-Semarang': ['Bandung', 'Cirebon', 'Semarang'],
  'Semarang-Jakarta': ['Semarang', 'Cirebon', 'Jakarta'],
  'Semarang-Surabaya': ['Semarang', 'Solo', 'Surabaya'],
  'Medan-Jakarta': ['Medan', 'Lampung', 'Palembang', 'Jakarta'],
  'Makassar-Jakarta': ['Makassar', 'Denpasar', 'Surabaya', 'Jakarta'],
  'Denpasar-Jakarta': ['Denpasar', 'Surabaya', 'Semarang', 'Jakarta'],
};

// Get a route between two cities (with fallback)
function getRoute(origin: string, destination: string): string[] {
  const key = `${origin}-${destination}`;
  if (SHIPPING_ROUTES[key]) return SHIPPING_ROUTES[key];

  // Try reverse
  const reverseKey = `${destination}-${origin}`;
  if (SHIPPING_ROUTES[reverseKey]) return [...SHIPPING_ROUTES[reverseKey]].reverse();

  // Fallback: generate a simple route through intermediate cities
  const route = [origin];
  if (origin !== destination) {
    route.push(destination);
  }
  return route;
}

// Get city coordinates
function getCityCoords(cityName: string): { lat: number; lng: number } {
  const city = cities.find(c => c.name === cityName);
  return city ? { lat: city.lat, lng: city.lng } : { lat: -6.2088, lng: 106.8456 };
}

// ===== COURIER SERVICES =====
const COURIER_SERVICES: Record<string, { name: string; code: string; services: string[] }> = {
  'JNE': { name: 'Jalur Nugraha Ekakurir', code: 'jne', services: ['REG', 'YES', 'OKE'] },
  'J&T': { name: 'J&T Express', code: 'jnt', services: ['EZ', 'SPS'] },
  'SiCepat': { name: 'SiCepat Ekspres', code: 'sicepat', services: ['REG', 'BEST', 'GOKIL'] },
  'Tiki': { name: 'Citra Van Titipan Kilat', code: 'tiki', services: ['REG', 'ECO', 'ONS'] },
  'Anteraja': { name: 'Anteraja', code: 'anteraja', services: ['REG', 'NEXT'] },
  'POS': { name: 'POS Indonesia', code: 'pos', services: ['KILAT', 'REGULER', 'EKONOMI'] },
  'Ninja': { name: 'Ninja Xpress', code: 'ninja', services: ['STANDARD', 'EXPRESS'] },
  'SAP': { name: 'SAP Express', code: 'sap', services: ['REG', 'EXPRESS'] },
};

// ===== GENERATE SIMULATED TRACKING =====
// Generates realistic tracking data based on tracking number
// The simulation is deterministic based on the tracking number hash
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateTrackingData(
  trackingNumber: string,
  courier: string,
  originCity: string = 'Jakarta',
  destinationCity: string = 'Surabaya'
): TrackingResult {
  const hash = hashCode(trackingNumber);
  const courierInfo = COURIER_SERVICES[courier] || COURIER_SERVICES['JNE'];
  const route = getRoute(originCity, destinationCity);

  // Determine progress based on tracking number hash
  // This simulates different stages of delivery
  const progressSeed = hash % 100;
  let progress: number;
  let status: TrackingResult['status'];
  let statusDescription: string;

  if (progressSeed < 15) {
    progress = 10;
    status = 'pending';
    statusDescription = 'Paket menunggu pickup';
  } else if (progressSeed < 35) {
    progress = 25;
    status = 'in_transit';
    statusDescription = 'Paket telah di pickup';
  } else if (progressSeed < 55) {
    progress = 45;
    status = 'in_transit';
    statusDescription = 'Paket sedang dalam perjalanan';
  } else if (progressSeed < 70) {
    progress = 65;
    status = 'in_transit';
    statusDescription = 'Paket tiba di hub transit';
  } else if (progressSeed < 85) {
    progress = 80;
    status = 'in_transit';
    statusDescription = 'Paket dalam perjalanan ke tujuan';
  } else if (progressSeed < 93) {
    progress = 92;
    status = 'out_for_delivery';
    statusDescription = 'Paket sedang diantar';
  } else {
    progress = 100;
    status = 'delivered';
    statusDescription = 'Paket telah diterima';
  }

  // Generate checkpoints based on progress and route
  const checkpoints: TrackingCheckpoint[] = [];
  const now = new Date();
  const baseDate = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000)); // 3 days ago

  // Always add pickup checkpoint
  const pickupCity = route[0];
  const pickupCoords = getCityCoords(pickupCity);
  checkpoints.push({
    date: formatDate(baseDate),
    time: formatTime(addHours(baseDate, 8 + (hash % 4))),
    status: 'Pickup',
    description: `Paket telah di pickup oleh kurir ${courierInfo.name}`,
    location: pickupCity,
    lat: pickupCoords.lat,
    lng: pickupCoords.lng,
    icon: 'pickup',
  });

  // Add transit checkpoints based on progress
  if (progress >= 15) {
    const hubCity = pickupCity;
    const hubCoords = getCityCoords(hubCity);
    const hubTime = addHours(baseDate, 12 + (hash % 6));
    checkpoints.push({
      date: formatDate(hubTime),
      time: formatTime(hubTime),
      status: 'Transit',
      description: `Paket tiba di sorting center ${hubCity}`,
      location: hubCity,
      lat: hubCoords.lat,
      lng: hubCoords.lng,
      icon: 'hub',
    });
  }

  // Add intermediate city checkpoints
  if (progress >= 30 && route.length > 2) {
    for (let i = 1; i < route.length - 1; i++) {
      const transitProgress = 20 + (i / (route.length - 1)) * 50;
      if (progress >= transitProgress) {
        const city = route[i];
        const coords = getCityCoords(city);
        const transitTime = addHours(baseDate, 18 + i * 12 + (hash % 8));
        checkpoints.push({
          date: formatDate(transitTime),
          time: formatTime(transitTime),
          status: 'Transit',
          description: `Paket tiba di hub ${city}`,
          location: city,
          lat: coords.lat,
          lng: coords.lng,
          icon: 'transit',
        });
      }
    }
  }

  // Add destination hub checkpoint
  if (progress >= 70) {
    const destCity = route[route.length - 1];
    const destCoords = getCityCoords(destCity);
    const destHubTime = addHours(baseDate, 48 + (hash % 12));
    checkpoints.push({
      date: formatDate(destHubTime),
      time: formatTime(destHubTime),
      status: 'Transit',
      description: `Paket tiba di hub ${destCity}`,
      location: destCity,
      lat: destCoords.lat,
      lng: destCoords.lng,
      icon: 'hub',
    });
  }

  // Add out for delivery checkpoint
  if (progress >= 90) {
    const destCity = route[route.length - 1];
    const destCoords = getCityCoords(destCity);
    const deliveryTime = addHours(baseDate, 60 + (hash % 8));
    checkpoints.push({
      date: formatDate(deliveryTime),
      time: formatTime(deliveryTime),
      status: 'Pengantaran',
      description: `Paket sedang diantar oleh kurir`,
      location: destCity,
      lat: destCoords.lat + 0.01,
      lng: destCoords.lng + 0.01,
      icon: 'delivery',
    });
  }

  // Add delivered checkpoint
  if (progress >= 100) {
    const destCity = route[route.length - 1];
    const destCoords = getCityCoords(destCity);
    const deliveredTime = addHours(baseDate, 64 + (hash % 6));
    checkpoints.push({
      date: formatDate(deliveredTime),
      time: formatTime(deliveredTime),
      status: 'Diterima',
      description: `Paket telah diterima oleh penerima`,
      location: destCity,
      lat: destCoords.lat,
      lng: destCoords.lng,
      icon: 'delivered',
    });
  }

  // Calculate current position (interpolated between last two checkpoints)
  let currentLat: number;
  let currentLng: number;

  if (checkpoints.length >= 2) {
    const last = checkpoints[checkpoints.length - 1];
    const prev = checkpoints[checkpoints.length - 2];
    // Add some random offset to simulate current movement
    const offset = (hash % 100) / 1000;
    currentLat = (last.lat + prev.lat) / 2 + offset;
    currentLng = (last.lng + prev.lng) / 2 + offset;
  } else if (checkpoints.length === 1) {
    currentLat = checkpoints[0].lat;
    currentLng = checkpoints[0].lng;
  } else {
    currentLat = getCityCoords(originCity).lat;
    currentLng = getCityCoords(originCity).lng;
  }

  // Calculate estimated delivery
  const estimatedDays = Math.ceil(route.length * 1.5);
  const estimatedDate = new Date(baseDate.getTime() + estimatedDays * 24 * 60 * 60 * 1000);

  return {
    waybillNumber: trackingNumber,
    courier: courierInfo.name,
    courierCode: courierInfo.code,
    status,
    statusDescription,
    origin: originCity,
    destination: destinationCity,
    estimatedDelivery: formatDate(estimatedDate),
    progress,
    checkpoints,
    currentLat,
    currentLng,
    lastUpdate: new Date().toISOString(),
    service: courierInfo.services[hash % courierInfo.services.length],
    weight: `${(hash % 5 + 1) * 250 + 100}g`,
  };
}

// ===== HELPER FUNCTIONS =====
function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// ===== SIMULATE PROGRESS INCREMENT =====
// Call this to simulate a small progress update (like real polling would get)
let progressIncrement = 0;

export function simulateProgressUpdate(tracking: TrackingResult): TrackingResult {
  progressIncrement++;
  // Every few calls, increment the progress slightly
  if (progressIncrement % 3 === 0 && tracking.progress < 100) {
    const newProgress = Math.min(tracking.progress + 5, 100);
    const route = getRoute(tracking.origin, tracking.destination);

    // Recalculate with new progress
    return {
      ...tracking,
      progress: newProgress,
      status: newProgress >= 100 ? 'delivered' :
              newProgress >= 92 ? 'out_for_delivery' :
              newProgress >= 10 ? 'in_transit' : 'pending',
      statusDescription: newProgress >= 100 ? 'Paket telah diterima' :
                        newProgress >= 92 ? 'Paket sedang diantar' :
                        newProgress >= 80 ? 'Paket dalam perjalanan ke tujuan' :
                        newProgress >= 45 ? 'Paket sedang dalam perjalanan' :
                        newProgress >= 25 ? 'Paket telah di pickup' :
                        'Paket menunggu pickup',
      lastUpdate: new Date().toISOString(),
    };
  }
  return tracking;
}

// ===== CACHE =====
const trackingCache = new Map<string, { data: TrackingResult; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export function getCachedTracking(key: string): TrackingResult | null {
  const cached = trackingCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

export function setCachedTracking(key: string, data: TrackingResult): void {
  trackingCache.set(key, { data, timestamp: Date.now() });
}

export function clearTrackingCache(key?: string): void {
  if (key) {
    trackingCache.delete(key);
  } else {
    trackingCache.clear();
  }
}
