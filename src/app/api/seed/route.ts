import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// Image URL helpers
const img = (url: string) => `${url}?w=400&h=400&fit=crop`;

const FASHION_IMGS = [
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab',
  'https://images.unsplash.com/photo-1594938298603-c8148c4dae35',
  'https://images.unsplash.com/photo-1473966968600-fa801b869a1a',
  'https://images.unsplash.com/photo-1551028719-00167b16eac5',
  'https://images.unsplash.com/photo-1583391733956-6c78276477e2',
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8',
  'https://images.unsplash.com/photo-1612423284934-2850a4ea6b0f',
  'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf',
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62',
];

const ELEKTRONIK_IMGS = [
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
  'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1',
  'https://images.unsplash.com/photo-1587829741301-dc798b83add3',
  'https://images.unsplash.com/photo-1590658268037-6bf12f032f55',
  'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5',
];

const RUMAH_IMGS = [
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136',
  'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af',
  'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2',
];

const KECANTIKAN_IMGS = [
  'https://images.unsplash.com/photo-1596462502278-27bfdc403348',
];

const KESEHATAN_IMGS = [
  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae',
];

const OLAHRAGA_IMGS = [
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
];

const MAINAN_IMGS = [
  'https://images.unsplash.com/photo-1558060370-d644479cb6f7',
];

const MAKANAN_IMGS = [
  'https://images.unsplash.com/photo-1559056199-641a0ac8b55e',
];

async function seedDatabase(force = false) {
  // Check if already seeded (skip unless force=true)
  if (!force) {
    const existingUsers = await db.user.count();
    if (existingUsers > 0) {
      return { message: 'Database already seeded', users: existingUsers };
    }
  }

  // Delete all existing data in reverse dependency order (safety for re-seed)
  try { await db.$executeRawUnsafe('DELETE FROM SearchHistory'); } catch {}
  try { await db.$executeRawUnsafe('DELETE FROM ProductView'); } catch {}
  try { await db.$executeRawUnsafe('DELETE FROM CartItem'); } catch {}
  try { await db.$executeRawUnsafe('DELETE FROM UserAddress'); } catch {}
  try { await db.$executeRawUnsafe('DELETE FROM Notification'); } catch {}
  try { await db.$executeRawUnsafe('DELETE FROM Wishlist'); } catch {}
  try { await db.$executeRawUnsafe('DELETE FROM VariantOption'); } catch {}
  try { await db.$executeRawUnsafe('DELETE FROM VariantGroup'); } catch {}
  try { await db.$executeRawUnsafe('DELETE FROM OrderItem'); } catch {}
  try { await db.$executeRawUnsafe('DELETE FROM Review'); } catch {}
  try { await db.$executeRawUnsafe('DELETE FROM Chat'); } catch {}
  try { await db.$executeRawUnsafe('DELETE FROM "Order"'); } catch {}
  try { await db.$executeRawUnsafe('DELETE FROM Product'); } catch {}
  try { await db.$executeRawUnsafe('DELETE FROM User'); } catch {}

  // =====================
  // 1. CREATE USERS
  // =====================
  const seller1 = await db.user.create({
    data: {
      email: 'seller1@grosirpj.id',
      name: 'CV Garment Prima',
      password: simpleHash('password123'),
      phone: '021-5551234',
      city: 'Jakarta',
      address: 'Jl. Tanah Abang Blok A No. 12, Jakarta Pusat, DKI Jakarta 10150',
      province: 'DKI Jakarta',
      postalCode: '10150',
      gender: '',
      role: 'seller',
      storeName: 'CV Garment Prima',
      storeDescription: 'Supplier fashion grosir terpercaya sejak 2015',
      bankName: 'BCA',
      bankAccount: '1234567890',
      bankHolder: 'CV Garment Prima',
    },
  });

  const seller2 = await db.user.create({
    data: {
      email: 'seller2@grosirpj.id',
      name: 'Elektronik Surabaya',
      password: simpleHash('password123'),
      phone: '031-7779876',
      city: 'Surabaya',
      address: 'Jl. Genteng Kali No. 45, Surabaya, Jawa Timur 60275',
      province: 'Jawa Timur',
      postalCode: '60275',
      gender: '',
      role: 'seller',
      storeName: 'Elektronik Surabaya',
      storeDescription: 'Pusat grosir elektronik terlengkap',
      bankName: 'Mandiri',
      bankAccount: '0987654321',
      bankHolder: 'Elektronik Surabaya',
    },
  });

  const buyer1 = await db.user.create({
    data: {
      email: 'buyer@grosirpj.id',
      name: 'Budi Santoso',
      password: simpleHash('password123'),
      phone: '0812-3456-7890',
      city: 'Bandung',
      address: 'Jl. Dago No. 88, Bandung, Jawa Barat 40135',
      province: 'Jawa Barat',
      postalCode: '40135',
      gender: 'pria',
      dateOfBirth: '1990-05-15',
      role: 'buyer',
    },
  });

  const buyer2 = await db.user.create({
    data: {
      email: 'buyer2@grosirpj.id',
      name: 'Siti Aminah',
      password: simpleHash('password123'),
      phone: '0878-9012-3456',
      city: 'Yogyakarta',
      address: 'Jl. Malioboro No. 25, Yogyakarta, DIY 55271',
      province: 'DI Yogyakarta',
      postalCode: '55271',
      gender: 'wanita',
      dateOfBirth: '1995-08-22',
      role: 'buyer',
    },
  });

  const buyer3 = await db.user.create({
    data: {
      email: 'buyer3@grosirpj.id',
      name: 'Dewi Lestari',
      password: simpleHash('password123'),
      phone: '0856-7890-1234',
      city: 'Semarang',
      address: 'Jl. Pandanaran No. 10, Semarang, Jawa Tengah 50134',
      province: 'Jawa Tengah',
      postalCode: '50134',
      gender: 'wanita',
      dateOfBirth: '1992-11-03',
      role: 'buyer',
    },
  });

  const buyer4 = await db.user.create({
    data: {
      email: 'buyer4@grosirpj.id',
      name: 'Ahmad Rizki',
      password: simpleHash('password123'),
      phone: '0813-5678-9012',
      city: 'Medan',
      address: 'Jl. Gatot Subroto No. 55, Medan, Sumatera Utara 20112',
      province: 'Sumatera Utara',
      postalCode: '20112',
      gender: 'pria',
      dateOfBirth: '1988-03-18',
      role: 'buyer',
    },
  });

  const seller3 = await db.user.create({
    data: {
      email: 'seller3@grosirpj.id',
      name: 'Batik Solo Collection',
      password: simpleHash('password123'),
      phone: '0271-667788',
      city: 'Solo',
      address: 'Jl. Slamet Riyadi No. 200, Solo, Jawa Tengah 57141',
      province: 'Jawa Tengah',
      postalCode: '57141',
      gender: '',
      role: 'seller',
      storeName: 'Batik Solo Collection',
      storeDescription: 'Koleksi batik tulis dan cap asli Solo',
      bankName: 'BRI',
      bankAccount: '1122334455',
      bankHolder: 'Batik Solo Collection',
    },
  });

  // =====================
  // 2. CREATE PRODUCTS (30 total)
  // =====================
  const productsData = [
    // ===== SELLER 1 - CV Garment Prima (17 products) =====

    // FASHION (8 products from seller1)
    {
      name: 'Kaos Polos Premium Cotton Combed 30s',
      description: 'Kaos polos premium berbahan cotton combed 30s, nyaman dipakai sehari-hari. Tersedia dalam berbagai ukuran dan warna. Cocok untuk reseller dan sablon. Minim pilling, adem dan menyerap keringat dengan baik.',
      price: 35000,
      originalPrice: 50000,
      category: 'fashion',
      images: JSON.stringify([img(FASHION_IMGS[0]), img(FASHION_IMGS[1])]),
      minOrder: 12,
      stock: 500,
      location: 'Jakarta',
      active: true,
      sold: 1250,
      rating: 4.7,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['S', 'M', 'L', 'XL', 'XXL'] },
        { name: 'Warna', order: 1, options: ['Hitam', 'Putih', 'Navy', 'Merah', 'Abu-abu'] },
      ],
    },
    {
      name: 'Kemeja Batik Pria Lengan Panjang',
      description: 'Kemeja batik pria lengan panjang dengan motif klasik Indonesia. Bahan katun premium yang halus dan nyaman. Cocok untuk acara formal maupun kasual. Jahitan rapi dan kuat.',
      price: 85000,
      originalPrice: 120000,
      category: 'fashion',
      images: JSON.stringify([img(FASHION_IMGS[2]), img(FASHION_IMGS[3])]),
      minOrder: 6,
      stock: 200,
      location: 'Jakarta',
      active: true,
      sold: 540,
      rating: 4.5,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['M', 'L', 'XL', 'XXL'] },
        { name: 'Motif', order: 1, options: ['Parang', 'Kawung', 'Mega Mendung', 'Truntum'] },
      ],
    },
    {
      name: 'Celana Jeans Slim Fit Pria',
      description: 'Celana jeans slim fit pria dengan bahan denim stretch yang nyaman. Potongan modern yang mengikuti kontur tubuh tanpa terlalu ketat. Cocok untuk berbagai kesempatan.',
      price: 110000,
      originalPrice: 165000,
      category: 'fashion',
      images: JSON.stringify([img(FASHION_IMGS[4])]),
      minOrder: 6,
      stock: 300,
      location: 'Jakarta',
      active: true,
      sold: 780,
      rating: 4.6,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['28', '29', '30', '31', '32', '33', '34'] },
        { name: 'Warna', order: 1, options: ['Biru Tua', 'Biru Muda', 'Hitam'] },
      ],
    },
    {
      name: 'Gaun Muslimah Premium',
      description: 'Gaun muslimah premium dengan bahan crepe yang jatuh dan tidak menerawang. Desain elegan dengan detail bros di dada. Cocok untuk acara pesta dan kondangan.',
      price: 135000,
      originalPrice: 185000,
      category: 'fashion',
      images: JSON.stringify([img(FASHION_IMGS[5]), img(FASHION_IMGS[6])]),
      minOrder: 3,
      stock: 150,
      location: 'Jakarta',
      active: true,
      sold: 320,
      rating: 4.8,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['S', 'M', 'L', 'XL'] },
        { name: 'Warna', order: 1, options: ['Maroon', 'Navy', 'Dusty Pink', 'Hijau Sage'] },
      ],
    },
    {
      name: 'Hoodie Oversize Unisex',
      description: 'Hoodie oversize unisex dengan bahan fleece tebal 280gsm. Hangat dan nyaman untuk cuaca dingin. Tersedia dalam warna-warna trendi. Cocok untuk reseller fashion.',
      price: 95000,
      originalPrice: 140000,
      category: 'fashion',
      images: JSON.stringify([img(FASHION_IMGS[7]), img(FASHION_IMGS[8])]),
      minOrder: 6,
      stock: 250,
      location: 'Jakarta',
      active: true,
      sold: 650,
      rating: 4.7,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['M', 'L', 'XL', 'XXL'] },
        { name: 'Warna', order: 1, options: ['Hitam', 'Abu Muda', 'Sage', 'Coklat'] },
      ],
    },
    {
      name: 'Rok Plisket Anak Sekolah',
      description: 'Rok plisket untuk anak sekolah dengan bahan premium yang tidak mudah kusut. Lipatan rapi dan tahan lama. Tersedia dalam berbagai ukuran sesuai standar sekolah.',
      price: 42000,
      originalPrice: 55000,
      category: 'fashion',
      images: JSON.stringify([img(FASHION_IMGS[1])]),
      minOrder: 24,
      stock: 600,
      location: 'Jakarta',
      active: true,
      sold: 2100,
      rating: 4.4,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['S', 'M', 'L', 'XL'] },
      ],
    },
    {
      name: 'Jaket Parasut Waterproof',
      description: 'Jaket parasut waterproof ringan dan tahan air. Dilengkapi hoodie dan saku resleting. Ideal untuk outdoor dan berkendara saat hujan. Compact dan mudah dilipat.',
      price: 75000,
      originalPrice: 110000,
      category: 'fashion',
      images: JSON.stringify([img(FASHION_IMGS[4]), img(FASHION_IMGS[7])]),
      minOrder: 12,
      stock: 400,
      location: 'Jakarta',
      active: true,
      sold: 890,
      rating: 4.5,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['M', 'L', 'XL', 'XXL'] },
        { name: 'Warna', order: 1, options: ['Hitam', 'Navy', 'Merah Maroon'] },
      ],
    },
    {
      name: 'Daster Rumah Wanita Katun Rayon',
      description: 'Daster rumah wanita berbahan katun rayon yang adem dan menyerap keringat. Motif cantik dan trendy. Nyaman untuk harian di rumah.',
      price: 28000,
      originalPrice: 40000,
      category: 'fashion',
      images: JSON.stringify([img(FASHION_IMGS[5])]),
      minOrder: 24,
      stock: 800,
      location: 'Jakarta',
      active: true,
      sold: 3500,
      rating: 4.3,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['M', 'L', 'XL', 'XXL'] },
      ],
    },

    // KESEHATAN (2 products from seller1)
    {
      name: 'Masker Medis 3 Ply Box 50pcs',
      description: 'Masker medis 3 ply untuk perlindungan harian. Bahan non-woven yang lembut dan nyaman. Efektif menyaring partikel debu dan bakteri. Tali elastis yang tidak mudah putus.',
      price: 25000,
      originalPrice: 35000,
      category: 'kesehatan',
      images: JSON.stringify([img(KESEHATAN_IMGS[0])]),
      minOrder: 10,
      stock: 1000,
      location: 'Jakarta',
      active: true,
      sold: 4200,
      rating: 4.2,
      sellerId: seller1.id,
      variants: [
        { name: 'Warna', order: 0, options: ['Biru', 'Hitam', 'Putih'] },
      ],
    },
    {
      name: 'Vitamin C 1000mg - Botol 60 Tablet',
      description: 'Vitamin C 1000mg dengan formula enhanced absorption. Membantu meningkatkan daya tahan tubuh. Aman dikonsumsi setiap hari. BPOM certified.',
      price: 45000,
      originalPrice: 65000,
      category: 'kesehatan',
      images: JSON.stringify([img(KESEHATAN_IMGS[0])]),
      minOrder: 12,
      stock: 500,
      location: 'Jakarta',
      active: true,
      sold: 1800,
      rating: 4.6,
      sellerId: seller1.id,
      variants: [],
    },

    // KECANTIKAN (2 products from seller1)
    {
      name: 'Serum Vitamin C untuk Wajah',
      description: 'Serum vitamin C konsentrasi tinggi untuk mencerahkan wajah. Mengandung niacinamide dan hyaluronic acid. Membantu menghilangkan noda hitam dan meratakan warna kulit. Hasil terlihat dalam 2 minggu pemakaian rutin.',
      price: 55000,
      originalPrice: 85000,
      category: 'kecantikan',
      images: JSON.stringify([img(KECANTIKAN_IMGS[0])]),
      minOrder: 12,
      stock: 350,
      location: 'Jakarta',
      active: true,
      sold: 2200,
      rating: 4.7,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['20ml', '30ml'] },
      ],
    },
    {
      name: 'Paket Skincare Lengkap 5 in 1',
      description: 'Paket skincare lengkap berisi cleanser, toner, serum, moisturizer, dan sunscreen. Formulasi untuk semua jenis kulit. BPOM certified dan dermatologically tested.',
      price: 125000,
      originalPrice: 200000,
      category: 'kecantikan',
      images: JSON.stringify([img(KECANTIKAN_IMGS[0])]),
      minOrder: 6,
      stock: 200,
      location: 'Jakarta',
      active: true,
      sold: 950,
      rating: 4.5,
      sellerId: seller1.id,
      variants: [
        { name: 'Tipe Kulit', order: 0, options: ['Berminyak', 'Kering', 'Normal', 'Sensitif'] },
      ],
    },

    // MAKANAN (2 products from seller1)
    {
      name: 'Kopi Arabica Gayo Premium 1kg',
      description: 'Kopi arabica Gayo premium dari dataran tinggi Aceh. Roasting medium dengan rasa fruity dan nutty. Aroma harum khas kopi Gayo. Fresh roasted dan dikemas vacuum seal.',
      price: 85000,
      originalPrice: 110000,
      category: 'makanan',
      images: JSON.stringify([img(MAKANAN_IMGS[0])]),
      minOrder: 5,
      stock: 300,
      location: 'Jakarta',
      active: true,
      sold: 680,
      rating: 4.8,
      sellerId: seller1.id,
      variants: [
        { name: 'Roast Level', order: 0, options: ['Light', 'Medium', 'Dark'] },
        { name: 'Grind', order: 1, options: ['Whole Bean', 'Coarse', 'Medium', 'Fine'] },
      ],
    },
    {
      name: 'Keripik Singkong Pedas Original 250g',
      description: 'Keripik singkong renyah dengan bumbu pedas original. Digoreng dengan minyak berkualitas tanpa pengawet. Cocok untuk camilan dan oleh-oleh. Harga grosir terjangkau.',
      price: 15000,
      originalPrice: 20000,
      category: 'makanan',
      images: JSON.stringify([img(MAKANAN_IMGS[0])]),
      minOrder: 24,
      stock: 1000,
      location: 'Jakarta',
      active: true,
      sold: 5600,
      rating: 4.3,
      sellerId: seller1.id,
      variants: [
        { name: 'Rasa', order: 0, options: ['Pedas Original', 'BBQ', 'Keju', 'Balado'] },
      ],
    },

    // MAINAN (1 product from seller1)
    {
      name: 'Boneka Plush Bear 50cm',
      description: 'Boneka plush bear lembut dan menggemaskan berukuran 50cm. Bahan super soft yang aman untuk anak-anak. Jahitan kuat dan tidak mudah rontok bulunya. Cocok untuk hadiah dan souvenir.',
      price: 35000,
      originalPrice: 50000,
      category: 'mainan',
      images: JSON.stringify([img(MAINAN_IMGS[0])]),
      minOrder: 12,
      stock: 400,
      location: 'Jakarta',
      active: true,
      sold: 1500,
      rating: 4.4,
      sellerId: seller1.id,
      variants: [
        { name: 'Warna', order: 0, options: ['Coklat', 'Putih', 'Pink', 'Abu-abu'] },
      ],
    },

    // OLAHRAGA (2 products from seller1)
    {
      name: 'Sepatu Running Olahraga Unisex',
      description: 'Sepatu running olahraga unisex dengan teknologi cushion yang nyaman. Sol karet anti-slip. Desain modern dan ringan. Cocok untuk lari, jalan, dan olahraga ringan.',
      price: 125000,
      originalPrice: 200000,
      category: 'olahraga',
      images: JSON.stringify([img(OLAHRAGA_IMGS[0])]),
      minOrder: 6,
      stock: 200,
      location: 'Jakarta',
      active: true,
      sold: 420,
      rating: 4.5,
      sellerId: seller1.id,
      variants: [
        { name: 'Ukuran', order: 0, options: ['39', '40', '41', '42', '43', '44'] },
        { name: 'Warna', order: 1, options: ['Hitam', 'Putih', 'Merah', 'Navy'] },
      ],
    },
    {
      name: 'Yoga Mat Premium 8mm',
      description: 'Yoga mat premium tebal 8mm untuk kenyamanan maksimal. Permukaan anti-slip pada kedua sisi. Bahan TPE eco-friendly dan mudah dibersihkan. Dilengkapi tali carry.',
      price: 65000,
      originalPrice: 95000,
      category: 'olahraga',
      images: JSON.stringify([img(OLAHRAGA_IMGS[0])]),
      minOrder: 10,
      stock: 250,
      location: 'Jakarta',
      active: true,
      sold: 310,
      rating: 4.6,
      sellerId: seller1.id,
      variants: [
        { name: 'Warna', order: 0, options: ['Ungu', 'Biru', 'Hijau', 'Hitam', 'Pink'] },
      ],
    },

    // ===== SELLER 2 - Elektronik Surabaya (13 products) =====

    // ELEKTRONIK (6 products from seller2)
    {
      name: 'TWS Earbuds Bluetooth 5.3',
      description: 'TWS earbuds dengan Bluetooth 5.3 untuk koneksi stabil dan cepat. Bass yang powerful dan suara jernih. Dilengkapi noise cancellation. Baterai tahan hingga 6 jam pemakaian + 24 jam dengan charging case.',
      price: 75000,
      originalPrice: 120000,
      category: 'elektronik',
      images: JSON.stringify([img(ELEKTRONIK_IMGS[0]), img(ELEKTRONIK_IMGS[1])]),
      minOrder: 10,
      stock: 400,
      location: 'Surabaya',
      active: true,
      sold: 2100,
      rating: 4.4,
      sellerId: seller2.id,
      variants: [
        { name: 'Warna', order: 0, options: ['Hitam', 'Putih', 'Navy'] },
      ],
    },
    {
      name: 'Speaker Bluetooth Portable',
      description: 'Speaker bluetooth portable dengan suara bass yang kuat. Tahan air IPX5 sehingga aman digunakan di luar ruangan. Baterai tahan hingga 10 jam. Desain compact dan mudah dibawa.',
      price: 95000,
      originalPrice: 150000,
      category: 'elektronik',
      images: JSON.stringify([img(ELEKTRONIK_IMGS[2])]),
      minOrder: 6,
      stock: 250,
      location: 'Surabaya',
      active: true,
      sold: 980,
      rating: 4.5,
      sellerId: seller2.id,
      variants: [
        { name: 'Warna', order: 0, options: ['Hitam', 'Merah', 'Biru'] },
      ],
    },
    {
      name: 'Powerbank 20000mAh Fast Charging',
      description: 'Powerbank kapasitas besar 20000mAh dengan fast charging 22.5W. Bisa mengisi 3 perangkat sekaligus. Dilengkapi LED display untuk menunjukkan sisa baterai. Bodi slim dan ringan.',
      price: 110000,
      originalPrice: 165000,
      category: 'elektronik',
      images: JSON.stringify([img(ELEKTRONIK_IMGS[3])]),
      minOrder: 6,
      stock: 300,
      location: 'Surabaya',
      active: true,
      sold: 1450,
      rating: 4.6,
      sellerId: seller2.id,
      variants: [
        { name: 'Warna', order: 0, options: ['Hitam', 'Putih'] },
      ],
    },
    {
      name: 'Smartwatch Sport Waterproof IP68',
      description: 'Smartwatch sport dengan sertifikasi waterproof IP68. Dilengkapi heart rate monitor, step counter, dan sleep tracker. Kompatibel dengan Android dan iOS. Baterai tahan hingga 7 hari.',
      price: 145000,
      originalPrice: 220000,
      category: 'elektronik',
      images: JSON.stringify([img(ELEKTRONIK_IMGS[4])]),
      minOrder: 6,
      stock: 200,
      location: 'Surabaya',
      active: true,
      sold: 760,
      rating: 4.3,
      sellerId: seller2.id,
      variants: [
        { name: 'Warna Strap', order: 0, options: ['Hitam', 'Putih', 'Merah', 'Hijau'] },
      ],
    },
    {
      name: 'Kabel USB-C Fast Charging 1.5m',
      description: 'Kabel USB-C fast charging mendukung arus hingga 3A dan transfer data hingga 480Mbps. Bahan nylon braided yang kuat dan tahan lama. Panjang 1.5m untuk fleksibilitas penggunaan.',
      price: 18000,
      originalPrice: 28000,
      category: 'elektronik',
      images: JSON.stringify([img(ELEKTRONIK_IMGS[1])]),
      minOrder: 50,
      stock: 2000,
      location: 'Surabaya',
      active: true,
      sold: 8500,
      rating: 4.2,
      sellerId: seller2.id,
      variants: [
        { name: 'Tipe', order: 0, options: ['USB-C to USB-C', 'USB-A to USB-C', 'USB-C to Lightning'] },
        { name: 'Panjang', order: 1, options: ['1m', '1.5m', '2m'] },
      ],
    },
    {
      name: 'Charger Wall 33W GaN',
      description: 'Charger wall GaN 33W dengan ukuran compact. Mendukung fast charging PD3.0 dan QC4.0. Kompatibel dengan smartphone, tablet, dan laptop. Dilengkapi perlindungan over-voltage dan over-current.',
      price: 55000,
      originalPrice: 85000,
      category: 'elektronik',
      images: JSON.stringify([img(ELEKTRONIK_IMGS[5])]),
      minOrder: 12,
      stock: 500,
      location: 'Surabaya',
      active: true,
      sold: 3200,
      rating: 4.7,
      sellerId: seller2.id,
      variants: [
        { name: 'Port', order: 0, options: ['1 USB-C', '2 USB-C', '1C+1A', '2C+1A'] },
      ],
    },

    // RUMAH TANGGA (3 products from seller2)
    {
      name: 'Lampu LED Strip 5m RGB Remote',
      description: 'Lampu LED strip sepanjang 5 meter dengan kontrol remote dan 16 juta warna. Bisa dipotong sesuai kebutuhan. Pemasangan mudah dengan perekat di belakang. Cocok untuk dekorasi kamar, ruang tamu, dan toko.',
      price: 35000,
      originalPrice: 55000,
      category: 'rumah',
      images: JSON.stringify([img(RUMAH_IMGS[0])]),
      minOrder: 12,
      stock: 600,
      location: 'Surabaya',
      active: true,
      sold: 2800,
      rating: 4.3,
      sellerId: seller2.id,
      variants: [
        { name: 'Panjang', order: 0, options: ['1m', '2m', '5m', '10m'] },
      ],
    },
    {
      name: 'Rak Serbaguna 5 Tingkat',
      description: 'Rak serbaguna 5 tingkat yang bisa dibongkar pasang. Bahan besi kokoh dengan coating anti karat. Cocok untuk dapur, kamar mandi, gudang, dan toko. Kapasitas hingga 30kg per tingkat.',
      price: 85000,
      originalPrice: 125000,
      category: 'rumah',
      images: JSON.stringify([img(RUMAH_IMGS[1])]),
      minOrder: 5,
      stock: 150,
      location: 'Surabaya',
      active: true,
      sold: 420,
      rating: 4.5,
      sellerId: seller2.id,
      variants: [],
    },
    {
      name: 'Diffuser Aromatherapy 300ml',
      description: 'Diffuser aromatherapy ultrasonik kapasitas 300ml. Dilengkapi LED 7 warna dan timer auto-off. Operasi ultra-quiet di bawah 30dB. Membantu melembapkan udara dan menenangkan pikiran.',
      price: 65000,
      originalPrice: 95000,
      category: 'rumah',
      images: JSON.stringify([img(RUMAH_IMGS[2])]),
      minOrder: 10,
      stock: 350,
      location: 'Surabaya',
      active: true,
      sold: 1100,
      rating: 4.6,
      sellerId: seller2.id,
      variants: [
        { name: 'Warna', order: 0, options: ['Putih', 'Kayu Natural', 'Hitam'] },
      ],
    },

    // MAINAN (2 products from seller2)
    {
      name: 'Set Balok Building Blocks 500pcs',
      description: 'Set balok building blocks 500pcs untuk kreativitas anak-anak. Bahan plastik ABS aman dan berkualitas. Kompatibel dengan merek balok lainnya. Membantu mengembangkan motorik halus dan imajinasi.',
      price: 55000,
      originalPrice: 80000,
      category: 'mainan',
      images: JSON.stringify([img(MAINAN_IMGS[0])]),
      minOrder: 12,
      stock: 300,
      location: 'Surabaya',
      active: true,
      sold: 920,
      rating: 4.4,
      sellerId: seller2.id,
      variants: [],
    },
    {
      name: 'Remote Control Mobil Drift 1:16',
      description: 'Mobil remote control drift skala 1:16 dengan kecepatan tinggi. Dilengkapi lampu LED dan suspensi yang baik. Baterai rechargeable tahan 20-30 menit. Kontrol jarak jauh hingga 30 meter.',
      price: 95000,
      originalPrice: 145000,
      category: 'mainan',
      images: JSON.stringify([img(MAINAN_IMGS[0])]),
      minOrder: 6,
      stock: 200,
      location: 'Surabaya',
      active: true,
      sold: 580,
      rating: 4.3,
      sellerId: seller2.id,
      variants: [
        { name: 'Warna', order: 0, options: ['Merah', 'Biru', 'Hitam', 'Putih'] },
      ],
    },

    // OLAHRAGA (1 product from seller2)
    {
      name: 'Resistance Band Set 5 Level',
      description: 'Resistance band set 5 level ketebalan untuk latihan dari pemula hingga lanjutan. Bahan latex premium yang elastis dan tahan lama. Dilengkapi handle, door anchor, dan ankle straps. Cocok untuk home workout.',
      price: 45000,
      originalPrice: 70000,
      category: 'olahraga',
      images: JSON.stringify([img(OLAHRAGA_IMGS[0])]),
      minOrder: 12,
      stock: 400,
      location: 'Surabaya',
      active: true,
      sold: 1350,
      rating: 4.5,
      sellerId: seller2.id,
      variants: [],
    },

    // MAKANAN (1 product from seller2)
    {
      name: 'Sambal Bawang Crispy Jar 250ml',
      description: 'Sambal bawang crispy homemade dalam jar 250ml. Dibuat dari cabai pilihan dan bawang goreng renyah. Pedasnya nampol tapi nagih! Cocok untuk lauk makan dan oleh-oleh. Tanpa pengawet buatan.',
      price: 25000,
      originalPrice: 35000,
      category: 'makanan',
      images: JSON.stringify([img(MAKANAN_IMGS[0])]),
      minOrder: 24,
      stock: 500,
      location: 'Surabaya',
      active: true,
      sold: 3800,
      rating: 4.7,
      sellerId: seller2.id,
      variants: [
        { name: 'Level Pedas', order: 0, options: ['Original', 'Extra Pedas', 'Super Pedas'] },
      ],
    },
  ];

  // Create all products with their variants
  const createdProducts: { id: string; name: string; sellerId: string; price: number; category: string }[] = [];

  for (const pData of productsData) {
    const { variants, ...productFields } = pData;

    const product = await db.product.create({
      data: {
        ...productFields,
        variantGroups: {
          create: variants.map((v) => ({
            name: v.name,
            order: v.order,
            options: {
              create: v.options.map((opt) => ({ value: opt })),
            },
          })),
        },
      },
    });

    createdProducts.push({
      id: product.id,
      name: product.name,
      sellerId: product.sellerId,
      price: product.price,
      category: product.category,
    });
  }

  // =====================
  // 4. CREATE ORDERS (7 orders)
  // =====================
  const seller1Products = createdProducts.filter((p) => p.sellerId === seller1.id);
  const seller2Products = createdProducts.filter((p) => p.sellerId === seller2.id);

  // Helper to pick random items from array
  const pickRandom = <T>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  const ordersData = [
    // Order 1 - Buyer1 from Seller1 - Delivered
    {
      buyerId: buyer1.id,
      sellerId: seller1.id,
      status: 'delivered',
      totalAmount: 420000,
      shippingCost: 15000,
      shippingAddress: 'Jl. Dago No. 88, Bandung, Jawa Barat 40135',
      paymentMethod: 'transfer',
      items: [
        { productId: seller1Products[0].id, productName: seller1Products[0].name, quantity: 12, price: 35000, variants: JSON.stringify({ Ukuran: 'L', Warna: 'Hitam' }) },
      ],
    },
    // Order 2 - Buyer1 from Seller2 - Shipped
    {
      buyerId: buyer1.id,
      sellerId: seller2.id,
      status: 'shipped',
      totalAmount: 370000,
      shippingCost: 20000,
      shippingAddress: 'Jl. Dago No. 88, Bandung, Jawa Barat 40135',
      paymentMethod: 'ewallet',
      items: [
        { productId: seller2Products[0].id, productName: seller2Products[0].name, quantity: 3, price: 75000, variants: JSON.stringify({ Warna: 'Hitam' }) },
        { productId: seller2Products[3].id, productName: seller2Products[3].name, quantity: 1, price: 145000, variants: JSON.stringify({ 'Warna Strap': 'Hitam' }) },
      ],
    },
    // Order 3 - Buyer2 from Seller1 - Paid
    {
      buyerId: buyer2.id,
      sellerId: seller1.id,
      status: 'paid',
      totalAmount: 510000,
      shippingCost: 18000,
      shippingAddress: 'Jl. Malioboro No. 25, Yogyakarta, DIY 55271',
      paymentMethod: 'transfer',
      items: [
        { productId: seller1Products[1].id, productName: seller1Products[1].name, quantity: 6, price: 85000, variants: JSON.stringify({ Ukuran: 'L', Motif: 'Parang' }) },
      ],
    },
    // Order 4 - Buyer2 from Seller2 - Delivered
    {
      buyerId: buyer2.id,
      sellerId: seller2.id,
      status: 'delivered',
      totalAmount: 245000,
      shippingCost: 22000,
      shippingAddress: 'Jl. Malioboro No. 25, Yogyakarta, DIY 55271',
      paymentMethod: 'cod',
      items: [
        { productId: seller2Products[1].id, productName: seller2Products[1].name, quantity: 2, price: 95000, variants: JSON.stringify({ Warna: 'Hitam' }) },
        { productId: seller2Products[5].id, productName: seller2Products[5].name, quantity: 1, price: 55000, variants: JSON.stringify({ Port: '1C+1A' }) },
      ],
    },
    // Order 5 - Buyer1 from Seller1 - Pending
    {
      buyerId: buyer1.id,
      sellerId: seller1.id,
      status: 'pending',
      totalAmount: 285000,
      shippingCost: 15000,
      shippingAddress: 'Jl. Dago No. 88, Bandung, Jawa Barat 40135',
      paymentMethod: 'ewallet',
      items: [
        { productId: seller1Products[4].id, productName: seller1Products[4].name, quantity: 3, price: 95000, variants: JSON.stringify({ Ukuran: 'L', Warna: 'Hitam' }) },
      ],
    },
    // Order 6 - Buyer2 from Seller1 - Cancelled
    {
      buyerId: buyer2.id,
      sellerId: seller1.id,
      status: 'cancelled',
      totalAmount: 135000,
      shippingCost: 18000,
      shippingAddress: 'Jl. Malioboro No. 25, Yogyakarta, DIY 55271',
      paymentMethod: 'transfer',
      items: [
        { productId: seller1Products[9].id, productName: seller1Products[9].name, quantity: 1, price: 135000, variants: JSON.stringify({ Ukuran: 'S', Warna: 'Maroon' }) },
      ],
    },
    // Order 7 - Buyer1 from Seller2 - Shipped
    {
      buyerId: buyer1.id,
      sellerId: seller2.id,
      status: 'shipped',
      totalAmount: 200000,
      shippingCost: 20000,
      shippingAddress: 'Jl. Dago No. 88, Bandung, Jawa Barat 40135',
      paymentMethod: 'transfer',
      items: [
        { productId: seller2Products[2].id, productName: seller2Products[2].name, quantity: 1, price: 110000, variants: JSON.stringify({ Warna: 'Hitam' }) },
        { productId: seller2Products[4].id, productName: seller2Products[4].name, quantity: 5, price: 18000, variants: JSON.stringify({ Tipe: 'USB-C to USB-C', Panjang: '1.5m' }) },
      ],
    },
  ];

  const createdOrders = [];
  for (const orderData of ordersData) {
    const { items, ...orderFields } = orderData;
    const order = await db.order.create({
      data: {
        ...orderFields,
        items: {
          create: items,
        },
      },
    });
    createdOrders.push(order);
  }

  // =====================
  // 5. CREATE REVIEWS (12 reviews)
  // =====================
  const reviewsData = [
    // Reviews on seller1 products
    { productId: seller1Products[0].id, userId: buyer1.id, rating: 5, comment: 'Kaos nyaman banget, bahan adem dan tidak panas. Sudah langganan beli disini. Packing juga rapi.' },
    { productId: seller1Products[0].id, userId: buyer2.id, rating: 4, comment: 'Bahan bagus, tapi ukurannya agak besar dari yang saya kira. Overall puas dengan kualitasnya.' },
    { productId: seller1Products[1].id, userId: buyer2.id, rating: 5, comment: 'Batiknya cantik banget! Motifnya detail dan bahan halus. Cocok untuk acara formal. Recommended seller!' },
    { productId: seller1Products[2].id, userId: buyer1.id, rating: 4, comment: 'Jeans nyaman dan stretchy. Potongannya pas. Cuma warnanya agak beda sedikit dari foto.' },
    { productId: seller1Products[3].id, userId: buyer2.id, rating: 5, comment: 'Gaunnya elegan banget, bahannya jatuh dan tidak menerawang. Puas banget! Pasti order lagi.' },
    { productId: seller1Products[4].id, userId: buyer1.id, rating: 5, comment: 'Hoodie-nya tebal dan hangat, bahan fleece berkualitas. Warna sage-nya cantik banget.' },
    { productId: seller1Products[8].id, userId: buyer1.id, rating: 4, comment: 'Vitamin C-nya bagus, saya minum rutin dan badan jadi lebih fit. Harga grosir juga lebih hemat.' },
    { productId: seller1Products[10].id, userId: buyer2.id, rating: 5, comment: 'Serum vitamin C-nya luar biasa! Kulit saya jadi lebih cerah setelah 2 minggu pemakaian. Worth it!' },

    // Reviews on seller2 products
    { productId: seller2Products[0].id, userId: buyer1.id, rating: 4, comment: 'TWS-nya bagus untuk harga segini. Bass-nya oke dan koneksi bluetooth stabil. Cuma noise cancellation kurang maksimal.' },
    { productId: seller2Products[1].id, userId: buyer2.id, rating: 5, comment: 'Speaker-nya kenceng banget untuk ukuran portable. Bass-nya nendang! Baterai juga tahan lama.' },
    { productId: seller2Products[2].id, userId: buyer1.id, rating: 5, comment: 'Powerbank kualitas terbaik! Fast charging beneran works. LED display-nya juga helpful banget.' },
    { productId: seller2Products[6].id, userId: buyer2.id, rating: 4, comment: 'LED strip-nya terang dan warnanya variatif. Remote-nya juga responsif. Pemasangan gampang.' },
  ];

  const createdReviews = [];
  for (const reviewData of reviewsData) {
    const review = await db.review.create({ data: reviewData });
    createdReviews.push(review);
  }

  // =====================
  // 6. CREATE CHATS (8 messages)
  // =====================
  const chatsData = [
    { senderId: buyer1.id, receiverId: seller1.id, message: 'Halo kak, kaos polos ini apakah ready stock semua warna?', read: true },
    { senderId: seller1.id, receiverId: buyer1.id, message: 'Halo! Ready stock kak. Warna hitam, putih, dan navy paling banyak stoknya. Warna merah tinggal beberapa.', read: true },
    { senderId: buyer1.id, receiverId: seller1.id, message: 'Kalau beli 12 pcs bisa dapat harga berapa ya? Apakah masih bisa nego?', read: true },
    { senderId: seller1.id, receiverId: buyer1.id, message: 'Untuk 12 pcs harga sudah yang tertera kak, Rp35.000/pcs. Kalau ambil 24 pcs bisa saya kasih Rp32.000/pcs 😊', read: true },
    { senderId: buyer2.id, receiverId: seller2.id, message: 'Mas, TWS earbuds ini garansi berapa lama?', read: true },
    { senderId: seller2.id, receiverId: buyer2.id, message: 'Garansi 6 bulan kak, klaim garansi langsung ke kami. Kalau ada kerusakan kita ganti unit baru.', read: false },
    { senderId: buyer2.id, receiverId: seller2.id, message: 'Oke siap mas. Saya mau order 10 pcs TWS warna hitam. Nanti bisa dikirim pakai JNE REG?', read: false },
    { senderId: seller1.id, receiverId: buyer2.id, message: 'Kak, gaun muslimah yang baru motif hijau sage sudah restock ya. Mau cek di katalog kami? 😊', read: false },
  ];

  const createdChats = [];
  for (const chatData of chatsData) {
    const chat = await db.chat.create({ data: chatData });
    createdChats.push(chat);
  }

  // =====================
  // 7. CREATE NOTIFICATIONS (6 notifications)
  // =====================
  const notificationsData = [
    { userId: buyer1.id, title: 'Pesanan Dikirim', message: 'Pesanan #ORD-001 dari CV Garment Prima sedang dalam pengiriman', type: 'order', read: false },
    { userId: buyer1.id, title: 'Flash Sale Dimulai!', message: 'Jangan lewatkan diskon hingga 70% untuk produk pilihan', type: 'promo', read: false },
    { userId: buyer1.id, title: 'Pesan Baru', message: 'CV Garment Prima mengirim pesan baru', type: 'chat', read: true },
    { userId: buyer2.id, title: 'Pesanan Selesai', message: 'Pesanan dari Elektronik Surabaya telah diterima', type: 'order', read: false },
    { userId: buyer2.id, title: 'Selamat Datang!', message: 'Terima kasih telah bergabung di GrosirPJ. Selamat berbelanja!', type: 'info', read: true },
    { userId: seller1.id, title: 'Pesanan Baru', message: 'Anda mendapat pesanan baru dari Siti Aminah', type: 'new_order', read: false },
    { userId: seller1.id, title: 'Pesanan Baru', message: 'Anda mendapat pesanan baru dari Budi Santoso', type: 'new_order', read: false },
    { userId: seller1.id, title: 'Pembayaran Diterima', message: 'Pembayaran dari Siti Aminah telah diterima. Segera proses pesanan!', type: 'order', read: false },
    { userId: seller1.id, title: 'Pesanan Baru', message: 'Anda mendapat pesanan baru dari Dewi Lestari', type: 'new_order', read: false },
    { userId: seller2.id, title: 'Pesanan Baru', message: 'Anda mendapat pesanan baru dari Siti Aminah', type: 'new_order', read: false },
    { userId: seller2.id, title: 'Pembayaran Diterima', message: 'Pembayaran dari Budi Santoso telah diterima', type: 'order', read: false },
  ];

  for (const notifData of notificationsData) {
    await db.notification.create({ data: notifData });
  }

  // =====================
  // 8. CREATE USER ADDRESSES
  // =====================
  const addressesData = [
    { userId: buyer1.id, label: 'Rumah', recipient: 'Budi Santoso', phone: '0812-3456-7890', address: 'Jl. Dago No. 88, Bandung, Jawa Barat 40135', city: 'Bandung', province: 'Jawa Barat', postalCode: '40135', isDefault: true },
    { userId: buyer1.id, label: 'Kantor', recipient: 'Budi Santoso', phone: '022-4455667', address: 'Jl. Asia Afrika No. 15, Bandung, Jawa Barat 40261', city: 'Bandung', province: 'Jawa Barat', postalCode: '40261', isDefault: false },
    { userId: buyer2.id, label: 'Rumah', recipient: 'Siti Aminah', phone: '0878-9012-3456', address: 'Jl. Malioboro No. 25, Yogyakarta, DIY 55271', city: 'Yogyakarta', province: 'DI Yogyakarta', postalCode: '55271', isDefault: true },
    { userId: buyer3.id, label: 'Rumah', recipient: 'Dewi Lestari', phone: '0856-7890-1234', address: 'Jl. Pandanaran No. 10, Semarang, Jawa Tengah 50134', city: 'Semarang', province: 'Jawa Tengah', postalCode: '50134', isDefault: true },
    { userId: buyer4.id, label: 'Rumah', recipient: 'Ahmad Rizki', phone: '0813-5678-9012', address: 'Jl. Gatot Subroto No. 55, Medan, Sumatera Utara 20112', city: 'Medan', province: 'Sumatera Utara', postalCode: '20112', isDefault: true },
    { userId: seller1.id, label: 'Gudang', recipient: 'CV Garment Prima', phone: '021-5551234', address: 'Jl. Tanah Abang Blok A No. 12, Jakarta Pusat, DKI Jakarta 10150', city: 'Jakarta', province: 'DKI Jakarta', postalCode: '10150', isDefault: true },
    { userId: seller2.id, label: 'Toko', recipient: 'Elektronik Surabaya', phone: '031-7779876', address: 'Jl. Genteng Kali No. 45, Surabaya, Jawa Timur 60275', city: 'Surabaya', province: 'Jawa Timur', postalCode: '60275', isDefault: true },
  ];

  for (const addrData of addressesData) {
    await db.userAddress.create({ data: addrData });
  }

  // =====================
  // 9. CREATE CART ITEMS
  // =====================
  const cartItemsData = [
    { userId: buyer1.id, productId: seller1Products[1].id, quantity: 6, variants: JSON.stringify({ Ukuran: 'L', Motif: 'Parang' }) },
    { userId: buyer1.id, productId: seller2Products[0].id, quantity: 3, variants: JSON.stringify({ Warna: 'Hitam' }) },
    { userId: buyer2.id, productId: seller1Products[4].id, quantity: 2, variants: JSON.stringify({ Ukuran: 'M', Warna: 'Sage' }) },
    { userId: buyer3.id, productId: seller1Products[0].id, quantity: 24, variants: JSON.stringify({ Ukuran: 'L', Warna: 'Hitam' }) },
    { userId: buyer3.id, productId: seller2Products[2].id, quantity: 1, variants: JSON.stringify({ Warna: 'Hitam' }) },
  ];

  for (const cartData of cartItemsData) {
    await db.cartItem.create({ data: cartData });
  }

  // =====================
  // 10. CREATE PRODUCT VIEWS (history produk yang dilihat)
  // =====================
  const productViewsData = [
    { userId: buyer1.id, productId: seller1Products[0].id, viewCount: 5, lastViewed: new Date(Date.now() - 1000 * 60 * 30) },
    { userId: buyer1.id, productId: seller1Products[1].id, viewCount: 3, lastViewed: new Date(Date.now() - 1000 * 60 * 60 * 2) },
    { userId: buyer1.id, productId: seller2Products[0].id, viewCount: 2, lastViewed: new Date(Date.now() - 1000 * 60 * 60 * 5) },
    { userId: buyer1.id, productId: seller2Products[2].id, viewCount: 1, lastViewed: new Date(Date.now() - 1000 * 60 * 60 * 24) },
    { userId: buyer2.id, productId: seller1Products[4].id, viewCount: 4, lastViewed: new Date(Date.now() - 1000 * 60 * 15) },
    { userId: buyer2.id, productId: seller1Products[3].id, viewCount: 2, lastViewed: new Date(Date.now() - 1000 * 60 * 60) },
    { userId: buyer2.id, productId: seller2Products[1].id, viewCount: 3, lastViewed: new Date(Date.now() - 1000 * 60 * 60 * 3) },
    { userId: buyer3.id, productId: seller1Products[0].id, viewCount: 7, lastViewed: new Date(Date.now() - 1000 * 60 * 5) },
    { userId: buyer3.id, productId: seller2Products[2].id, viewCount: 2, lastViewed: new Date(Date.now() - 1000 * 60 * 60 * 8) },
    { userId: buyer4.id, productId: seller1Products[2].id, viewCount: 1, lastViewed: new Date(Date.now() - 1000 * 60 * 60 * 48) },
    { userId: buyer4.id, productId: seller2Products[3].id, viewCount: 1, lastViewed: new Date(Date.now() - 1000 * 60 * 60 * 72) },
  ];

  for (const viewData of productViewsData) {
    await db.productView.create({ data: viewData });
  }

  // =====================
  // 11. CREATE SEARCH HISTORY
  // =====================
  const searchHistoryData = [
    { userId: buyer1.id, query: 'kaos polos grosir' },
    { userId: buyer1.id, query: 'batik pria' },
    { userId: buyer1.id, query: 'earbuds bluetooth' },
    { userId: buyer2.id, query: 'hoodie oversize' },
    { userId: buyer2.id, query: 'gaun muslimah' },
    { userId: buyer2.id, query: 'speaker portable' },
    { userId: buyer3.id, query: 'kaos polos' },
    { userId: buyer3.id, query: 'powerbank fast charging' },
    { userId: buyer4.id, query: 'celana jeans' },
    { userId: buyer4.id, query: 'smartwatch sport' },
  ];

  for (const searchData of searchHistoryData) {
    await db.searchHistory.create({ data: searchData });
  }

  // =====================
  // RETURN COUNTS
  // =====================
  return {
    users: { sellers: 3, buyers: 4, total: 7 },
    products: {
      total: createdProducts.length,
      withVariants: productsData.filter((p) => p.variants.length > 0).length,
      byCategory: createdProducts.reduce<Record<string, number>>((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1;
        return acc;
      }, {}),
    },
    orders: createdOrders.length,
    reviews: createdReviews.length,
    chats: createdChats.length,
    addresses: addressesData.length,
    cartItems: cartItemsData.length,
    productViews: productViewsData.length,
    searchHistory: searchHistoryData.length,
  };
}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    const result = await seedDatabase(force);
    return NextResponse.json({ success: true, message: 'Database seeded successfully', data: result });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to seed database', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    const result = await seedDatabase(force);
    return NextResponse.json({ success: true, message: 'Database seeded successfully', data: result });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to seed database', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
