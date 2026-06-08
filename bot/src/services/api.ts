import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

/**
 * API service for communicating with the backend.
 * The bot uses HTTP API calls to keep separation of concerns
 * (no direct DB access).
 */
class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-Secret': config.botToken, // Backend can validate this to trust bot requests
      },
    });
  }

  /**
   * Get loyalty balance for a user by their Telegram ID.
   * The backend should have an endpoint that maps telegramId to partner.
   */
  async getBalance(telegramId: number): Promise<{
    balance: string;
    lifetimeEarned: string;
    lifetimeRedeemed: string;
  } | null> {
    try {
      const response = await this.client.get(`/loyalty/balance`, {
        params: { telegramId },
      });
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get available rewards (top N).
   */
  async getRewards(limit: number = 3): Promise<{
    data: Array<{
      id: string;
      title: string;
      description: string | null;
      pointsRequired: string;
      category: string;
      available: number;
      imageUrl: string | null;
    }>;
    total: number;
  }> {
    const response = await this.client.get('/rewards', {
      params: { limit, available: true },
    });
    return {
      data: response.data.data,
      total: response.data.pagination?.total || response.data.data.length,
    };
  }

  /**
   * Claim a reward for a user.
   */
  async claimReward(
    telegramId: number,
    rewardId: string
  ): Promise<{
    claim: { id: string; pointsSpent: string; status: string };
    newBalance: string;
  }> {
    const response = await this.client.post(`/rewards/${rewardId}/claim`, {
      telegramId,
    });
    return response.data.data;
  }

  /**
   * Get referral stats for a user.
   */
  async getReferralStats(telegramId: number): Promise<{
    referralCode: string | null;
    totalReferrals: number;
    totalBonusEarned: string;
  } | null> {
    try {
      const response = await this.client.get('/referrals/stats', {
        params: { telegramId },
      });
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Generate referral code for a user.
   */
  async generateReferralCode(telegramId: number): Promise<{ referralCode: string }> {
    const response = await this.client.post('/referrals/generate-code', {
      telegramId,
    });
    return response.data.data;
  }
}

export const apiService = new ApiService();
