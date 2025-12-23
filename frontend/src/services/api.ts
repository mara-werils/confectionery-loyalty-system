import axios, { AxiosError, AxiosInstance } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

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

    // Handle token expiration
    if (error.response?.status === 401 && code === 'TOKEN_EXPIRED') {
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
    }) => axiosInstance.post('/auth/register', data),

    login: (data: {
      walletAddress: string;
      signature: string;
      message: string;
    }) => axiosInstance.post('/auth/login', data),

    me: () => axiosInstance.get('/auth/me'),
  },

  // Partners
  partners: {
    list: (params?: { page?: number; limit?: number; tier?: string }) =>
      axiosInstance.get('/partners', { params }),

    get: (id: string) => axiosInstance.get(`/partners/${id}`),

    update: (id: string, data: Partial<{ companyName: string; email: string }>) =>
      axiosInstance.patch(`/partners/${id}`, data),
  },

  // Loyalty
  loyalty: {
    getBalance: () => axiosInstance.get('/loyalty/balance'),

    getHistory: (params?: { page?: number; limit?: number; type?: string }) =>
      axiosInstance.get('/loyalty/history', { params }),

    redeem: (rewardId: string) =>
      axiosInstance.post('/loyalty/redeem', { rewardId }),
  },

  // Transactions
  transactions: {
    list: (params?: { page?: number; limit?: number; type?: string }) =>
      axiosInstance.get('/transactions', { params }),

    get: (id: string) => axiosInstance.get(`/transactions/${id}`),

    create: (data: { amount: number; type: string; description?: string }) =>
      axiosInstance.post('/transactions', data),
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
  },
};

export default axiosInstance;




