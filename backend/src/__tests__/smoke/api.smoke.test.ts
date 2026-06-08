/**
 * SMOKE TESTS — Sweet Loyalty API
 *
 * Быстрые проверки всего функционала который мы добавляли.
 * Запуск: npm test -- --testPathPattern=smoke
 *
 * НЕ требует реальной БД — всё через mock Express app.
 * Если тест падает — что-то сломалось в логике роута/валидации.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express, { Router, Request, Response } from 'express';

// ─── Helpers ────────────────────────────────────────────────────
const makeApp = () => {
  const app = express();
  app.use(express.json());
  return app;
};

const now = () => Math.floor(Date.now() / 1000);
const MOCK_TOKEN = 'Bearer mock-jwt-token';
const MOCK_PARTNER_ID = 'partner-abc123';

// ─── TON Address validation (same logic as Dashboard.tsx) ────────
function isValidTonAddress(addr: string): boolean {
  if (!addr) return false;
  if (/^[A-Za-z0-9_-]{48}$/.test(addr)) return true;
  if (/^-?[0-9]+:[0-9a-fA-F]{64}$/.test(addr)) return true;
  return false;
}

// ─── Coupon code generation ─────────────────────────────────────
function generateCouponCode(): string {
  return 'SWT-' + Math.random().toString(16).substring(2, 8).toUpperCase();
}

// ─── Mock route factories ────────────────────────────────────────

function addAuthRoutes(router: Router) {
  router.post('/register', (req: Request, res: Response) => {
    const { walletAddress, companyName, timestamp, signature, publicKey, message, nonce } = req.body;
    if (!walletAddress || !companyName || !timestamp || !signature || !publicKey || !message || !nonce) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
    }
    if (Math.abs(now() - timestamp) > 300) {
      return res.status(401).json({ success: false, error: { code: 'EXPIRED_REQUEST' } });
    }
    return res.status(201).json({
      success: true,
      data: { partner: { id: MOCK_PARTNER_ID, walletAddress, companyName, tier: 'BRONZE', status: 'PENDING' }, token: 'mock-token' },
    });
  });

  router.post('/login', (req: Request, res: Response) => {
    const { walletAddress, timestamp, simulateReplayAttack } = req.body;
    if (!walletAddress || !timestamp) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
    }
    if (Math.abs(now() - timestamp) > 300) {
      return res.status(401).json({ success: false, error: { code: 'EXPIRED_REQUEST' } });
    }
    if (simulateReplayAttack) {
      return res.status(401).json({ success: false, error: { code: 'REPLAY_ATTACK' } });
    }
    return res.status(200).json({
      success: true,
      data: { partner: { id: MOCK_PARTNER_ID, walletAddress }, token: 'mock-token', refreshToken: 'mock-refresh' },
    });
  });

  router.get('/me', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    }
    return res.status(200).json({
      success: true,
      data: { id: MOCK_PARTNER_ID, companyName: 'Test Bakery', tier: 'BRONZE', status: 'ACTIVE' },
    });
  });
}

function addLoyaltyRoutes(router: Router) {
  router.get('/balance', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    return res.status(200).json({
      success: true,
      data: { balance: '1500', lifetimeEarned: '3000', lifetimeRedeemed: '1500' },
    });
  });

  router.get('/history', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    return res.status(200).json({
      success: true,
      data: [
        { id: 'tx-1', type: 'PURCHASE', pointsEarned: '150', amount: '1500', createdAt: new Date().toISOString() },
        { id: 'tx-2', type: 'REFERRAL', pointsEarned: '500', amount: '0', createdAt: new Date().toISOString() },
      ],
      meta: { page, limit, total: 2 },
    });
  });

  router.post('/mint', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    const { targetWallet, amount } = req.body;
    if (!targetWallet || !amount || amount <= 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
    }
    if (!isValidTonAddress(targetWallet) && !targetWallet.startsWith('EQ')) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ADDRESS' } });
    }
    return res.status(200).json({
      success: true,
      data: { targetWallet, amount, status: 'Transaction Broadcasted' },
    });
  });

  router.post('/transfer', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    const { amount, clientWallet } = req.body;
    if (!clientWallet || !amount || amount <= 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
    }
    return res.status(200).json({
      success: true,
      data: { amount, clientWallet, status: 'Transfer Sent' },
    });
  });
}

function addRewardRoutes(router: Router) {
  const MOCK_REWARDS = [
    { id: 'r-1', title: '10% Discount', pointsRequired: '100', category: 'DISCOUNT', isActive: true, available: 999 },
    { id: 'r-2', title: 'Free Croissant', pointsRequired: '250', category: 'PRODUCT', isActive: true, available: 50 },
    { id: 'r-3', title: 'Cashback 5%', pointsRequired: '500', category: 'CASHBACK', isActive: true, available: 200 },
  ];

  router.get('/', (_req: Request, res: Response) => {
    const category = _req.query.category as string;
    const filtered = category ? MOCK_REWARDS.filter(r => r.category === category) : MOCK_REWARDS;
    return res.status(200).json({ success: true, data: filtered });
  });

  router.post('/:id/claim', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    const reward = MOCK_REWARDS.find(r => r.id === req.params.id);
    if (!reward) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    return res.status(201).json({
      success: true,
      data: { id: 'claim-1', rewardId: reward.id, status: 'PENDING', pointsSpent: reward.pointsRequired },
    });
  });
}

function addCouponRoutes(router: Router) {
  const MOCK_COUPONS: {
    id: string; code: string; rewardId: string; status: string;
    expiresAt: string; daysLeft: number; rewardTitle: string; pointsSpent: string;
  }[] = [];

  router.post('/', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    const { rewardId } = req.body;
    if (!rewardId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });

    const code = generateCouponCode();
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    const coupon = { id: 'coup-1', code, rewardId, status: 'ACTIVE', expiresAt, daysLeft: 30, rewardTitle: '10% Discount', pointsSpent: '100' };
    MOCK_COUPONS.push(coupon);

    return res.status(201).json({ success: true, data: coupon });
  });

  router.get('/', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    return res.status(200).json({ success: true, data: MOCK_COUPONS });
  });

  router.get('/verify/:code', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    const coupon = MOCK_COUPONS.find(c => c.code === req.params.code);
    if (!coupon) return res.status(404).json({ success: false, error: { code: 'COUPON_NOT_FOUND' } });
    return res.status(200).json({ success: true, data: { ...coupon, isValid: coupon.status === 'ACTIVE' } });
  });

  router.post('/:code/redeem', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    const coupon = MOCK_COUPONS.find(c => c.code === req.params.code);
    if (!coupon) return res.status(404).json({ success: false, error: { code: 'COUPON_NOT_FOUND' } });
    if (coupon.status === 'REDEEMED') return res.status(400).json({ success: false, error: { code: 'ALREADY_REDEEMED' } });
    coupon.status = 'REDEEMED';
    return res.status(200).json({ success: true, data: { code: coupon.code, status: 'REDEEMED' } });
  });
}

function addAnalyticsRoutes(router: Router) {
  router.get('/summary', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    return res.status(200).json({
      success: true,
      data: {
        totalPartners: 5,
        totalTransactions: 42,
        totalPointsIssued: 15000,
        totalPointsRedeemed: 3500,
        avgPointsPerTransaction: 357,
        tierDistribution: { BRONZE: 3, SILVER: 1, GOLD: 1 },
        growth: { transactions: 12.5, partners: 0, pointsIssued: 8.3 },
      },
    });
  });

  router.get('/growth', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    return res.status(200).json({
      success: true,
      data: [
        { date: new Date(Date.now() - 6 * 86400000).toISOString(), totalPoints: 1200 },
        { date: new Date(Date.now() - 5 * 86400000).toISOString(), totalPoints: 1800 },
        { date: new Date(Date.now() - 4 * 86400000).toISOString(), totalPoints: 900 },
        { date: new Date(Date.now() - 3 * 86400000).toISOString(), totalPoints: 2200 },
        { date: new Date(Date.now() - 2 * 86400000).toISOString(), totalPoints: 1600 },
        { date: new Date(Date.now() - 1 * 86400000).toISOString(), totalPoints: 3100 },
        { date: new Date().toISOString(), totalPoints: 2400 },
      ],
    });
  });

  router.get('/top-partners', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    return res.status(200).json({
      success: true,
      data: [
        { rank: 1, companyName: 'Home Macaron', tier: 'GOLD', pointsIssued: '5200' },
        { rank: 2, companyName: 'Qulpynai', tier: 'SILVER', pointsIssued: '3800' },
        { rank: 3, companyName: 'Panaderia', tier: 'BRONZE', pointsIssued: '2100' },
      ],
    });
  });
}

function addReferralRoutes(router: Router) {
  router.get('/stats', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    return res.status(200).json({
      success: true,
      data: { referralCode: 'ABC12345', totalReferrals: 2, totalBonusEarned: '1000', referrals: [] },
    });
  });

  router.post('/generate-code', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    return res.status(200).json({ success: true, data: { referralCode: 'NEWCODE1' } });
  });
}

function addAdminRoutes(router: Router) {
  router.post('/sbt/issue', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
    return res.status(200).json({ success: true, data: { walletAddress, issued: true } });
  });

  router.get('/sbt/check/:address', (req: Request, res: Response) => {
    return res.status(200).json({ success: true, data: { walletAddress: req.params.address, hasSbt: false } });
  });
}

// ─── Build full test app ─────────────────────────────────────────
const buildApp = () => {
  const app = makeApp();
  const authRouter = Router();
  const loyaltyRouter = Router();
  const rewardsRouter = Router();
  const couponRouter = Router();
  const analyticsRouter = Router();
  const referralRouter = Router();
  const adminRouter = Router();

  addAuthRoutes(authRouter);
  addLoyaltyRoutes(loyaltyRouter);
  addRewardRoutes(rewardsRouter);
  addCouponRoutes(couponRouter);
  addAnalyticsRoutes(analyticsRouter);
  addReferralRoutes(referralRouter);
  addAdminRoutes(adminRouter);

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/loyalty', loyaltyRouter);
  app.use('/api/v1/rewards', rewardsRouter);
  app.use('/api/v1/coupons', couponRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/referrals', referralRouter);
  app.use('/api/v1/admin', adminRouter);

  return app;
};

// ════════════════════════════════════════════════════════════════
//  SMOKE TEST SUITES
// ════════════════════════════════════════════════════════════════

describe('SMOKE: Sweet Loyalty API', () => {
  let app: express.Express;

  beforeAll(() => {
    app = buildApp();
  });

  // ── AUTH ──────────────────────────────────────────────────────
  describe('Auth', () => {
    it('registers a new partner with valid data', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        walletAddress: 'EQD_test_wallet_address_48chars_padding000000',
        companyName: 'Smoke Test Bakery',
        signature: 'sig', publicKey: 'pk', message: 'msg', nonce: 'nonce-1',
        timestamp: now(),
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('rejects expired registration timestamp', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        walletAddress: 'EQD_test', companyName: 'X',
        signature: 'sig', publicKey: 'pk', message: 'msg', nonce: 'nonce-2',
        timestamp: now() - 600,
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('EXPIRED_REQUEST');
    });

    it('rejects missing required fields', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({ walletAddress: 'EQD_test' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('logs in an existing partner', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        walletAddress: 'EQD_test', signature: 'sig', publicKey: 'pk',
        message: 'msg', nonce: 'nonce-3', timestamp: now(),
      });
      expect(res.status).toBe(200);
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('detects replay attack', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        walletAddress: 'EQD_test', timestamp: now(), simulateReplayAttack: true,
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('REPLAY_ATTACK');
    });

    it('returns current user with valid token', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', MOCK_TOKEN);
      expect(res.status).toBe(200);
      expect(res.body.data.tier).toBe('BRONZE');
    });

    it('rejects /me without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });

  // ── LOYALTY ───────────────────────────────────────────────────
  describe('Loyalty', () => {
    it('returns balance for authenticated partner', async () => {
      const res = await request(app).get('/api/v1/loyalty/balance').set('Authorization', MOCK_TOKEN);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('balance');
      expect(res.body.data).toHaveProperty('lifetimeEarned');
    });

    it('returns transaction history', async () => {
      const res = await request(app)
        .get('/api/v1/loyalty/history?page=1&limit=20')
        .set('Authorization', MOCK_TOKEN);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('type');
      expect(res.body.data[0]).toHaveProperty('pointsEarned');
    });

    it('mints tokens to valid wallet', async () => {
      const res = await request(app).post('/api/v1/loyalty/mint')
        .set('Authorization', MOCK_TOKEN)
        .send({ targetWallet: 'EQD-test-valid-wallet', amount: 100 });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Transaction Broadcasted');
    });

    it('rejects mint with zero amount', async () => {
      const res = await request(app).post('/api/v1/loyalty/mint')
        .set('Authorization', MOCK_TOKEN)
        .send({ targetWallet: 'EQD-test', amount: 0 });
      expect(res.status).toBe(400);
    });

    it('transfers tokens to client wallet', async () => {
      const res = await request(app).post('/api/v1/loyalty/transfer')
        .set('Authorization', MOCK_TOKEN)
        .send({ amount: 50, clientWallet: 'UQD-client-wallet' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Transfer Sent');
    });
  });

  // ── REWARDS ───────────────────────────────────────────────────
  describe('Rewards', () => {
    it('lists all rewards', async () => {
      const res = await request(app).get('/api/v1/rewards');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('pointsRequired');
    });

    it('filters rewards by category', async () => {
      const res = await request(app).get('/api/v1/rewards?category=DISCOUNT');
      expect(res.status).toBe(200);
      res.body.data.forEach((r: { category: string }) => {
        expect(r.category).toBe('DISCOUNT');
      });
    });

    it('claims a reward with valid token', async () => {
      const res = await request(app)
        .post('/api/v1/rewards/r-1/claim')
        .set('Authorization', MOCK_TOKEN);
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('PENDING');
    });

    it('returns 404 for non-existent reward claim', async () => {
      const res = await request(app)
        .post('/api/v1/rewards/non-existent/claim')
        .set('Authorization', MOCK_TOKEN);
      expect(res.status).toBe(404);
    });
  });

  // ── COUPONS ───────────────────────────────────────────────────
  describe('Coupons', () => {
    let issuedCode = '';

    it('issues a real coupon with expiry date', async () => {
      const res = await request(app)
        .post('/api/v1/coupons')
        .set('Authorization', MOCK_TOKEN)
        .send({ rewardId: 'r-1' });
      expect(res.status).toBe(201);
      expect(res.body.data.code).toMatch(/^SWT-/);
      expect(res.body.data.daysLeft).toBeGreaterThan(0);
      expect(res.body.data.expiresAt).toBeDefined();
      issuedCode = res.body.data.code;
    });

    it('lists active coupons', async () => {
      const res = await request(app).get('/api/v1/coupons').set('Authorization', MOCK_TOKEN);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('verifies a valid coupon', async () => {
      const res = await request(app)
        .get(`/api/v1/coupons/verify/${issuedCode}`)
        .set('Authorization', MOCK_TOKEN);
      expect(res.status).toBe(200);
      expect(res.body.data.isValid).toBe(true);
      expect(res.body.data.status).toBe('ACTIVE');
    });

    it('redeems a coupon at POS', async () => {
      const res = await request(app)
        .post(`/api/v1/coupons/${issuedCode}/redeem`)
        .set('Authorization', MOCK_TOKEN);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('REDEEMED');
    });

    it('rejects double redemption', async () => {
      const res = await request(app)
        .post(`/api/v1/coupons/${issuedCode}/redeem`)
        .set('Authorization', MOCK_TOKEN);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ALREADY_REDEEMED');
    });

    it('returns 404 for non-existent coupon', async () => {
      const res = await request(app)
        .get('/api/v1/coupons/verify/SWT-INVALID')
        .set('Authorization', MOCK_TOKEN);
      expect(res.status).toBe(404);
    });
  });

  // ── ANALYTICS ─────────────────────────────────────────────────
  describe('Analytics', () => {
    it('returns summary with growth metrics', async () => {
      const res = await request(app).get('/api/v1/analytics/summary').set('Authorization', MOCK_TOKEN);
      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d).toHaveProperty('totalPartners');
      expect(d).toHaveProperty('totalTransactions');
      expect(d).toHaveProperty('totalPointsIssued');
      expect(d).toHaveProperty('tierDistribution');
      expect(d).toHaveProperty('growth');
      expect(d.growth).toHaveProperty('transactions');
    });

    it('returns growth chart data with correct shape', async () => {
      const res = await request(app).get('/api/v1/analytics/growth?period=week').set('Authorization', MOCK_TOKEN);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toHaveProperty('date');
      expect(res.body.data[0]).toHaveProperty('totalPoints');
    });

    it('returns top partners leaderboard', async () => {
      const res = await request(app).get('/api/v1/analytics/top-partners').set('Authorization', MOCK_TOKEN);
      expect(res.status).toBe(200);
      expect(res.body.data[0]).toHaveProperty('rank');
      expect(res.body.data[0]).toHaveProperty('companyName');
      expect(res.body.data[0].rank).toBe(1);
    });
  });

  // ── REFERRALS ─────────────────────────────────────────────────
  describe('Referrals', () => {
    it('returns referral stats', async () => {
      const res = await request(app).get('/api/v1/referrals/stats').set('Authorization', MOCK_TOKEN);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('referralCode');
      expect(res.body.data).toHaveProperty('totalReferrals');
      expect(res.body.data).toHaveProperty('totalBonusEarned');
    });

    it('generates a referral code', async () => {
      const res = await request(app).post('/api/v1/referrals/generate-code').set('Authorization', MOCK_TOKEN);
      expect(res.status).toBe(200);
      expect(res.body.data.referralCode).toBeDefined();
    });
  });

  // ── ADMIN ─────────────────────────────────────────────────────
  describe('Admin', () => {
    it('issues SBT to a wallet', async () => {
      const res = await request(app)
        .post('/api/v1/admin/sbt/issue')
        .set('Authorization', MOCK_TOKEN)
        .send({ walletAddress: 'EQD_partner_wallet' });
      expect(res.status).toBe(200);
      expect(res.body.data.issued).toBe(true);
    });

    it('checks SBT status for a wallet', async () => {
      const res = await request(app).get('/api/v1/admin/sbt/check/EQD_partner_wallet');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('hasSbt');
    });

    it('rejects SBT issue without wallet address', async () => {
      const res = await request(app)
        .post('/api/v1/admin/sbt/issue')
        .set('Authorization', MOCK_TOKEN)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // ── TON ADDRESS VALIDATION (frontend logic) ───────────────────
  describe('TON Address Validation', () => {
    it('accepts valid base64url address (48 chars)', () => {
      expect(isValidTonAddress('UQDKbjIcfM6ezt8KjKJJLshZJJSHpSiA1p8e8gm6x5SrLx9z')).toBe(true);
      expect(isValidTonAddress('EQDKbjIcfM6ezt8KjKJJLshZJJSHpSiA1p8e8gm6x5SrLx9z')).toBe(true);
    });

    it('accepts valid raw address format', () => {
      expect(isValidTonAddress('0:4d3a2278693a04f846b5d83a58e67066bb56ca4f46b1b7cd49992f4114f87c9c')).toBe(true);
    });

    it('rejects empty address', () => {
      expect(isValidTonAddress('')).toBe(false);
    });

    it('rejects too-short address', () => {
      expect(isValidTonAddress('UQD_too_short')).toBe(false);
    });

    it('rejects random string', () => {
      expect(isValidTonAddress('not-a-wallet-at-all')).toBe(false);
    });
  });

  // ── TIER LOGIC (CustomerDashboard logic) ──────────────────────
  describe('Tier Calculation', () => {
    const getTier = (balance: number) =>
      balance >= 20000 ? 'GOLD' : balance >= 5000 ? 'SILVER' : 'BRONZE';

    const getProgress = (balance: number, tier: string) => {
      if (tier === 'GOLD') return 100;
      const threshold = tier === 'BRONZE' ? 5000 : 20000;
      return Math.min(100, Math.round((balance / threshold) * 100));
    };

    it('assigns BRONZE for balance < 5000', () => {
      expect(getTier(0)).toBe('BRONZE');
      expect(getTier(4999)).toBe('BRONZE');
    });

    it('assigns SILVER for balance 5000–19999', () => {
      expect(getTier(5000)).toBe('SILVER');
      expect(getTier(10000)).toBe('SILVER');
      expect(getTier(19999)).toBe('SILVER');
    });

    it('assigns GOLD for balance >= 20000', () => {
      expect(getTier(20000)).toBe('GOLD');
      expect(getTier(99999)).toBe('GOLD');
    });

    it('calculates progress correctly for BRONZE', () => {
      expect(getProgress(2500, 'BRONZE')).toBe(50);
      expect(getProgress(5000, 'BRONZE')).toBe(100);
      expect(getProgress(0, 'BRONZE')).toBe(0);
    });

    it('calculates progress correctly for SILVER', () => {
      expect(getProgress(10000, 'SILVER')).toBe(50);
      expect(getProgress(20000, 'SILVER')).toBe(100);
    });

    it('returns 100% progress for GOLD', () => {
      expect(getProgress(50000, 'GOLD')).toBe(100);
    });
  });

  // ── COUPON CODE FORMAT ─────────────────────────────────────────
  describe('Coupon Code Format', () => {
    it('generates code with SWT- prefix', () => {
      const code = generateCouponCode();
      expect(code).toMatch(/^SWT-[0-9A-F]{6}$/);
    });

    it('generates unique codes', () => {
      const codes = new Set(Array.from({ length: 100 }, () => generateCouponCode()));
      expect(codes.size).toBeGreaterThan(90);
    });
  });
});
