/**
 * Sync live GrosirPJ data to local SQLite
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const LOCAL_DB_URL = 'file:/home/z/my-project/db/custom.db';
const LIVE_BASE = 'https://grosirpj.vercel.app';

async function hashPw(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function fetchJSON(path: string) {
  const res = await fetch(`${LIVE_BASE}${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

async function loginAndGetUser(email: string, password: string) {
  const res = await fetch(`${LIVE_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return data.user || data;
}

async function main() {
  console.log('🔄 Syncing data from live server to local DB...\n');
  
  const db = new PrismaClient({
    datasources: { db: { url: LOCAL_DB_URL } },
  });

  // Step 1: Get all known user accounts from live via login
  console.log('📥 Step 1: Fetching user data from live server...');
  
  const knownEmails = [
    'seller1@grosirpj.id', 'seller2@grosirpj.id', 'seller3@grosirpj.id',
    'buyer@grosirpj.id', 'buyer2@grosirpj.id', 'buyer3@grosirpj.id', 'buyer4@grosirpj.id',
  ];
  
  const liveUsers: any[] = [];
  for (const email of knownEmails) {
    try {
      const user = await loginAndGetUser(email, 'password123');
      if (user.id) { liveUsers.push(user); console.log(`  ✅ ${user.name} (${user.role})`); }
    } catch (e: any) { console.log(`  ❌ ${email}`); }
  }
  
  // Step 2: Fetch products and orders
  console.log('\n📥 Step 2: Fetching products & orders...');
  const [productsData, ordersData] = await Promise.all([
    fetchJSON('/api/products?limit=100'),
    fetchJSON('/api/orders'),
  ]);
  const liveProducts = productsData.products || [];
  const liveOrders = ordersData.orders || [];
  console.log(`  ${liveProducts.length} products, ${liveOrders.length} orders`);
  
  // Get detailed order info
  for (let i = 0; i < liveOrders.length; i++) {
    if (!liveOrders[i].items || liveOrders[i].items.length === 0) {
      try {
        const detail = await fetchJSON(`/api/orders/${liveOrders[i].id}`);
        if (detail.order) liveOrders[i] = { ...liveOrders[i], ...detail.order };
      } catch {}
    }
  }
  
  // Step 3: Collect ALL unique users from orders and products
  console.log('\n📥 Step 3: Collecting additional users...');
  const allUserMap = new Map<string, any>();
  
  // From login data
  for (const u of liveUsers) allUserMap.set(u.id, u);
  
  // From orders
  for (const o of liveOrders) {
    if (o.buyer && !allUserMap.has(o.buyer.id)) allUserMap.set(o.buyer.id, o.buyer);
    if (o.seller && !allUserMap.has(o.seller.id)) allUserMap.set(o.seller.id, o.seller);
  }
  
  // From products (seller info)
  for (const p of liveProducts) {
    if (p.seller && !allUserMap.has(p.sellerId)) {
      allUserMap.set(p.sellerId, {
        id: p.sellerId,
        name: p.seller.name || p.seller.storeName,
        email: `seller_${p.sellerId.substring(0,8)}@grosirpj.id`,
        role: 'seller',
        city: p.location || 'Jakarta',
        storeName: p.seller.storeName || p.seller.name,
      });
    }
  }
  
  console.log(`  Total unique users: ${allUserMap.size}`);
  
  // Step 4: Clear local database
  console.log('\n🗑️  Step 4: Clearing local database...');
  await db.searchHistory.deleteMany();
  await db.productView.deleteMany();
  await db.cartItem.deleteMany();
  await db.wishlist.deleteMany();
  await db.notification.deleteMany();
  await db.chat.deleteMany();
  await db.review.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.variantOption.deleteMany();
  await db.variantGroup.deleteMany();
  await db.product.deleteMany();
  await db.userAddress.deleteMany();
  await db.user.deleteMany();
  console.log('  ✅ Cleared');
  
  // Step 5: Create users
  console.log('\n👤 Step 5: Creating users...');
  const hp = await hashPw('password123');
  
  for (const [id, u] of allUserMap) {
    try {
      // Determine role from data
      let role = u.role || 'buyer';
      // If they have storeName or are sellers of products, mark as seller
      if (u.storeName || liveProducts.some(p => p.sellerId === id)) {
        role = 'seller';
      }
      
      await db.user.create({
        data: {
          id: u.id,
          email: u.email || `user_${u.id.substring(0,8)}@grosirpj.id`,
          name: u.name || 'User',
          password: hp,
          phone: u.phone || '',
          city: u.city || 'Jakarta',
          address: u.address || '',
          province: u.province || '',
          postalCode: u.postalCode || '',
          avatar: u.avatar || '',
          gender: u.gender || '',
          dateOfBirth: u.dateOfBirth || '',
          role: role,
          storeName: u.storeName || null,
          storeDescription: u.storeDescription || null,
          storeAvatar: u.storeAvatar || null,
          bankName: u.bankName || null,
          bankAccount: u.bankAccount || null,
          bankHolder: u.bankHolder || null,
        },
      });
      console.log(`  ✅ ${u.name} (${role})`);
    } catch (e: any) {
      console.error(`  ❌ ${u.name}: ${e.message?.substring(0, 120)}`);
    }
  }
  
  // Step 6: Create products
  console.log('\n📦 Step 6: Creating products...');
  
  for (const p of liveProducts) {
    try {
      const sellerExists = await db.user.findUnique({ where: { id: p.sellerId } });
      if (!sellerExists) { console.log(`  ⚠️ Skip "${p.name}" - seller not found`); continue; }
      
      // Handle images - API returns array, Prisma expects JSON string
      const imagesStr = Array.isArray(p.images) ? JSON.stringify(p.images) : (p.images || '[]');
      
      await db.product.create({
        data: {
          id: p.id, name: p.name, description: p.description || '',
          price: p.price, originalPrice: p.originalPrice || 0, category: p.category,
          images: imagesStr, minOrder: p.minOrder || 1, stock: p.stock || 0,
          location: p.location || 'Jakarta', active: p.active !== false,
          sold: p.sold || 0, rating: p.rating || 0, weight: p.weight || 500, sellerId: p.sellerId,
        },
      });
      
      // Create variant groups
      if (p.variantGroups && Array.isArray(p.variantGroups)) {
        for (const vg of p.variantGroups) {
          try {
            await db.variantGroup.create({ data: { id: vg.id, name: vg.name, order: vg.order ?? 0, productId: p.id } });
            if (vg.options && Array.isArray(vg.options)) {
              for (const opt of vg.options) {
                await db.variantOption.create({ data: { id: opt.id, value: opt.value, variantGroupId: vg.id } });
              }
            }
          } catch (vgErr: any) {
            console.log(`    ⚠️ Variant err: ${vgErr.message?.substring(0,80)}`);
          }
        }
      }
      console.log(`  ✅ ${p.name}`);
    } catch (e: any) {
      console.error(`  ❌ ${p.name}: ${e.message?.substring(0, 200)}`);
    }
  }
  
  // Step 7: Create orders
  console.log('\n📋 Step 7: Creating orders...');
  
  for (const o of liveOrders) {
    try {
      const buyerExists = await db.user.findUnique({ where: { id: o.buyerId } });
      const sellerExists = await db.user.findUnique({ where: { id: o.sellerId } });
      if (!buyerExists || !sellerExists) { console.log(`  ⚠️ Skip order - missing user`); continue; }
      
      await db.order.create({
        data: {
          id: o.id, buyerId: o.buyerId, sellerId: o.sellerId, status: o.status,
          totalAmount: o.totalAmount, shippingCost: o.shippingCost || 0,
          shippingAddress: o.shippingAddress || '', paymentMethod: o.paymentMethod || 'cod',
          paymentProof: o.paymentProof || '', expedition: o.expedition || '',
          trackingNumber: o.trackingNumber || '',
          paidAt: o.paidAt ? new Date(o.paidAt) : null,
          shippedAt: o.shippedAt ? new Date(o.shippedAt) : null,
          deliveredAt: o.deliveredAt ? new Date(o.deliveredAt) : null,
          notes: o.notes || '', createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
        },
      });
      
      if (o.items && Array.isArray(o.items)) {
        for (const item of o.items) {
          try {
            await db.orderItem.create({
              data: { id: item.id, orderId: o.id, productId: item.productId,
                productName: item.productName, quantity: item.quantity, price: item.price,
                variants: item.variants || '{}' },
            });
          } catch (itemErr: any) {
            // If product doesn't exist, create orderItem anyway (productId might be deleted product)
            console.log(`    ⚠️ Item err: ${itemErr.message?.substring(0,100)}`);
          }
        }
      }
      console.log(`  ✅ ${o.id.substring(0,12)}... (${o.status})`);
    } catch (e: any) {
      console.error(`  ❌ Order: ${e.message?.substring(0, 200)}`);
    }
  }
  
  // Final counts
  console.log('\n📊 Final local counts vs Live:');
  const lc = { users: await db.user.count(), products: await db.product.count(), orders: await db.order.count(),
    orderItems: await db.orderItem.count(), variantGroups: await db.variantGroup.count(), variantOptions: await db.variantOption.count() };
  Object.entries(lc).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  
  console.log('\n👥 Users:');
  const users = await db.user.findMany({ select: { email: true, name: true, role: true, storeName: true }, orderBy: { role: 'asc' } });
  users.forEach(u => console.log(`  ${u.email.padEnd(30)} | ${(u.role||'?').padEnd(8)} | ${u.name} ${u.storeName ? '('+u.storeName+')' : ''}`));
  
  await db.$disconnect();
  console.log('\n✅ Sync completed!');
}

main().catch(e => { console.error('❌ Failed:', e); process.exit(1); });
