// ===== INDONESIAN CITIES WITH COORDINATES =====
export interface CityLocation {
  name: string;
  lat: number;
  lng: number;
  island: string;
}

export const cities: CityLocation[] = [
  { name: "Jakarta", lat: -6.2088, lng: 106.8456, island: "Jawa" },
  { name: "Surabaya", lat: -7.2575, lng: 112.7521, island: "Jawa" },
  { name: "Bandung", lat: -6.9175, lng: 107.6191, island: "Jawa" },
  { name: "Semarang", lat: -6.9666, lng: 110.4196, island: "Jawa" },
  { name: "Yogyakarta", lat: -7.7972, lng: 110.3688, island: "Jawa" },
  { name: "Solo", lat: -7.5755, lng: 110.8243, island: "Jawa" },
  { name: "Medan", lat: 3.5952, lng: 98.6722, island: "Sumatera" },
  { name: "Palembang", lat: -2.9761, lng: 104.7754, island: "Sumatera" },
  { name: "Pekanbaru", lat: 0.5071, lng: 101.4478, island: "Sumatera" },
  { name: "Padang", lat: -0.9493, lng: 100.3543, island: "Sumatera" },
  { name: "Lampung", lat: -5.4500, lng: 105.2667, island: "Sumatera" },
  { name: "Makassar", lat: -5.1477, lng: 119.4327, island: "Sulawesi" },
  { name: "Manado", lat: 1.4748, lng: 124.8421, island: "Sulawesi" },
  { name: "Denpasar", lat: -8.6500, lng: 115.2167, island: "Bali" },
  { name: "Balikpapan", lat: -1.2654, lng: 116.8311, island: "Kalimantan" },
  { name: "Banjarmasin", lat: -3.3186, lng: 114.5944, island: "Kalimantan" },
  { name: "Pontianak", lat: -0.0226, lng: 109.3471, island: "Kalimantan" },
  { name: "Samarinda", lat: -0.4948, lng: 117.1436, island: "Kalimantan" },
  { name: "Lombok", lat: -8.6500, lng: 116.3250, island: "NTB" },
  { name: "Kupang", lat: -10.1772, lng: 123.5980, island: "NTT" },
  { name: "Ambon", lat: -3.6954, lng: 128.1814, island: "Maluku" },
  { name: "Jayapura", lat: -2.5916, lng: 140.6690, island: "Papua" },
  { name: "Pekalongan", lat: -6.8886, lng: 109.6802, island: "Jawa" },
  { name: "Malang", lat: -7.9666, lng: 112.6326, island: "Jawa" },
  { name: "Tangerang", lat: -6.1783, lng: 106.6319, island: "Jawa" },
  { name: "Bekasi", lat: -6.2349, lng: 106.9896, island: "Jawa" },
  { name: "Depok", lat: -6.4025, lng: 106.7942, island: "Jawa" },
  { name: "Bogor", lat: -6.5971, lng: 106.8060, island: "Jawa" },
  { name: "Cirebon", lat: -6.7063, lng: 108.5570, island: "Jawa" },
  { name: "Batu", lat: -7.8713, lng: 112.5236, island: "Jawa" },
];

// Haversine formula to calculate distance between two coordinates (in km)
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface ShippingEstimate {
  cost: number;
  distance: number;
  estimatedDays: string;
  courier: string;
}

// Calculate shipping cost based on distance and island crossing
export function calculateShipping(fromCity: string, toCity: string): ShippingEstimate {
  const from = cities.find((c) => c.name === fromCity) || cities[0]; // default Jakarta
  const to = cities.find((c) => c.name === toCity) || cities[0];

  // Same city
  if (fromCity === toCity) {
    return {
      cost: 0,
      distance: 0,
      estimatedDays: "1-2 hari",
      courier: "Gratis Ongkir",
    };
  }

  const distance = haversine(from.lat, from.lng, to.lat, to.lng);
  const sameIsland = from.island === to.island;

  let cost: number;
  let estimatedDays: string;

  if (sameIsland) {
    // Same island: Rp 5.000 base + Rp 500/km, max 100km extra
    const extraKm = Math.min(distance, 800);
    cost = 5000 + Math.ceil(extraKm / 50) * 2000;
    estimatedDays = distance < 200 ? "1-2 hari" : distance < 500 ? "2-3 hari" : "3-4 hari";
  } else {
    // Different island: base 15.000 + distance-based
    const extraKm = Math.min(distance, 3000);
    cost = 15000 + Math.ceil(extraKm / 100) * 3000;
    estimatedDays = distance < 1000 ? "3-5 hari" : distance < 2000 ? "4-6 hari" : "5-8 hari";
  }

  // Cap maximum at Rp 80.000
  cost = Math.min(cost, 80000);

  // Free shipping for purchases over 100k handled at UI level

  return {
    cost,
    distance: Math.round(distance),
    estimatedDays,
    courier: "JNE / J&T / SiCepat",
  };
}

// Get all available city names for dropdown
export function getCityNames(): string[] {
  return cities.map((c) => c.name);
}

// Format shipping info
export function formatShippingInfo(estimate: ShippingEstimate): string {
  if (estimate.cost === 0) return "Gratis Ongkir";
  return `Rp ${estimate.cost.toLocaleString("id-ID")} (~${estimate.estimatedDays})`;
}
