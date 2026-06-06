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
  // ===== 20 PRODUK TAMBAHAN =====
  {
    id: 11, name: "Jaket Bomber Pria Premium", price: 195000, originalPrice: 450000,
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&h=300&fit=crop",
    rating: 4.7, sold: 1567, location: "Jakarta", category: "fashion",
    description: "Jaket bomber pria dengan bahan parasut waterproof dan dalaman fleece. Dilengkapi 2 saku resleting dan 1 saku dalam. Cocok untuk musim hujan.",
    minOrder: 6, stock: 3400, seller: "Jakarta Jacket Store", sellerRating: 4.7,
    variants: ["M", "L", "XL", "XXL"],
  },
  {
    id: 12, name: "Set Rak Buku Minimalis 5 Tingkat", price: 275000, originalPrice: 500000,
    image: "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=300&h=300&fit=crop",
    rating: 4.6, sold: 432, location: "Surabaya", category: "rumah",
    description: "Set rak buku minimalis 5 tingkat dengan bahan kayu solid dan rangka besi kokoh. Mudah dirakit dan tahan lama. Dimensi 60x30x150 cm.",
    minOrder: 3, stock: 350, seller: "Furniture Surabaya", sellerRating: 4.6,
    variants: ["Coklat", "Hitam", "Putih"],
  },
  {
    id: 13, name: "Powerbank 20000mAh Fast Charging", price: 125000, originalPrice: 280000,
    image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=300&h=300&fit=crop",
    rating: 4.8, sold: 5432, location: "Jakarta", category: "elektronik",
    description: "Powerbank 20000mAh dengan fast charging 22.5W. Dilengkapi 3 port output (2 USB-A + 1 USB-C) dan LED display. Bisa charge 4x untuk smartphone.",
    minOrder: 10, stock: 8900, seller: "Gadget Jakarta", sellerRating: 4.8,
    variants: ["Hitam", "Putih"],
  },
  {
    id: 14, name: "Hijab Segi Empat Premium Voal", price: 85000, originalPrice: 180000,
    image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=300&h=300&fit=crop",
    rating: 4.9, sold: 7890, location: "Pekalongan", category: "fashion",
    description: "Hijab segi empat premium bahan voal super yang adem dan tidak mudah kusut. 1 paket isi 12 pcs campuran warna. Ukuran 115x115 cm.",
    minOrder: 12, stock: 12000, seller: "Hijab Pekalongan", sellerRating: 4.9,
    variants: ["Campur Warna", "Pastel Set", "Dark Set"],
  },
  {
    id: 15, name: "Sapu Istan Set 5 in 1", price: 95000, originalPrice: 200000,
    image: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=300&h=300&fit=crop",
    rating: 4.5, sold: 2345, location: "Semarang", category: "rumah",
    description: "Sapu istan set 5 in 1 termasuk sapu, pel, sikat lantai, wadah, dan penjepit. Bahan plastik tebal berkualitas dan serat microfiber.",
    minOrder: 10, stock: 6700, seller: "Home Tools Semarang", sellerRating: 4.5,
    variants: ["Merah", "Hijau", "Biru"],
  },
  {
    id: 16, name: "Earphone TWS Wireless Pro", price: 115000, originalPrice: 250000,
    image: "https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=300&h=300&fit=crop",
    rating: 4.6, sold: 6789, location: "Bandung", category: "elektronik",
    description: "Earphone TWS wireless pro dengan Bluetooth 5.3, noise reduction, dan bass booster. Baterai tahan 6 jam + charging case 24 jam. IPX5 sweat proof.",
    minOrder: 10, stock: 9500, seller: "Audio Bandung", sellerRating: 4.6,
    variants: ["Hitam", "Putih", "Pink"],
  },
  {
    id: 17, name: "Daster Wanita Katun 1 Paket", price: 95000, originalPrice: 210000,
    image: "https://images.unsplash.com/photo-1612423284934-2850a4ea6b0f?w=300&h=300&fit=crop",
    rating: 4.8, sold: 4567, location: "Solo", category: "fashion",
    description: "Daster wanita katun premium dengan motif cantik. Bahan adem dan nyaman untuk sehari-hari. 1 paket isi 6 pcs campuran motif. Ukuran M-XXL.",
    minOrder: 6, stock: 7800, seller: "Textile Solo", sellerRating: 4.8,
    variants: ["M", "L", "XL", "XXL"],
  },
  {
    id: 18, name: "Kopi Arabika 1kg Premium", price: 145000, originalPrice: 280000,
    image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300&h=300&fit=crop",
    rating: 4.9, sold: 3210, location: "Medan", category: "rumah",
    description: "Kopi arabika premium dari dataran tinggi Mandailing. Roasting medium, rasa smooth dengan aftertaste coklat dan karamel. Biji kering 1kg.",
    minOrder: 5, stock: 2400, seller: "Kopi Nusantara", sellerRating: 4.9,
    variants: ["Biji", "Bubuk Halus", "Bubuk Sedang"],
  },
  {
    id: 19, name: "Keyboard Mechanical RGB 87 Keys", price: 235000, originalPrice: 450000,
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&h=300&fit=crop",
    rating: 4.7, sold: 1890, location: "Jakarta", category: "elektronik",
    description: "Keyboard mechanical RGB 87 keys dengan switch blue. Dilengkapi backlight RGB 16.8 juta warna, keycap PBT double-shot, dan cable USB-C detachable.",
    minOrder: 5, stock: 2100, seller: "Gaming Jakarta", sellerRating: 4.7,
    variants: ["Blue Switch", "Red Switch", "Brown Switch"],
  },
  {
    id: 20, name: "Tas Ransel Anti Air 30L", price: 155000, originalPrice: 320000,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop",
    rating: 4.8, sold: 2345, location: "Surabaya", category: "fashion",
    description: "Tas ransel anti air 30L dengan bahan polyester 900D waterproof. Dilengkapi laptop compartment 15.6 inch, port USB charging, dan saku tersembunyi anti maling.",
    minOrder: 6, stock: 4300, seller: "Bag Surabaya Center", sellerRating: 4.8,
    variants: ["Hitam", "Navy", "Abu-abu"],
  },
  {
    id: 21, name: "Teflon Anti Lengket 28cm Set", price: 165000, originalPrice: 350000,
    image: "https://images.unsplash.com/photo-1584990347449-a5d9f8dba27f?w=300&h=300&fit=crop",
    rating: 4.7, sold: 1890, location: "Semarang", category: "rumah",
    description: "Teflon anti lengket 28cm set dengan coating granite 5 lapis. Termasuk tutup kaca dan spatula silicone. Bahan aluminium tebal, cocok untuk semua jenis kompor.",
    minOrder: 5, stock: 2100, seller: "Kitchenware Semarang", sellerRating: 4.7,
    variants: ["28cm", "30cm", "32cm"],
  },
  {
    id: 22, name: "Kaos Kaki Pria 12 Pasang", price: 55000, originalPrice: 120000,
    image: "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=300&h=300&fit=crop",
    rating: 4.6, sold: 8900, location: "Jakarta", category: "fashion",
    description: "Kaos kaki pria 12 pasang dengan bahan cotton combed yang menyerap keringat. Elastis dan nyaman dipakai seharian. Campuran warna netral.",
    minOrder: 12, stock: 15000, seller: "Hosiery Jakarta", sellerRating: 4.6,
    variants: ["Campur Gelap", "Campur Terang", "Semua Hitam"],
  },
  {
    id: 23, name: "Rice Cooker Digital 1.8L", price: 285000, originalPrice: 550000,
    image: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=300&h=300&fit=crop",
    rating: 4.8, sold: 765, location: "Medan", category: "elektronik",
    description: "Rice cooker digital 1.8L dengan 10 menu memasak. Dilengkapi fuzzy logic, timer 24 jam, dan fungsi keep warm 12 jam. Inner pot anti lengket.",
    minOrder: 3, stock: 680, seller: "Elektronik Medan", sellerRating: 4.8,
    variants: ["Putih", "Hitam"],
  },
  {
    id: 24, name: "Sandal Slide Pria Anti Slip", price: 45000, originalPrice: 95000,
    image: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=300&h=300&fit=crop",
    rating: 4.5, sold: 12340, location: "Bandung", category: "fashion",
    description: "Sandal slide pria dengan sol EVA anti slip dan bantalan empuk. Nyaman untuk sehari-hari dan ke masjid. 1 paket isi 12 pasang campuran ukuran.",
    minOrder: 12, stock: 18000, seller: "Sandal Bandung", sellerRating: 4.5,
    variants: ["39", "40", "41", "42", "43", "44"],
  },
  {
    id: 25, name: "Handuk Mandi Set 4 Pcs", price: 115000, originalPrice: 250000,
    image: "https://images.unsplash.com/photo-1622398925373-3f91b1e275f5?w=300&h=300&fit=crop",
    rating: 4.7, sold: 3456, location: "Solo", category: "rumah",
    description: "Handuk mandi set 4 pcs dengan bahan katun premium 600 GSM. Sangat lembut dan menyerap air dengan baik. Isi: 2 handuk mandi + 2 handuk wajah.",
    minOrder: 6, stock: 5400, seller: "Textile Solo Premium", sellerRating: 4.7,
    variants: ["Putih", "Biru Muda", "Pink"],
  },
  {
    id: 26, name: "Charger USB-C 65W GaN", price: 135000, originalPrice: 300000,
    image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&h=300&fit=crop",
    rating: 4.8, sold: 4567, location: "Jakarta", category: "elektronik",
    description: "Charger USB-C 65W GaN dengan 3 port (2 USB-C + 1 USB-A). Fast charging untuk laptop, tablet, dan smartphone. Ukuran compact dan portable.",
    minOrder: 10, stock: 7800, seller: "Charger Jakarta", sellerRating: 4.8,
    variants: ["Hitam", "Putih"],
  },
  {
    id: 27, name: "Kemeja Flannel Premium 6 Pcs", price: 195000, originalPrice: 420000,
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300&h=300&fit=crop",
    rating: 4.7, sold: 2345, location: "Bandung", category: "fashion",
    description: "Kemeja flannel premium 6 pcs campuran motif. Bahan cotton flannel yang tebal dan hangat. Cocok untuk kasual dan outdoor. Ukuran M-XXL.",
    minOrder: 6, stock: 4500, seller: "Bandung Flannel Store", sellerRating: 4.7,
    variants: ["M", "L", "XL", "XXL"],
  },
  {
    id: 28, name: "Ember + Gayung + Sikat Set", price: 45000, originalPrice: 95000,
    image: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=300&h=300&fit=crop",
    rating: 4.4, sold: 5670, location: "Surabaya", category: "rumah",
    description: "Set perlengkapan mandi: ember 20L + gayung + sikat kamar mandi. Bahan plastik tebal berkualitas dan warna tidak mudah pudar. Set 3 in 1.",
    minOrder: 12, stock: 11000, seller: "Plastic Surabaya", sellerRating: 4.4,
    variants: ["Merah", "Hijau", "Biru", "Kuning"],
  },
  {
    id: 29, name: "Mouse Gaming Wireless RGB", price: 125000, originalPrice: 275000,
    image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=300&h=300&fit=crop",
    rating: 4.6, sold: 3210, location: "Jakarta", category: "elektronik",
    description: "Mouse gaming wireless dengan sensor 7200 DPI, 7 tombol programmable, dan RGB backlight. Dilengkapi receiver USB + Bluetooth dual mode. Baterai tahan 40 jam.",
    minOrder: 8, stock: 5600, seller: "Gaming Gear Jakarta", sellerRating: 4.6,
    variants: ["Hitam", "Putih"],
  },
  {
    id: 30, name: "Sarung Bantal Kancing 12 Pcs", price: 75000, originalPrice: 160000,
    image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=300&h=300&fit=crop",
    rating: 4.5, sold: 4320, location: "Pekalongan", category: "rumah",
    description: "Sarung bantal kancing 12 pcs dengan bahan katun premium. Motif batik Pekalongan asli. Ukuran 45x45 cm. Cocok untuk hotel, homestay, dan rumah tangga.",
    minOrder: 12, stock: 9800, seller: "Batik Home Pekalongan", sellerRating: 4.5,
    variants: ["Motif Klasik", "Motif Modern", "Motif Minimalis"],
  },
];

export function formatPrice(price: number): string {
  return `Rp ${price.toLocaleString('id-ID')}`;
}
