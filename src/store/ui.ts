import { create } from 'zustand';

interface UIStore {
  // Panel visibility
  productDetailOpen: boolean;
  selectedProductId: string | null;
  cartOpen: boolean;
  checkoutOpen: boolean;
  checkoutSellerId: string | null; // null = all sellers, specific = per-store checkout
  orderHistoryOpen: boolean;
  chatOpen: boolean;
  chatWithUserId: string | null;
  notifPanelOpen: boolean;

  // Chat unread count (global - accessible from navbar & seller dashboard)
  unreadChatCount: number;

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
  openCheckout: (sellerId?: string) => void;
  closeCheckout: () => void;
  openOrderHistory: () => void;
  closeOrderHistory: () => void;
  openChat: (userId?: string) => void;
  closeChat: () => void;
  openNotifPanel: () => void;
  closeNotifPanel: () => void;
  setUnreadChatCount: (count: number) => void;
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
  checkoutSellerId: null,
  orderHistoryOpen: false,
  chatOpen: false,
  chatWithUserId: null,
  notifPanelOpen: false,
  unreadChatCount: 0,
  searchQuery: '',
  activeCategory: 'all',
  sortBy: 'popular',
  currentPage: 1,

  openProductDetail: (productId) => set({ productDetailOpen: true, selectedProductId: productId }),
  closeProductDetail: () => set({ productDetailOpen: false, selectedProductId: null }),
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  openCheckout: (sellerId) => set({ checkoutOpen: true, cartOpen: false, checkoutSellerId: sellerId || null }),
  closeCheckout: () => set({ checkoutOpen: false, checkoutSellerId: null }),
  openOrderHistory: () => set({ orderHistoryOpen: true }),
  closeOrderHistory: () => set({ orderHistoryOpen: false }),
  openChat: (userId) => set({ chatOpen: true, chatWithUserId: userId || null }),
  closeChat: () => set({ chatOpen: false, chatWithUserId: null }),
  openNotifPanel: () => set({ notifPanelOpen: true }),
  closeNotifPanel: () => set({ notifPanelOpen: false }),
  setUnreadChatCount: (count) => set({ unreadChatCount: count }),
  setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),
  setActiveCategory: (category) => set({ activeCategory: category, currentPage: 1 }),
  setSortBy: (sort) => set({ sortBy: sort, currentPage: 1 }),
  setCurrentPage: (page) => set({ currentPage: page }),
  resetFilters: () => set({ searchQuery: '', activeCategory: 'all', sortBy: 'popular', currentPage: 1 }),
}));
