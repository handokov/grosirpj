import { create } from 'zustand';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  quantity: number;
  minOrder: number;
  stock: number;
  location: string;
  sellerId: string;
  sellerName: string;
  selectedVariants: Record<string, string>; // { "Ukuran": "L", "Warna": "Merah" }
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, selectedVariants?: Record<string, string>) => void;
  updateQuantity: (productId: string, delta: number, selectedVariants?: Record<string, string>) => void;
  setQuantity: (productId: string, qty: number, selectedVariants?: Record<string, string>) => void;
  removeItemsBySeller: (sellerId: string) => void;
  getSellerItems: (sellerId: string) => CartItem[];
  getSellerSubtotal: (sellerId: string) => number;
  getTotal: () => number;
  getCount: () => number;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (item) => {
    set((state) => {
      const variantKey = JSON.stringify(item.selectedVariants);
      const existing = state.items.find(
        (i) => i.productId === item.productId && JSON.stringify(i.selectedVariants) === variantKey
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId && JSON.stringify(i.selectedVariants) === variantKey
              ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock) }
              : i
          ),
        };
      }
      return { items: [...state.items, item] };
    });
  },

  removeItem: (productId, selectedVariants) => {
    set((state) => {
      if (selectedVariants) {
        const variantKey = JSON.stringify(selectedVariants);
        return { items: state.items.filter((item) => !(item.productId === productId && JSON.stringify(item.selectedVariants) === variantKey)) };
      }
      return { items: state.items.filter((item) => item.productId !== productId) };
    });
  },

  updateQuantity: (productId, delta, selectedVariants) => {
    set((state) => {
      const variantKey = selectedVariants ? JSON.stringify(selectedVariants) : null;
      const updated = state.items
        .map((item) => {
          const matches = variantKey
            ? (item.productId === productId && JSON.stringify(item.selectedVariants) === variantKey)
            : item.productId === productId;
          return matches ? { ...item, quantity: item.quantity + delta } : item;
        })
        .filter((item) => item.quantity >= item.minOrder);
      return { items: updated };
    });
  },

  setQuantity: (productId, qty, selectedVariants) => {
    set((state) => {
      const variantKey = selectedVariants ? JSON.stringify(selectedVariants) : null;
      return {
        items: state.items.map((item) => {
          const matches = variantKey
            ? (item.productId === productId && JSON.stringify(item.selectedVariants) === variantKey)
            : item.productId === productId;
          return matches ? { ...item, quantity: qty } : item;
        }),
      };
    });
  },

  removeItemsBySeller: (sellerId) => {
    set((state) => ({ items: state.items.filter((item) => item.sellerId !== sellerId) }));
  },

  getSellerItems: (sellerId) => {
    return get().items.filter((item) => item.sellerId === sellerId);
  },

  getSellerSubtotal: (sellerId) => {
    return get().items.filter((item) => item.sellerId === sellerId).reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  getCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  clearCart: () => set({ items: [] }),
}));
