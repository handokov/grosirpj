import { create } from 'zustand';
import { Product } from '@/lib/data';

interface CartItem extends Product {
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, delta: number) => void;
  getTotal: () => number;
  getCount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((item) => item.id === product.id);
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        };
      }
      return { items: [...state.items, { ...product, quantity: 1 }] };
    });
  },
  removeItem: (id: number) => {
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
  },
  updateQuantity: (id: number, delta: number) => {
    set((state) => {
      const updated = state.items
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0);
      return { items: updated };
    });
  },
  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },
  getCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));
