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
  avatar: string | null;
  activeCoupons: Array<{ code: string; rewardTitleKey: string; partnerName: string }>;
  hasBusinessSbt: boolean;
  sweetBalance: number;

  // Actions
  setToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setWalletAddress: (address: string | null) => void;
  setRole: (role: UserRole) => void;
  logout: () => void;
  addSpentPoints: (points: number) => void;
  setAvatar: (base64: string | null) => void;
  addCoupon: (coupon: { code: string; rewardTitleKey: string; partnerName: string }) => void;
  setCoupons: (coupons: Array<{ code: string; rewardTitleKey: string; partnerName: string }>) => void;
  setHasBusinessSbt: (has: boolean) => void;
  setSweetBalance: (balance: number) => void;
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
      avatar: null,
      activeCoupons: [],
      hasBusinessSbt: false,
      sweetBalance: 0,

      setToken: (token) => set({ token, isAuthenticated: !!token }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setUser: (user) => set({ user }),
      setWalletAddress: (walletAddress) => set({ walletAddress }),
      setRole: (role) => set({ role }),
      addSpentPoints: (points) => set((state) => ({ spentPoints: state.spentPoints + points })),
      setAvatar: (avatar) => set({ avatar }),
      addCoupon: (coupon) => set((state) => ({ activeCoupons: [...state.activeCoupons, coupon] })),
      setCoupons: (coupons) => set({ activeCoupons: coupons }),
      setHasBusinessSbt: (hasBusinessSbt) => set({ hasBusinessSbt }),
      setSweetBalance: (sweetBalance) => set({ sweetBalance }),
      
      logout: () =>
        set({
          token: null,
          refreshToken: null,
          user: null,
          role: null,
          isAuthenticated: false,
          spentPoints: 0,
          activeCoupons: [],
          hasBusinessSbt: false,
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
        avatar: state.avatar,
        activeCoupons: state.activeCoupons,
        hasBusinessSbt: state.hasBusinessSbt,
        sweetBalance: state.sweetBalance,
      }),
    }
  )
);
