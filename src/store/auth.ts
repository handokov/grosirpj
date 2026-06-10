import { create } from 'zustand';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  city: string;
  address?: string;
  province?: string;
  postalCode?: string;
  avatar?: string;
  gender?: string;
  dateOfBirth?: string;
  role: string;
  phone?: string;
  storeName?: string;
  storeDescription?: string;
  storeAvatar?: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  sellerBalance?: number;
  totalSales?: number;
}

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  loginModalOpen: boolean;
  sellerMode: boolean;
  error: string;
  setLoginModalOpen: (open: boolean) => void;
  setSellerMode: (mode: boolean) => void;
  setUser: (user: AuthUser | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; email: string; password: string; city: string; role?: string; phone?: string; storeName?: string; storeDescription?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,
  loginModalOpen: false,
  sellerMode: false,
  error: '',

  setLoginModalOpen: (open) => set({ loginModalOpen: open }),
  setSellerMode: (mode) => {
    localStorage.setItem('grosirpj_seller_mode', JSON.stringify(mode));
    set({ sellerMode: mode });
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem('grosirpj_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('grosirpj_user');
    }
    set({ user });
  },

  login: async (email, password) => {
    try {
      set({ error: '' });
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error || 'Login gagal';
        set({ error: errorMsg });
        return { success: false, error: errorMsg };
      }
      get().setUser(data);
      if (data.role === 'seller') {
        localStorage.setItem('grosirpj_seller_mode', JSON.stringify(true));
        set({ sellerMode: true });
      }
      set({ loginModalOpen: false, error: '' });
      return { success: true };
    } catch (err) {
      const errorMsg = 'Tidak dapat terhubung ke server. Silakan coba lagi.';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  register: async (registerData) => {
    try {
      set({ error: '' });
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(registerData),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error || 'Registrasi gagal';
        set({ error: errorMsg });
        return { success: false, error: errorMsg };
      }
      get().setUser(data);
      if (data.role === 'seller') {
        localStorage.setItem('grosirpj_seller_mode', JSON.stringify(true));
        set({ sellerMode: true });
      }
      set({ loginModalOpen: false, error: '' });
      return { success: true };
    } catch (err) {
      const errorMsg = 'Tidak dapat terhubung ke server. Silakan coba lagi.';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  logout: () => {
    // Call server to clear the JWT cookie
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {
      // Ignore errors - we still want to clear client-side state
    });
    get().setUser(null);
    localStorage.removeItem('grosirpj_seller_mode');
    set({ sellerMode: false, error: '' });
  },

  init: async () => {
    try {
      // First, try to verify via JWT cookie (without userId param)
      const cookieRes = await fetch('/api/auth/me');
      const cookieData = await cookieRes.json();
      if (cookieData.user) {
        const savedSellerMode = localStorage.getItem('grosirpj_seller_mode');
        const sellerMode = savedSellerMode !== null ? JSON.parse(savedSellerMode) : false;
        // Sync localStorage with the verified user
        localStorage.setItem('grosirpj_user', JSON.stringify(cookieData.user));
        set({ user: cookieData.user, loading: false, sellerMode: cookieData.user.role === 'seller' ? sellerMode : false });
        return;
      }

      // Fallback: check localStorage and verify with userId
      const stored = localStorage.getItem('grosirpj_user');
      if (stored) {
        const user = JSON.parse(stored);
        const res = await fetch(`/api/auth/me?userId=${user.id}`);
        const data = await res.json();
        if (data.user) {
          const savedSellerMode = localStorage.getItem('grosirpj_seller_mode');
          const sellerMode = savedSellerMode !== null ? JSON.parse(savedSellerMode) : false;
          set({ user: data.user, loading: false, sellerMode: data.user.role === 'seller' ? sellerMode : false });
        } else {
          localStorage.removeItem('grosirpj_user');
          set({ user: null, loading: false, sellerMode: false });
        }
      } else {
        set({ loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },
}));
