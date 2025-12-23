import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

// ========================================
// AUTH HOOKS
// ========================================

export function useLogin() {
  const { setToken, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { walletAddress: string; signature: string; message: string }) =>
      api.auth.login(data),
    onSuccess: (response) => {
      setToken(response.data.token);
      setUser(response.data.partner);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('Welcome back!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Login failed');
    },
  });
}

export function useRegister() {
  const { setToken, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      walletAddress: string;
      companyName: string;
      email?: string;
      signature: string;
      message: string;
    }) => api.auth.register(data),
    onSuccess: (response) => {
      setToken(response.data.token);
      setUser(response.data.partner);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('Registration successful!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Registration failed');
    },
  });
}

export function useCurrentUser() {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.auth.me(),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ========================================
// LOYALTY HOOKS
// ========================================

export function useBalance() {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['loyalty', 'balance'],
    queryFn: () => api.loyalty.getBalance(),
    enabled: !!token,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useLoyaltyHistory(page = 1, limit = 20) {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['loyalty', 'history', page, limit],
    queryFn: () => api.loyalty.getHistory({ page, limit }),
    enabled: !!token,
  });
}

export function useRedeemPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rewardId: string) => api.loyalty.redeem(rewardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast.success('Points redeemed successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Redemption failed');
    },
  });
}

// ========================================
// TRANSACTIONS HOOKS
// ========================================

export function useTransactions(page = 1, limit = 20) {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['transactions', page, limit],
    queryFn: () => api.transactions.list({ page, limit }),
    enabled: !!token,
  });
}

export function useRecordTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { amount: number; type: string; description?: string }) =>
      api.transactions.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'balance'] });
      toast.success('Transaction recorded!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record transaction');
    },
  });
}

// ========================================
// REWARDS HOOKS
// ========================================

export function useRewards(filters?: { category?: string; available?: boolean }) {
  return useQuery({
    queryKey: ['rewards', filters],
    queryFn: () => api.rewards.list(filters),
    staleTime: 60000, // 1 minute
  });
}

export function useReward(id: string) {
  return useQuery({
    queryKey: ['rewards', id],
    queryFn: () => api.rewards.get(id),
    enabled: !!id,
  });
}

export function useClaimReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rewardId: string) => api.rewards.claim(rewardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'balance'] });
      toast.success('Reward claimed! Check your claims in History.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to claim reward');
    },
  });
}

// ========================================
// ANALYTICS HOOKS
// ========================================

export function useAnalyticsSummary() {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => api.analytics.getSummary(),
    enabled: !!token,
    refetchInterval: 60000, // 1 minute
  });
}

export function useAnalyticsGrowth(period: 'day' | 'week' | 'month' = 'month') {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['analytics', 'growth', period],
    queryFn: () => api.analytics.getGrowth(period),
    enabled: !!token,
  });
}




