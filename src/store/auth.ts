import { create } from 'zustand';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  city: string;
  role: string;
}

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  loginModalOpen: boolean;
  sellerMode: boolean;
  setLoginModalOpen: (open: boolean) => void;
  setSellerMode: (mode: boolean) => void;
  setUser: (user: AuthUser | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, city: string, role?: string) => Promise<boolean>;
  logout: () => void;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,
  loginModalOpen: false,
  sellerMode: false,

  setLoginModalOpen: (open) => set({ loginModalOpen: open }),

  setSellerMode: (mode) => set({ sellerMode: mode }),

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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login gagal');
      }
      get().setUser(data);
      if (data.role === 'seller') {
        set({ sellerMode: true });
      }
      set({ loginModalOpen: false });
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  },

  register: async (name, email, password, city, role) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, city, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registrasi gagal');
      }
      // Auto login after register
      get().setUser(data);
      if (data.role === 'seller') {
        set({ sellerMode: true });
      }
      set({ loginModalOpen: false });
      return true;
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  },

  logout: () => {
    get().setUser(null);
    set({ sellerMode: false });
  },

  init: async () => {
    try {
      const stored = localStorage.getItem('grosirpj_user');
      if (stored) {
        const user = JSON.parse(stored);
        // Verify user still exists in DB
        const res = await fetch(`/api/auth/me?userId=${user.id}`);
        const data = await res.json();
        if (data.user) {
          set({
            user: data.user,
            loading: false,
            sellerMode: data.user.role === 'seller',
          });
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
