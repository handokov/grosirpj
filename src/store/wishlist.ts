import { create } from 'zustand';

interface WishlistStore {
  items: string[]; // product IDs
  loading: boolean;
  fetchWishlist: (userId: string) => Promise<void>;
  toggleWishlist: (userId: string, productId: string) => Promise<boolean>; // returns true if added, false if removed
  isWishlisted: (productId: string) => boolean;
}

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  items: [],
  loading: false,

  fetchWishlist: async (userId: string) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/wishlist?userId=${userId}`);
      if (!res.ok) throw new Error('Gagal mengambil wishlist');
      const data = await res.json();
      const productIds = data.wishlist.map(
        (item: { productId: string }) => item.productId
      );
      set({ items: productIds });
    } catch (error) {
      console.error('fetchWishlist error:', error);
    } finally {
      set({ loading: false });
    }
  },

  toggleWishlist: async (userId: string, productId: string) => {
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId }),
      });
      if (!res.ok) throw new Error('Gagal mengubah wishlist');
      const data = await res.json();

      const { items } = get();
      if (data.added) {
        set({ items: [...items, productId] });
      } else {
        set({ items: items.filter((id) => id !== productId) });
      }

      return data.added as boolean;
    } catch (error) {
      console.error('toggleWishlist error:', error);
      return get().isWishlisted(productId);
    }
  },

  isWishlisted: (productId: string) => {
    return get().items.includes(productId);
  },
}));
