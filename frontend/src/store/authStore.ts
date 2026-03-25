import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'business' | 'customer' | null;

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
  role: UserRole;
  isAuthenticated: boolean;
  spentPoints: number;
  
  // Actions
  setToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setWalletAddress: (address: string | null) => void;
  setRole: (role: UserRole) => void;
  logout: () => void;
  addSpentPoints: (points: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      walletAddress: null,
      role: null,
      isAuthenticated: false,
      spentPoints: 0,

      setToken: (token) => set({ token, isAuthenticated: !!token }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setUser: (user) => set({ user }),
      setWalletAddress: (walletAddress) => set({ walletAddress }),
      setRole: (role) => set({ role }),
      addSpentPoints: (points) => set((state) => ({ spentPoints: state.spentPoints + points })),
      
      logout: () =>
        set({
          token: null,
          refreshToken: null,
          user: null,
          role: null,
          isAuthenticated: false,
          spentPoints: 0,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        role: state.role,
        spentPoints: state.spentPoints,
      }),
    }
  )
);
