import { create } from 'zustand';

export interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  category: string;
  subcategory: string;
  images: string[];
  minOrder: number;
  stock: number;
  location: string;
  active: boolean;
  sold: number;
  rating: number;
  sellerId: string;
  seller: { name: string; storeName?: string; city?: string };
  variantGroups: { id: string; name: string; order: number; options: { id: string; value: string }[] }[];
  reviewCount: number;
  discount: number;
  createdAt: string;
}

interface ProductStore {
  // Shared product data - fetched ONCE, used by FlashSale, ProductGrid, Recommendation
  allProducts: ProductItem[];
  productsLoading: boolean;
  lastFetchTime: number;

  // Fetch all products in one call
  fetchAllProducts: () => Promise<void>;

  // Derived data helpers
  getFlashSaleProducts: () => ProductItem[];
  getPopularProducts: (limit?: number) => ProductItem[];
  getTopRatedProducts: (limit?: number) => ProductItem[];
}

const CACHE_DURATION = 60_000; // 1 minute in-memory cache
const LS_KEY = 'grosirpj_products_cache';
const LS_TS_KEY = 'grosirpj_products_ts';

/**
 * Load cached products from localStorage for instant rendering.
 * Returns null if no cache or cache is too old (5 minutes).
 */
function loadFromLocalStorage(): { products: ProductItem[]; ts: number } | null {
  try {
    const ts = localStorage.getItem(LS_TS_KEY);
    const data = localStorage.getItem(LS_KEY);
    if (!ts || !data) return null;

    const timestamp = parseInt(ts, 10);
    const products = JSON.parse(data);

    // Use localStorage cache if less than 5 minutes old
    if (Date.now() - timestamp < 300_000 && Array.isArray(products) && products.length > 0) {
      return { products, ts: timestamp };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save products to localStorage for next visit.
 */
function saveToLocalStorage(products: ProductItem[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(products));
    localStorage.setItem(LS_TS_KEY, Date.now().toString());
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export const useProductStore = create<ProductStore>((set, get) => ({
  allProducts: [],
  productsLoading: true,
  lastFetchTime: 0,

  fetchAllProducts: async () => {
    const now = Date.now();
    const { lastFetchTime, allProducts } = get();

    // 1. If in-memory cache is fresh, skip fetch entirely
    if (allProducts.length > 0 && now - lastFetchTime < CACHE_DURATION) {
      return;
    }

    // 2. If no in-memory data, try localStorage for INSTANT rendering
    if (allProducts.length === 0) {
      const cached = loadFromLocalStorage();
      if (cached) {
        // Show cached data IMMEDIATELY — no loading spinner!
        set({
          allProducts: cached.products,
          lastFetchTime: cached.ts,
          productsLoading: false,
        });

        // If cache is fresh enough (< 1 min), skip network request
        if (now - cached.ts < CACHE_DURATION) {
          return;
        }

        // Otherwise, do a background refresh (stale-while-revalidate)
        // Don't set productsLoading: true — keep showing stale data
        try {
          const res = await fetch('/api/products?sortBy=popular&limit=50');
          const data = await res.json();
          if (res.ok && data.products?.length > 0) {
            set({
              allProducts: data.products,
              lastFetchTime: Date.now(),
              productsLoading: false,
            });
            saveToLocalStorage(data.products);
          }
        } catch {
          // Keep showing stale data — network error is fine
        }
        return;
      }
    }

    // 3. No cache at all — must show loading and fetch
    set({ productsLoading: true });
    try {
      const res = await fetch('/api/products?sortBy=popular&limit=50');
      const data = await res.json();
      if (res.ok) {
        const products = data.products || [];
        set({
          allProducts: products,
          lastFetchTime: Date.now(),
          productsLoading: false,
        });
        saveToLocalStorage(products);
      } else {
        set({ productsLoading: false });
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      set({ productsLoading: false });
    }
  },

  getFlashSaleProducts: () => {
    const { allProducts } = get();
    return allProducts
      .filter(p => p.discount > 0)
      .slice(0, 6);
  },

  getPopularProducts: (limit = 30) => {
    const { allProducts } = get();
    return allProducts.slice(0, limit);
  },

  getTopRatedProducts: (limit = 12) => {
    const { allProducts } = get();
    return [...allProducts]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  },
}));
