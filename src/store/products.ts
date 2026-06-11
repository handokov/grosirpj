import { create } from 'zustand';

export interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  category: string;
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

const CACHE_DURATION = 60_000; // 1 minute cache

export const useProductStore = create<ProductStore>((set, get) => ({
  allProducts: [],
  productsLoading: true,
  lastFetchTime: 0,

  fetchAllProducts: async () => {
    const now = Date.now();
    const { lastFetchTime, allProducts } = get();

    // Return cached data if fresh enough
    if (allProducts.length > 0 && now - lastFetchTime < CACHE_DURATION) {
      return;
    }

    set({ productsLoading: true });
    try {
      // Single fetch with high limit to cover FlashSale + ProductGrid + Recommendations
      const res = await fetch('/api/products?sortBy=popular&limit=50');
      const data = await res.json();
      if (res.ok) {
        set({
          allProducts: data.products || [],
          lastFetchTime: Date.now(),
          productsLoading: false,
        });
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
