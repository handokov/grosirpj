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
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  setQuantity: (productId: string, qty: number) => void;
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

  removeItem: (productId) => {
    set((state) => ({ items: state.items.filter((item) => item.productId !== productId) }));
  },

  updateQuantity: (productId, delta) => {
    set((state) => {
      const updated = state.items
        .map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity >= item.minOrder);
      return { items: updated };
    });
  },

  setQuantity: (productId, qty) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId ? { ...item, quantity: qty } : item
      ),
    }));
  },

  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  getCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  clearCart: () => set({ items: [] }),
}));
