// ===== CONSTANTS FOR GROSIRPJ =====

export interface Subcategory {
  value: string;
  label: string;
}

export interface CategoryItem {
  value: string;
  label: string;
  emoji: string;
  color: string;
  subcategories: Subcategory[];
}

export const CATEGORIES: CategoryItem[] = [
  {
    value: 'elektronik', label: 'Elektronik', emoji: '📱', color: 'from-purple-500 to-purple-600',
    subcategories: [
      { value: 'handphone-tablet', label: 'Handphone & Tablet' },
      { value: 'laptop-komputer', label: 'Laptop & Komputer' },
      { value: 'komponen-pc', label: 'Komponen PC' },
      { value: 'printer-scanner', label: 'Printer & Scanner' },
      { value: 'kamera-drone', label: 'Kamera & Drone' },
      { value: 'audio-speaker', label: 'Audio & Speaker' },
      { value: 'smartwatch', label: 'Smartwatch' },
      { value: 'tv-home-entertainment', label: 'TV & Home Entertainment' },
      { value: 'gaming-console', label: 'Gaming & Console' },
      { value: 'aksesoris-elektronik', label: 'Aksesoris Elektronik' },
    ],
  },
  {
    value: 'rumah-tangga', label: 'Rumah Tangga', emoji: '🏠', color: 'from-orange-500 to-orange-600',
    subcategories: [
      { value: 'peralatan-dapur', label: 'Peralatan Dapur' },
      { value: 'peralatan-makan', label: 'Peralatan Makan' },
      { value: 'furniture', label: 'Furniture' },
      { value: 'dekorasi-rumah', label: 'Dekorasi Rumah' },
      { value: 'alat-kebersihan', label: 'Alat Kebersihan' },
      { value: 'penyimpanan-organizer', label: 'Penyimpanan & Organizer' },
      { value: 'peralatan-taman', label: 'Peralatan Taman' },
      { value: 'lampu-pencahayaan', label: 'Lampu & Pencahayaan' },
    ],
  },
  {
    value: 'bangunan-teknik', label: 'Bangunan & Teknik', emoji: '🏗️', color: 'from-slate-500 to-slate-600',
    subcategories: [
      { value: 'material-bangunan', label: 'Material Bangunan' },
      { value: 'cat-pelapis', label: 'Cat & Pelapis' },
      { value: 'listrik', label: 'Listrik' },
      { value: 'plumbing', label: 'Plumbing' },
      { value: 'perkakas-tangan', label: 'Perkakas Tangan' },
      { value: 'power-tools', label: 'Power Tools' },
      { value: 'mesin-industri', label: 'Mesin Industri' },
      { value: 'keselamatan-kerja', label: 'Keselamatan Kerja' },
    ],
  },
  {
    value: 'otomotif', label: 'Otomotif', emoji: '🚗', color: 'from-red-500 to-red-600',
    subcategories: [
      { value: 'sparepart-mobil', label: 'Sparepart Mobil' },
      { value: 'sparepart-motor', label: 'Sparepart Motor' },
      { value: 'oli-pelumas', label: 'Oli & Pelumas' },
      { value: 'ban-velg', label: 'Ban & Velg' },
      { value: 'aksesoris-mobil', label: 'Aksesoris Mobil' },
      { value: 'aksesoris-motor', label: 'Aksesoris Motor' },
      { value: 'audio-mobil', label: 'Audio Mobil' },
      { value: 'perawatan-kendaraan', label: 'Perawatan Kendaraan' },
    ],
  },
  {
    value: 'fashion-pria', label: 'Fashion Pria', emoji: '👔', color: 'from-blue-500 to-blue-600',
    subcategories: [
      { value: 'kaos', label: 'Kaos' },
      { value: 'kemeja', label: 'Kemeja' },
      { value: 'jaket', label: 'Jaket' },
      { value: 'celana', label: 'Celana' },
      { value: 'sepatu', label: 'Sepatu' },
      { value: 'sandal', label: 'Sandal' },
      { value: 'jam-tangan', label: 'Jam Tangan' },
      { value: 'aksesoris', label: 'Aksesoris' },
    ],
  },
  {
    value: 'fashion-wanita', label: 'Fashion Wanita', emoji: '👗', color: 'from-pink-500 to-pink-600',
    subcategories: [
      { value: 'dress', label: 'Dress' },
      { value: 'blouse', label: 'Blouse' },
      { value: 'rok', label: 'Rok' },
      { value: 'celana-wanita', label: 'Celana' },
      { value: 'hijab', label: 'Hijab' },
      { value: 'tas', label: 'Tas' },
      { value: 'sepatu-wanita', label: 'Sepatu' },
      { value: 'perhiasan', label: 'Perhiasan' },
    ],
  },
  {
    value: 'ibu-anak', label: 'Ibu & Anak', emoji: '👶', color: 'from-rose-400 to-rose-500',
    subcategories: [
      { value: 'perlengkapan-bayi', label: 'Perlengkapan Bayi' },
      { value: 'popok', label: 'Popok' },
      { value: 'susu-nutrisi', label: 'Susu & Nutrisi' },
      { value: 'mainan-anak', label: 'Mainan Anak' },
      { value: 'pakaian-anak', label: 'Pakaian Anak' },
      { value: 'perlengkapan-sekolah', label: 'Perlengkapan Sekolah' },
    ],
  },
  {
    value: 'kecantikan', label: 'Kecantikan', emoji: '💄', color: 'from-fuchsia-500 to-fuchsia-600',
    subcategories: [
      { value: 'skincare', label: 'Skincare' },
      { value: 'makeup', label: 'Makeup' },
      { value: 'body-care', label: 'Body Care' },
      { value: 'hair-care', label: 'Hair Care' },
      { value: 'parfum', label: 'Parfum' },
      { value: 'alat-kecantikan', label: 'Alat Kecantikan' },
    ],
  },
  {
    value: 'kesehatan', label: 'Kesehatan', emoji: '🏥', color: 'from-green-500 to-green-600',
    subcategories: [
      { value: 'vitamin-suplemen', label: 'Vitamin & Suplemen' },
      { value: 'alat-kesehatan', label: 'Alat Kesehatan' },
      { value: 'masker', label: 'Masker' },
      { value: 'produk-herbal', label: 'Produk Herbal' },
      { value: 'perawatan-pribadi', label: 'Perawatan Pribadi' },
    ],
  },
  {
    value: 'makanan-minuman', label: 'Makanan & Minuman', emoji: '🍜', color: 'from-amber-500 to-amber-600',
    subcategories: [
      { value: 'makanan-ringan', label: 'Makanan Ringan' },
      { value: 'minuman', label: 'Minuman' },
      { value: 'bahan-pokok', label: 'Bahan Pokok' },
      { value: 'frozen-food', label: 'Frozen Food' },
      { value: 'bumbu-masak', label: 'Bumbu Masak' },
      { value: 'kopi-teh', label: 'Kopi & Teh' },
    ],
  },
  {
    value: 'hewan-peliharaan', label: 'Hewan Peliharaan', emoji: '🐾', color: 'from-teal-500 to-teal-600',
    subcategories: [
      { value: 'makanan-hewan', label: 'Makanan Hewan' },
      { value: 'kandang', label: 'Kandang' },
      { value: 'aksesoris-hewan', label: 'Aksesoris Hewan' },
      { value: 'obat-vitamin-hewan', label: 'Obat & Vitamin Hewan' },
    ],
  },
  {
    value: 'olahraga-outdoor', label: 'Olahraga & Outdoor', emoji: '⚽', color: 'from-cyan-500 to-cyan-600',
    subcategories: [
      { value: 'fitness', label: 'Fitness' },
      { value: 'sepeda', label: 'Sepeda' },
      { value: 'camping', label: 'Camping' },
      { value: 'hiking', label: 'Hiking' },
      { value: 'memancing', label: 'Memancing' },
      { value: 'renang', label: 'Renang' },
      { value: 'bola', label: 'Bola' },
    ],
  },
  {
    value: 'hobi-koleksi', label: 'Hobi & Koleksi', emoji: '🎮', color: 'from-violet-500 to-violet-600',
    subcategories: [
      { value: 'action-figure', label: 'Action Figure' },
      { value: 'diecast', label: 'Diecast' },
      { value: 'kartu-koleksi', label: 'Kartu Koleksi' },
      { value: 'alat-musik', label: 'Alat Musik' },
      { value: 'kerajinan-tangan', label: 'Kerajinan Tangan' },
    ],
  },
  {
    value: 'buku-alat-tulis', label: 'Buku & Alat Tulis', emoji: '📚', color: 'from-indigo-500 to-indigo-600',
    subcategories: [
      { value: 'buku-pelajaran', label: 'Buku Pelajaran' },
      { value: 'novel', label: 'Novel' },
      { value: 'komik', label: 'Komik' },
      { value: 'alat-tulis', label: 'Alat Tulis' },
      { value: 'perlengkapan-kantor', label: 'Perlengkapan Kantor' },
    ],
  },
  {
    value: 'kado-souvenir', label: 'Kado & Souvenir', emoji: '🎁', color: 'from-pink-400 to-pink-500',
    subcategories: [
      { value: 'hampers', label: 'Hampers' },
      { value: 'merchandise', label: 'Merchandise' },
      { value: 'kerajinan-lokal', label: 'Kerajinan Lokal' },
      { value: 'souvenir-pernikahan', label: 'Souvenir Pernikahan' },
    ],
  },
  {
    value: 'perkantoran-bisnis', label: 'Perkantoran & Bisnis', emoji: '🏢', color: 'from-gray-500 to-gray-600',
    subcategories: [
      { value: 'mesin-kasir', label: 'Mesin Kasir' },
      { value: 'barcode-scanner', label: 'Barcode Scanner' },
      { value: 'peralatan-kantor', label: 'Peralatan Kantor' },
      { value: 'atk-grosir', label: 'ATK Grosir' },
      { value: 'mesin-fotocopy', label: 'Mesin Fotocopy' },
    ],
  },
  {
    value: 'industri-grosir', label: 'Industri & Grosir', emoji: '🏭', color: 'from-zinc-500 to-zinc-600',
    subcategories: [
      { value: 'bahan-baku', label: 'Bahan Baku' },
      { value: 'mesin-produksi', label: 'Mesin Produksi' },
      { value: 'kemasan', label: 'Kemasan' },
      { value: 'alat-ukur', label: 'Alat Ukur' },
      { value: 'bahan-kimia-industri', label: 'Bahan Kimia Industri' },
      { value: 'peralatan-restoran', label: 'Peralatan Restoran' },
    ],
  },
  {
    value: 'pertanian-peternakan', label: 'Pertanian & Peternakan', emoji: '🌾', color: 'from-lime-500 to-lime-600',
    subcategories: [
      { value: 'bibit-tanaman', label: 'Bibit Tanaman' },
      { value: 'pupuk', label: 'Pupuk' },
      { value: 'pestisida', label: 'Pestisida' },
      { value: 'peralatan-pertanian', label: 'Peralatan Pertanian' },
      { value: 'pakan-ternak', label: 'Pakan Ternak' },
    ],
  },
  {
    value: 'produk-digital', label: 'Produk Digital', emoji: '💾', color: 'from-sky-500 to-sky-600',
    subcategories: [
      { value: 'voucher-game', label: 'Voucher Game' },
      { value: 'pulsa', label: 'Pulsa' },
      { value: 'paket-data', label: 'Paket Data' },
      { value: 'lisensi-software', label: 'Lisensi Software' },
      { value: 'token-pln', label: 'Token PLN' },
    ],
  },
];

// Helper: find category by value
export function getCategoryByValue(value: string): CategoryItem | undefined {
  return CATEGORIES.find(c => c.value === value);
}

// Helper: find subcategory label
export function getSubcategoryLabel(categoryValue: string, subcategoryValue: string): string {
  const cat = getCategoryByValue(categoryValue);
  return cat?.subcategories.find(s => s.value === subcategoryValue)?.label || subcategoryValue;
}

// Legacy compatibility - flat list for simple selects
export const CATEGORY_OPTIONS = CATEGORIES.map(c => ({ value: c.value, label: c.label }));

export const PAYMENT_METHODS = [
  { value: 'cod', label: 'Bayar di Tempat (COD)', icon: '💵' },
  { value: 'transfer', label: 'Transfer Bank', icon: '🏦' },
  { value: 'ewallet', label: 'E-Wallet (GoPay/OVO/DANA)', icon: '📱' },
];

// ESCROW-BASED ORDER STATUSES
// Flow: pending → paid → processing → shipped → delivered
// pending: Menunggu Pembayaran (buyer hasn't paid yet)
// paid: Dibayar (buyer confirmed payment, funds in escrow)
// processing: Diproses (seller processing the order)
// shipped: Dikirim (seller shipped with tracking number)
// delivered: Selesai (buyer confirmed receipt, funds released to seller)
// cancelled: Dibatalkan
export const ORDER_STATUSES = [
  { value: 'pending', label: 'Menunggu Pembayaran', color: 'bg-amber-100 text-amber-700' },
  { value: 'paid', label: 'Dibayar (Escrow)', color: 'bg-blue-100 text-blue-700' },
  { value: 'processing', label: 'Sedang Diproses', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'shipped', label: 'Dikirim', color: 'bg-purple-100 text-purple-700' },
  { value: 'delivered', label: 'Selesai', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'cancelled', label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
];

export function formatPrice(price: number): string {
  return `Rp ${price.toLocaleString('id-ID')}`;
}

export function getStatusInfo(status: string) {
  return ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0];
}

// Marketplace fee percentage (for seller wallet)
export const MARKETPLACE_FEE_PERCENT = 2; // 2% fee
