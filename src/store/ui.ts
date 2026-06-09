import { create } from 'zustand';

interface UIStore {
  // Panel visibility
  productDetailOpen: boolean;
  selectedProductId: string | null;
  cartOpen: boolean;
  checkoutOpen: boolean;
  orderHistoryOpen: boolean;
  chatOpen: boolean;
  chatWithUserId: string | null;
  notifPanelOpen: boolean;

  // Search/filter state
  searchQuery: string;
  activeCategory: string;
  sortBy: string;
  currentPage: number;

  // Actions
  openProductDetail: (productId: string) => void;
  closeProductDetail: () => void;
  openCart: () => void;
  closeCart: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  openOrderHistory: () => void;
  closeOrderHistory: () => void;
  openChat: (userId?: string) => void;
  closeChat: () => void;
  openNotifPanel: () => void;
  closeNotifPanel: () => void;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: string) => void;
  setSortBy: (sort: string) => void;
  setCurrentPage: (page: number) => void;
  resetFilters: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  productDetailOpen: false,
  selectedProductId: null,
  cartOpen: false,
  checkoutOpen: false,
  orderHistoryOpen: false,
  chatOpen: false,
  chatWithUserId: null,
  notifPanelOpen: false,
  searchQuery: '',
  activeCategory: 'all',
  sortBy: 'popular',
  currentPage: 1,

  openProductDetail: (productId) => set({ productDetailOpen: true, selectedProductId: productId }),
  closeProductDetail: () => set({ productDetailOpen: false, selectedProductId: null }),
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  openCheckout: () => set({ checkoutOpen: true, cartOpen: false }),
  closeCheckout: () => set({ checkoutOpen: false }),
  openOrderHistory: () => set({ orderHistoryOpen: true }),
  closeOrderHistory: () => set({ orderHistoryOpen: false }),
  openChat: (userId) => set({ chatOpen: true, chatWithUserId: userId || null }),
  closeChat: () => set({ chatOpen: false, chatWithUserId: null }),
  openNotifPanel: () => set({ notifPanelOpen: true }),
  closeNotifPanel: () => set({ notifPanelOpen: false }),
  setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),
  setActiveCategory: (category) => set({ activeCategory: category, currentPage: 1 }),
  setSortBy: (sort) => set({ sortBy: sort, currentPage: 1 }),
  setCurrentPage: (page) => set({ currentPage: page }),
  resetFilters: () => set({ searchQuery: '', activeCategory: 'all', sortBy: 'popular', currentPage: 1 }),
}));
