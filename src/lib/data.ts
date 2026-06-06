export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  rating: number;
  sold: number;
  location: string;
  category: string;
  discount?: number;
  description?: string;
  minOrder?: number;
  stock?: number;
  seller?: string;
  sellerRating?: number;
  variants?: string[];
}

export interface Category {
  name: string;
  icon: string;
  color: string;
}

export const flashSaleProducts: Product[] = [
  {
    id: 101, name: "Pakaian Dalam Pria Premium", price: 45000, originalPrice: 150000,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop",
    sold: 2340, discount: 70, rating: 4.8, location: "Jakarta", category: "fashion",
    description: "Pakaian dalam pria premium dengan bahan cotton combed 30s yang lembut dan nyaman. Tersedia dalam berbagai ukuran S-XXL. 1 paket isi 12 pcs.",
    minOrder: 12, stock: 5000, seller: "CV Garment Prima", sellerRating: 4.9,
    variants: ["S", "M", "L", "XL", "XXL"],
  },
  {
    id: 102, name: "Tas Selempang Wanita", price: 89000, originalPrice: 250000,
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&h=200&fit=crop",
    sold: 1856, discount: 64, rating: 4.7, location: "Surabaya", category: "fashion",
    description: "Tas selempang wanita dengan desain elegan dan bahan kulit sintetis premium. Cocok untuk acara formal maupun kasual. Tersedia dalam beberapa warna.",
    minOrder: 6, stock: 3200, seller: "Toko Bag Surabaya", sellerRating: 4.8,
    variants: ["Hitam", "Coklat", "Krem", "Merah"],
  },
  {
    id: 103, name: "Sepatu Sneakers Unisex", price: 125000, originalPrice: 350000,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop",
    sold: 987, discount: 65, rating: 4.6, location: "Bandung", category: "fashion",
    description: "Sepatu sneakers unisex dengan sol karet anti slip dan bahan canvas premium. Nyaman digunakan seharian. Tersedia ukuran 38-44.",
    minOrder: 6, stock: 1800, seller: "Bandung Shoes Center", sellerRating: 4.7,
    variants: ["38", "39", "40", "41", "42", "43", "44"],
  },
  {
    id: 104, name: "Headset Bluetooth Premium", price: 79000, originalPrice: 200000,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop",
    sold: 3421, discount: 60, rating: 4.5, location: "Jakarta", category: "elektronik",
    description: "Headset bluetooth premium dengan noise cancelling, bass mendalam, dan baterai tahan 12 jam. Dilengkapi mikrofon built-in untuk panggilan.",
    minOrder: 10, stock: 7500, seller: "Elektronik Jakarta", sellerRating: 4.6,
    variants: ["Hitam", "Putih", "Merah"],
  },
  {
    id: 105, name: "Peralatan Makan 24pcs", price: 165000, originalPrice: 450000,
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop",
    sold: 654, discount: 63, rating: 4.8, location: "Semarang", category: "rumah",
    description: "Set peralatan makan 24 pcs terbuat dari stainless steel 304 food grade. Termasuk sendok, garpu, pisau, dan sendok sup. Cocok untuk rumah tangga dan restoran.",
    minOrder: 5, stock: 1200, seller: "Home Kitchen Store", sellerRating: 4.9,
    variants: ["Silver", "Gold"],
  },
  {
    id: 106, name: "Dress Wanita Elegant", price: 99000, originalPrice: 320000,
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200&h=200&fit=crop",
    sold: 2134, discount: 69, rating: 4.9, location: "Yogyakarta", category: "fashion",
    description: "Dress wanita elegan dengan bahan chiffon berkualitas tinggi. Cocok untuk pesta, acara formal, dan kondangan. Tersedia ukuran S-XL.",
    minOrder: 6, stock: 4500, seller: "Fashion Yogyakarta", sellerRating: 4.8,
    variants: ["S", "M", "L", "XL"],
  },
];

export const categories: Category[] = [
  { name: "Fashion Pria", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", color: "from-blue-500 to-blue-600" },
  { name: "Fashion Wanita", icon: "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "from-pink-500 to-pink-600" },
  { name: "Elektronik", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", color: "from-purple-500 to-purple-600" },
  { name: "Rumah Tangga", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", color: "from-orange-500 to-orange-600" },
  { name: "Kecantikan", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", color: "from-red-500 to-red-600" },
  { name: "Kesehatan", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", color: "from-green-500 to-green-600" },
  { name: "Olahraga", icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z", color: "from-cyan-500 to-cyan-600" },
  { name: "Mainan", icon: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "from-yellow-500 to-yellow-600" },
];

export const products: Product[] = [
  {
    id: 1, name: "Kaos Polos Premium Cotton 1 Lusin", price: 185000, originalPrice: 350000,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop",
    rating: 4.9, sold: 4521, location: "Jakarta", category: "fashion",
    description: "Kaos polos premium cotton combed 30s, jahitan rantai double needle. Bahan tebal, dingin, dan nyaman dipakai sehari-hari. 1 lusin isi 12 pcs dengan campuran warna. Cocok untuk resale dan kebutuhan grosir.",
    minOrder: 12, stock: 8500, seller: "CV Garment Jakarta", sellerRating: 4.9,
    variants: ["S", "M", "L", "XL", "XXL"],
  },
  {
    id: 2, name: "Set Panci Masak Stainless Steel", price: 289000, originalPrice: 550000,
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&fit=crop",
    rating: 4.8, sold: 892, location: "Surabaya", category: "rumah",
    description: "Set panci masak stainless steel 5 lapis isi 4 pcs dengan tutup kaca. Bahan food grade, tahan lama, dan mudah dibersihkan. Cocok untuk dapur rumah tangga maupun restoran.",
    minOrder: 3, stock: 600, seller: "Home Kitchen Surabaya", sellerRating: 4.8,
    variants: ["4 Pcs", "6 Pcs", "8 Pcs"],
  },
  {
    id: 3, name: "Smartwatch Sport Waterproof", price: 199000, originalPrice: 450000,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop",
    rating: 4.7, sold: 2341, location: "Bandung", category: "elektronik",
    description: "Smartwatch sport waterproof IP68 dengan layar AMOLED 1.69 inch. Dilengkapi heart rate monitor, GPS, dan 100+ sport modes. Baterai tahan hingga 7 hari.",
    minOrder: 5, stock: 3200, seller: "Tech Store Bandung", sellerRating: 4.7,
    variants: ["Hitam", "Putih", "Hijau"],
  },
  {
    id: 4, name: "Rok Plisket Wanita 1 Paket", price: 125000, originalPrice: 280000,
    image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=300&h=300&fit=crop",
    rating: 4.9, sold: 1876, location: "Yogyakarta", category: "fashion",
    description: "Rok plisket wanita premium dengan bahan crepe berkualitas. Tidak mudah kusut dan jatuh sempurna. 1 paket isi 6 pcs campuran warna. Cocok untuk resale.",
    minOrder: 6, stock: 5500, seller: "Fashion Yogyakarta", sellerRating: 4.8,
    variants: ["S", "M", "L", "XL"],
  },
  {
    id: 5, name: "Blender Philips 2L 350Watt", price: 245000, originalPrice: 420000,
    image: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=300&h=300&fit=crop",
    rating: 4.6, sold: 654, location: "Semarang", category: "elektronik",
    description: "Blender Philips kapasitas 2L dengan motor 350Watt. Mata pisau 6 sisi anti karat. Dilengkapi 3 speed + pulse. Ideal untuk membuat jus, smoothie, dan bumbu dapur.",
    minOrder: 3, stock: 450, seller: "Elektronik Semarang", sellerRating: 4.6,
    variants: ["Putih", "Hitam"],
  },
  {
    id: 6, name: "Set Alat Makan 36 Pcs Premium", price: 175000, originalPrice: 320000,
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&fit=crop",
    rating: 4.8, sold: 1234, location: "Medan", category: "rumah",
    description: "Set alat makan 36 pcs terbuat dari stainless steel 304 food grade premium. Termasuk sendok, garpu, pisau, sendok sup, dan sumpit. Desain elegan dengan finishing mirror polish.",
    minOrder: 5, stock: 2800, seller: "Home Kitchen Medan", sellerRating: 4.9,
    variants: ["Silver", "Gold", "Rose Gold"],
  },
  {
    id: 7, name: "Kemeja Batik Pria Modern", price: 145000, originalPrice: 295000,
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=300&h=300&fit=crop",
    rating: 4.7, sold: 3456, location: "Pekalongan", category: "fashion",
    description: "Kemeja batik pria modern dengan motif batik tulis asli Pekalongan. Bahan katun premium yang adem dan nyaman. Cocok untuk acara formal, semi-formal, dan kasual.",
    minOrder: 6, stock: 4200, seller: "Batik Pekalongan Store", sellerRating: 4.9,
    variants: ["S", "M", "L", "XL", "XXL"],
  },
  {
    id: 8, name: "Speaker Bluetooth Portable", price: 165000, originalPrice: 350000,
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300&h=300&fit=crop",
    rating: 4.5, sold: 2109, location: "Jakarta", category: "elektronik",
    description: "Speaker bluetooth portable dengan output 20W dan bass mendalam. IPX7 waterproof, baterai tahan 15 jam. Dilengkapi TWS untuk pairing 2 speaker.",
    minOrder: 5, stock: 3800, seller: "Audio Jakarta Center", sellerRating: 4.5,
    variants: ["Hitam", "Merah", "Biru"],
  },
  {
    id: 9, name: "Bedcover Set King Size", price: 325000, originalPrice: 650000,
    image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=300&h=300&fit=crop",
    rating: 4.9, sold: 567, location: "Solo", category: "rumah",
    description: "Bedcover set king size dengan bahan katun Jepang premium. Isi: 1 bedcover (180x200), 1 sarung bantal, 1 sarung guling. Lembut, adem, dan anti alergi.",
    minOrder: 3, stock: 900, seller: "Textile Solo Center", sellerRating: 4.9,
    variants: ["Putih", "Krem", "Abu-abu"],
  },
  {
    id: 10, name: "Celana Chino Pria Slim Fit", price: 135000, originalPrice: 275000,
    image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=300&h=300&fit=crop",
    rating: 4.8, sold: 2890, location: "Bandung", category: "fashion",
    description: "Celana chino pria slim fit dengan bahan stretch yang nyaman. Tidak mudah kusut dan cocok untuk berbagai acara. 1 paket isi 6 pcs campuran warna.",
    minOrder: 6, stock: 6200, seller: "Bandung Fashion Store", sellerRating: 4.8,
    variants: ["28", "29", "30", "31", "32", "33", "34"],
  },
];

export function formatPrice(price: number): string {
  return `Rp ${price.toLocaleString('id-ID')}`;
}
