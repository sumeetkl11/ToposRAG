import { create } from 'zustand';
import axios from 'axios';

// Enable cookies to be sent along with cross-origin requests globally
axios.defaults.withCredentials = true;

const API_BASE = 'http://localhost:5000';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  checkAuth: () => Promise<void>;
  loginWithGoogle: () => void;
  loginWithGitHub: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,

  checkAuth: async () => {
    set({ loading: true });
    try {
      const res = await axios.get(`${API_BASE}/api/auth/me`);
      if (res.data.success && res.data.user) {
        set({
          user: res.data.user,
          isAuthenticated: true,
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
        });
      }
    } catch (err) {
      set({
        user: null,
        isAuthenticated: false,
      });
    } finally {
      set({ loading: false });
    }
  },

  loginWithGoogle: () => {
    window.location.href = `${API_BASE}/api/auth/google`;
  },

  loginWithGitHub: () => {
    window.location.href = `${API_BASE}/api/auth/github`;
  },

  logout: async () => {
    try {
      await axios.post(`${API_BASE}/api/auth/logout`);
    } catch (err) {
      console.error('Failed to log out on server:', err);
    } finally {
      set({
        user: null,
        isAuthenticated: false,
      });
    }
  },
}));
