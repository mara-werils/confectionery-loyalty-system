import axios, { AxiosError, AxiosInstance } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.error(
    'VITE_API_URL is not configured. On Vercel, /api/v1 requests will hit the frontend unless you set the backend URL.'
  );
}

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ message?: string; error?: { code: string } }>) => {
    const message = error.response?.data?.message || 'An error occurred';
    const code = error.response?.data?.error?.code;

    // Handle stale/invalid tokens — clear state and redirect to home
    const STALE_TOKEN_CODES = ['TOKEN_EXPIRED', 'ACCOUNT_INVALID', 'UNAUTHORIZED', 'INVALID_TOKEN'];
    if (
      error.response?.status === 401 &&
      (!code || STALE_TOKEN_CODES.includes(code)) &&
      window.location.pathname !== '/'
    ) {
      useAuthStore.getState().logout();
      window.location.href = '/';
    }

    return Promise.reject(new Error(message));
  }
);

// ========================================
// API ENDPOINTS
// ========================================

export const api = {
  // Auth
  auth: {
    register: (data: {
      walletAddress: string;
      companyName: string;
      email?: string;
      signature: string;
      message: string;
      publicKey?: string;
      nonce?: string;
      timestamp?: number;
    }) => axiosInstance.post('/auth/register', data),

    login: (data: {
      walletAddress: string;
      signature: string;
      message: string;
    }) => axiosInstance.post('/auth/login', data),

    me: () => axiosInstance.get('/auth/me'),

    customerAuth: (walletAddress: string) =>
      axiosInstance.post('/auth/customer', { walletAddress }),
  },

  // Partners
  partners: {
    list: (params?: { page?: number; limit?: number; tier?: string }) =>
      axiosInstance.get('/partners', { params }),

    get: (id: string) => axiosInstance.get(`/partners/${id}`),

    update: (id: string, data: Partial<{ companyName: string; email: string }>) =>
      axiosInstance.patch(`/partners/${id}`, data),

    ecosystem: () => axiosInstance.get('/partners/ecosystem'),
  },

  // Loyalty
  loyalty: {
    getBalance: () => axiosInstance.get('/loyalty/balance'),

    getHistory: (params?: { page?: number; limit?: number; type?: string }) =>
      axiosInstance.get('/loyalty/history', { params }),

    redeem: (rewardId: string) =>
      axiosInstance.post('/loyalty/redeem', { rewardId }),

    simulatePurchase: (data: {
      partnerId: string;
      customerWallet: string;
      amount: number;
      items?: string[];
    }) => axiosInstance.post('/loyalty/simulate-purchase', data),
  },

  // Transactions
  transactions: {
    list: (params?: { page?: number; limit?: number; type?: string }) =>
      axiosInstance.get('/transactions', { params }),

    get: (id: string) => axiosInstance.get(`/transactions/${id}`),

    create: (data: { amount: number; type: string; description?: string }) =>
      axiosInstance.post('/transactions', data),

    onChain: (params?: { page?: number; limit?: number }) =>
      axiosInstance.get('/transactions/on-chain', { params }),
  },

  // Rewards
  rewards: {
    list: (params?: { category?: string; available?: boolean }) =>
      axiosInstance.get('/rewards', { params }),

    get: (id: string) => axiosInstance.get(`/rewards/${id}`),

    claim: (id: string) => axiosInstance.post(`/rewards/${id}/claim`),
  },

  // Analytics
  analytics: {
    getSummary: () => axiosInstance.get('/analytics/summary'),

    getGrowth: (period: 'day' | 'week' | 'month') =>
      axiosInstance.get('/analytics/growth', { params: { period } }),

    getTopPartners: () => axiosInstance.get('/analytics/top-partners'),
  },

  // Admin
  admin: {
    issueSbt: (walletAddress: string) =>
      axiosInstance.post('/admin/sbt/issue', { walletAddress }),

    revokeSbt: (walletAddress: string) =>
      axiosInstance.post('/admin/sbt/revoke', { walletAddress }),

    checkSbt: (walletAddress: string) =>
      axiosInstance.get(`/admin/sbt/check/${walletAddress}`),

    getAuditLogs: (params?: { page?: number; limit?: number; action?: string }) =>
      axiosInstance.get('/admin/audit-logs', { params }),

    getStats: () =>
      axiosInstance.get('/admin/stats'),

    mintTokens: (data: { targetWallet: string; amount: number }) =>
      axiosInstance.post('/loyalty/mint', data),

    getSettings: () =>
      axiosInstance.get('/admin/settings'),

    updateSettings: (data: Record<string, unknown>) =>
      axiosInstance.patch('/admin/settings', data),

    updatePartner: (id: string, data: Record<string, unknown>) =>
      axiosInstance.patch(`/partners/${id}`, data),

    createReward: (data: {
      title: string;
      description: string;
      pointsRequired: number;
      category: string;
      availableQuantity: number;
      isActive: boolean;
    }) => axiosInstance.post('/rewards', data),

    updateReward: (id: string, data: Record<string, unknown>) =>
      axiosInstance.patch(`/rewards/${id}`, data),

    deleteReward: (id: string) =>
      axiosInstance.delete(`/rewards/${id}`),
  },

  // Coupons
  coupons: {
    create: (rewardId: string, rewardTitle: string, pointsRequired: number, rewardCategory: string) =>
      axiosInstance.post('/coupons', { rewardId, rewardTitle, pointsRequired, rewardCategory }),
    list: () => axiosInstance.get('/coupons'),
    verify: (code: string) => axiosInstance.get(`/coupons/verify/${code}`),
    redeem: (code: string) => axiosInstance.post(`/coupons/${code}/redeem`),
  },

  // AI Predictive Analytics
  ai: {
    getChurnRisks: () => axiosInstance.get('/ai/churn'),
    getForecast: () => axiosInstance.get('/ai/forecast'),
    getRecommendations: () => axiosInstance.get('/ai/recommendations'),
  },

  // Referrals
  referrals: {
    getStats: () => axiosInstance.get('/referrals/stats'),
    generateCode: () => axiosInstance.post('/referrals/generate-code'),
    applyCode: (referralCode: string) => axiosInstance.post('/referrals/apply', { referralCode }),
    getLeaderboard: () => axiosInstance.get('/referrals/leaderboard'),
  },

  // Achievements
  achievements: {
    getAll:       () => axiosInstance.get('/achievements'),
    check:        () => axiosInstance.post('/achievements/check'),
    getLeaderboard: () => axiosInstance.get('/achievements/leaderboard'),
  },

  // Spin Wheel
  spin: {
    status: () => axiosInstance.get('/spin/status'),
    play:   () => axiosInstance.post('/spin/play'),
  },

  // Daily Check-in
  checkin: {
    status: () => axiosInstance.get('/checkin/status'),
    claim:  () => axiosInstance.post('/checkin/claim'),
  },

  // Gift Tokens
  gift: {
    send:    (receiverWallet: string, amount: number, message?: string) =>
      axiosInstance.post('/gift/send', { receiverWallet, amount, message }),
    history: () => axiosInstance.get('/gift/history'),
  },
};

export default axiosInstance;












