import { create } from 'zustand';

// Track if we've pushed a history entry for an overlay
let overlayHistoryPushed = false;

// Listen for browser back button to close overlays
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const store = useUIStore.getState();
    // If any overlay is open, close it instead of navigating away
    if (
      store.productDetailOpen ||
      store.cartOpen ||
      store.checkoutOpen ||
      store.orderHistoryOpen ||
      store.chatOpen ||
      store.notifPanelOpen
    ) {
      store.closeAllOverlays();
      overlayHistoryPushed = false;
    }
  });
}

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
  closeAllOverlays: () => void;
  setUnreadChatCount: (count: number) => void;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: string) => void;
  setSortBy: (sort: string) => void;
  setCurrentPage: (page: number) => void;
  resetFilters: () => void;
}

// Helper: push history entry when opening overlay so Back button works
function pushOverlayHistory() {
  if (!overlayHistoryPushed) {
    window.history.pushState({ overlay: true }, '');
    overlayHistoryPushed = true;
  }
}

// Helper: go back in history when closing overlay (if we pushed one)
function popOverlayHistory() {
  if (overlayHistoryPushed) {
    overlayHistoryPushed = false;
    // Only go back if we're still on the same page (don't navigate away)
    if (window.history.state?.overlay) {
      window.history.back();
    }
  }
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

  openProductDetail: (productId) => {
    pushOverlayHistory();
    set({ productDetailOpen: true, selectedProductId: productId });
  },
  closeProductDetail: () => {
    popOverlayHistory();
    set({ productDetailOpen: false, selectedProductId: null });
  },
  openCart: () => {
    pushOverlayHistory();
    set({ cartOpen: true });
  },
  closeCart: () => {
    popOverlayHistory();
    set({ cartOpen: false });
  },
  openCheckout: (sellerId) => {
    // Checkout replaces cart overlay, no new history push needed
    set({ checkoutOpen: true, cartOpen: false, checkoutSellerId: sellerId || null });
  },
  closeCheckout: () => {
    popOverlayHistory();
    set({ checkoutOpen: false, checkoutSellerId: null });
  },
  openOrderHistory: () => {
    pushOverlayHistory();
    set({ orderHistoryOpen: true });
  },
  closeOrderHistory: () => {
    popOverlayHistory();
    set({ orderHistoryOpen: false });
  },
  openChat: (userId) => {
    pushOverlayHistory();
    set({ chatOpen: true, chatWithUserId: userId || null });
  },
  closeChat: () => {
    popOverlayHistory();
    set({ chatOpen: false, chatWithUserId: null });
  },
  openNotifPanel: () => {
    pushOverlayHistory();
    set({ notifPanelOpen: true });
  },
  closeNotifPanel: () => {
    popOverlayHistory();
    set({ notifPanelOpen: false });
  },
  closeAllOverlays: () => {
    overlayHistoryPushed = false;
    set({
      productDetailOpen: false,
      selectedProductId: null,
      cartOpen: false,
      checkoutOpen: false,
      checkoutSellerId: null,
      orderHistoryOpen: false,
      chatOpen: false,
      chatWithUserId: null,
      notifPanelOpen: false,
    });
  },
  setUnreadChatCount: (count) => set({ unreadChatCount: count }),
  setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),
  setActiveCategory: (category) => set({ activeCategory: category, currentPage: 1 }),
  setSortBy: (sort) => set({ sortBy: sort, currentPage: 1 }),
  setCurrentPage: (page) => set({ currentPage: page }),
  resetFilters: () => set({ searchQuery: '', activeCategory: 'all', sortBy: 'popular', currentPage: 1 }),
}));
