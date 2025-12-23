import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  walletAddress: string;
  companyName: string;
  email?: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED';
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  walletAddress: string | null;
  isAuthenticated: boolean;
  
  // Actions
  setToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setWalletAddress: (address: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      walletAddress: null,
      isAuthenticated: false,

      setToken: (token) => set({ token, isAuthenticated: !!token }),
      
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      
      setUser: (user) => set({ user }),
      
      setWalletAddress: (walletAddress) => set({ walletAddress }),
      
      logout: () =>
        set({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);




