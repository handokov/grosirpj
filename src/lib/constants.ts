// ===== CONSTANTS FOR GROSIRPJ =====

export const CATEGORIES = [
  { value: 'fashion', label: 'Fashion', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', color: 'from-emerald-500 to-emerald-600' },
  { value: 'elektronik', label: 'Elektronik', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'from-purple-500 to-purple-600' },
  { value: 'rumah', label: 'Rumah Tangga', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', color: 'from-orange-500 to-orange-600' },
  { value: 'kecantikan', label: 'Kecantikan', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', color: 'from-pink-500 to-pink-600' },
  { value: 'kesehatan', label: 'Kesehatan', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'from-green-500 to-green-600' },
  { value: 'olahraga', label: 'Olahraga', icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z', color: 'from-cyan-500 to-cyan-600' },
  { value: 'mainan', label: 'Mainan', icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'from-yellow-500 to-yellow-600' },
  { value: 'makanan', label: 'Makanan & Minuman', icon: 'M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A2.704 2.704 0 003 15.546M9 6v2m3-2v2m3-2v2M9 3h6m-6 0a2 2 0 00-2 2v0a2 2 0 002 2h6a2 2 0 002-2v0a2 2 0 00-2-2M9 3H3v18h18V3h-6', color: 'from-red-500 to-red-600' },
];

export const PAYMENT_METHODS = [
  { value: 'cod', label: 'Bayar di Tempat (COD)', icon: '💵' },
  { value: 'transfer', label: 'Transfer Bank', icon: '🏦' },
  { value: 'ewallet', label: 'E-Wallet (GoPay/OVO/DANA)', icon: '📱' },
];

export const ORDER_STATUSES = [
  { value: 'pending', label: 'Menunggu Pembayaran', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'paid', label: 'Sudah Dibayar', color: 'bg-blue-100 text-blue-700' },
  { value: 'shipped', label: 'Dikirim', color: 'bg-purple-100 text-purple-700' },
  { value: 'delivered', label: 'Diterima', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'cancelled', label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
];

export function formatPrice(price: number): string {
  return `Rp ${price.toLocaleString('id-ID')}`;
}

export function getStatusInfo(status: string) {
  return ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0];
}
