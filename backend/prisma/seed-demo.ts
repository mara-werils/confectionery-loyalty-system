/**
 * Demo Seed Script — Confectionery Loyalty System
 * Populates the database with rich, realistic data for a live university committee demo.
 * Idempotent: safe to run multiple times.
 *
 * Run:  npx tsx prisma/seed-demo.ts
 *  or   npm run db:seed:demo  (from /backend)
 */

import {
  PrismaClient,
  PartnerTier,
  PartnerStatus,
  TransactionType,
  RewardCategory,
  ClaimStatus,
  CouponStatus,
  PayoutStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a Date randomly within the last `daysBack` days */
function daysAgo(maxDays: number, minDays = 0): Date {
  const d = new Date();
  const offset = minDays + Math.floor(Math.random() * (maxDays - minDays));
  d.setDate(d.getDate() - offset);
  d.setHours(8 + Math.floor(Math.random() * 13), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

/** Returns a Date exactly `n` days ago */
function exactDaysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

/** Pick a random element from an array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate a realistic-looking TON wallet address (48 chars, starts with EQ or UQ) */
function tonAddress(prefix: 'EQ' | 'UQ', seed: string): string {
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  // Use seed to create a deterministic but varied fill
  let fill = seed.padEnd(46, '0').replace(/[^A-Za-z0-9\-_]/g, 'A');
  // Trim or pad to exactly 46 chars (prefix takes 2, total = 48)
  fill = fill.slice(0, 46);
  while (fill.length < 46) fill += base64Chars[fill.length % base64Chars.length];
  return prefix + fill;
}

/** Generate a realistic fake TON tx hash (64 hex chars) */
function fakeTxHash(): string {
  const hex = '0123456789abcdef';
  return Array.from({ length: 64 }, () => hex[Math.floor(Math.random() * 16)]).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Static Data
// ─────────────────────────────────────────────────────────────────────────────

const PARTNERS_DEF = [
  {
    key: 'rakhat',
    companyName: 'Rakhat Sweets',
    email: 'info@rakhat-sweets.kz',
    phone: '+7 727 200-11-22',
    tier: PartnerTier.GOLD,
    wallet: tonAddress('EQ', 'RakhatSweetsAlmatyKazakhstan2024GoldTier'),
    referralCode: 'RAKHAT2024',
    description: 'Premium Kazakhstani confectionery brand. Famous for Rakhat chocolate and traditional sweets since 1942.',
    initialBalance: 48500n,
    lifetimeEarned: 62000n,
    lifetimeRedeemed: 13500n,
    joinedDaysAgo: 90,
  },
  {
    key: 'astana',
    companyName: 'Astana Patisserie',
    email: 'hello@astana-patisserie.kz',
    phone: '+7 717 300-22-33',
    tier: PartnerTier.GOLD,
    wallet: tonAddress('EQ', 'AstanaPatisserieNurSultanCapitalCity'),
    referralCode: 'ASTANA2024',
    description: 'Luxury patisserie in the heart of Astana. Specializing in French-Kazakh fusion pastries and celebration cakes.',
    initialBalance: 31200n,
    lifetimeEarned: 45000n,
    lifetimeRedeemed: 13800n,
    joinedDaysAgo: 75,
  },
  {
    key: 'almaty',
    companyName: 'Almaty Cakes',
    email: 'orders@almaty-cakes.kz',
    phone: '+7 727 400-33-44',
    tier: PartnerTier.SILVER,
    wallet: tonAddress('UQ', 'AlmatyCakesBakeryAlatauDistrictSilver'),
    referralCode: 'ALMATY2024',
    description: 'Family-owned bakery in Almaty crafting custom cakes for weddings, birthdays, and corporate events.',
    initialBalance: 18700n,
    lifetimeEarned: 24500n,
    lifetimeRedeemed: 5800n,
    joinedDaysAgo: 60,
  },
  {
    key: 'sultan',
    companyName: 'Sultan Baursak',
    email: 'contact@sultan-baursak.kz',
    phone: '+7 701 500-44-55',
    tier: PartnerTier.SILVER,
    wallet: tonAddress('UQ', 'SultanBaursaqTraditionalKazakhPastry'),
    referralCode: 'SULTAN2024',
    description: 'Traditional Kazakh pastry house. Authentic baursak, shelpek, and national sweets prepared with love.',
    initialBalance: 12400n,
    lifetimeEarned: 16000n,
    lifetimeRedeemed: 3600n,
    joinedDaysAgo: 45,
  },
  {
    key: 'nomad',
    companyName: 'Nomad Confectionery',
    email: 'hi@nomad-confectionery.kz',
    phone: '+7 702 600-55-66',
    tier: PartnerTier.BRONZE,
    wallet: tonAddress('UQ', 'NomadConfectioneryStartupBronzeTier'),
    referralCode: 'NOMAD2024',
    description: 'Young artisan confectionery inspired by the Kazakh steppe. Handmade chocolates and seasonal desserts.',
    initialBalance: 5800n,
    lifetimeEarned: 7200n,
    lifetimeRedeemed: 1400n,
    joinedDaysAgo: 30,
  },
  {
    key: 'cakelab',
    companyName: 'CakeLab Astana',
    email: 'studio@cakelab-astana.kz',
    phone: '+7 717 700-66-77',
    tier: PartnerTier.BRONZE,
    wallet: tonAddress('UQ', 'CakeLabAstanaNovemberStartBronzeNew'),
    referralCode: 'CAKELAB24',
    description: 'Modern cake studio offering 3D cakes, dessert tables, and custom sugar art for any occasion.',
    initialBalance: 2900n,
    lifetimeEarned: 3500n,
    lifetimeRedeemed: 600n,
    joinedDaysAgo: 20,
  },
];

const REWARDS_DEF = [
  {
    key: 'napoleon_disc',
    title: '10% off Napoleon Cake',
    description: 'Get 10% off our classic Napoleon layered cake. Valid on any size.',
    pointsRequired: 500n,
    category: RewardCategory.DISCOUNT,
    available: 200,
    maxClaims: 0,
    totalClaimed: 38,
  },
  {
    key: 'eclair_free',
    title: 'Free Eclair Set (Box of 4)',
    description: 'Redeem for a complimentary set of 4 assorted eclairs — chocolate, vanilla, caramel, and pistachio.',
    pointsRequired: 1000n,
    category: RewardCategory.PRODUCT,
    available: 80,
    maxClaims: 200,
    totalClaimed: 21,
  },
  {
    key: 'cashback_5k',
    title: '5% Cashback on orders over 5,000 KZT',
    description: 'Receive 5% cashback in loyalty points on any single order exceeding 5,000 KZT.',
    pointsRequired: 300n,
    category: RewardCategory.CASHBACK,
    available: 999,
    maxClaims: 0,
    totalClaimed: 64,
  },
  {
    key: 'bday_upgrade',
    title: 'Birthday Cake Upgrade',
    description: 'Upgrade any standard birthday cake to a premium 3-tier design at no extra cost.',
    pointsRequired: 2000n,
    category: RewardCategory.SPECIAL,
    available: 30,
    maxClaims: 100,
    totalClaimed: 9,
  },
  {
    key: 'coffee_pastry',
    title: 'Free Coffee with Any Pastry',
    description: 'Enjoy a complimentary Americano or Latte when you purchase any pastry item.',
    pointsRequired: 200n,
    category: RewardCategory.PRODUCT,
    available: 500,
    maxClaims: 0,
    totalClaimed: 112,
  },
  {
    key: 'macaron_10',
    title: '10% Discount on Macarons',
    description: 'Save 10% on any macaron set. Mix and match your favourite flavours.',
    pointsRequired: 100n,
    category: RewardCategory.DISCOUNT,
    available: 999,
    maxClaims: 0,
    totalClaimed: 87,
  },
  {
    key: 'free_samsa',
    title: 'Free Samsa with Drink',
    description: 'Get a free traditional samsa with any hot drink purchase.',
    pointsRequired: 250n,
    category: RewardCategory.PRODUCT,
    available: 150,
    maxClaims: 500,
    totalClaimed: 43,
  },
  {
    key: 'cashback_boost',
    title: '+5% Cashback Boost (Next Purchase)',
    description: 'Activate a one-time 5% extra cashback multiplier on your very next transaction.',
    pointsRequired: 500n,
    category: RewardCategory.CASHBACK,
    available: 999,
    maxClaims: 0,
    totalClaimed: 29,
  },
  {
    key: 'baursak_box',
    title: 'Free Baursak Gift Box',
    description: 'Traditional Kazakh baursak assortment — plain, honey-glazed, and savoury — in a festive gift box.',
    pointsRequired: 750n,
    category: RewardCategory.PRODUCT,
    available: 60,
    maxClaims: 150,
    totalClaimed: 17,
  },
  {
    key: 'vip_tasting',
    title: 'VIP Tasting Session',
    description: 'Exclusive 1-hour tasting event at Rakhat Sweets HQ. Includes 5 premium chocolate varieties.',
    pointsRequired: 5000n,
    category: RewardCategory.SPECIAL,
    available: 10,
    maxClaims: 50,
    totalClaimed: 3,
  },
];

const ACHIEVEMENTS_DEF = [
  {
    code: 'FIRST_PURCHASE',
    name: 'First Purchase',
    description: 'Complete your very first transaction on the platform.',
    category: 'transactions',
    requirement: 1,
    points: 50,
  },
  {
    code: 'LOYAL_10',
    name: 'Loyal Customer',
    description: 'Complete 10 transactions. A true regular!',
    category: 'transactions',
    requirement: 10,
    points: 200,
  },
  {
    code: 'TRANSACTIONS_50',
    name: 'Power Buyer',
    description: 'Complete 50 transactions. You really love sweets!',
    category: 'transactions',
    requirement: 50,
    points: 500,
  },
  {
    code: 'SWEET_EXPLORER',
    name: 'Sweet Explorer',
    description: 'Make purchases at 3 different partner confectioneries.',
    category: 'general',
    requirement: 3,
    points: 300,
  },
  {
    code: 'REFERRAL_CHAMPION',
    name: 'Referral Champion',
    description: 'Successfully refer 5 new partners to the platform.',
    category: 'referrals',
    requirement: 5,
    points: 750,
  },
  {
    code: 'POINTS_10000',
    name: 'Point Collector',
    description: 'Earn 10,000 lifetime loyalty points.',
    category: 'spending',
    requirement: 10000,
    points: 500,
  },
  {
    code: 'POINTS_50000',
    name: 'Sweet Fortune',
    description: 'Earn 50,000 lifetime loyalty points.',
    category: 'spending',
    requirement: 50000,
    points: 1500,
  },
  {
    code: 'TIER_SILVER',
    name: 'Silver Member',
    description: 'Reach the Silver partner tier.',
    category: 'general',
    requirement: 1,
    points: 100,
  },
  {
    code: 'TIER_GOLD',
    name: 'Gold Member',
    description: 'Reach the prestigious Gold partner tier.',
    category: 'general',
    requirement: 1,
    points: 250,
  },
  {
    code: 'STREAK_7',
    name: 'Week Warrior',
    description: 'Check in 7 days in a row.',
    category: 'engagement',
    requirement: 7,
    points: 150,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Starting comprehensive demo seed...\n');

  // ── 1. Admin ──────────────────────────────────────────────────────────────
  await prisma.admin.upsert({
    where: { walletAddress: 'EQAdminSuperWalletDiplomaProjectAITU2024Kazakhstan' },
    update: { lastLoginAt: new Date() },
    create: {
      walletAddress: 'EQAdminSuperWalletDiplomaProjectAITU2024Kazakhstan',
      name: 'Platform Admin',
      role: 'superadmin',
      isActive: true,
      lastLoginAt: new Date(),
    },
  });
  console.log('  [1/10] Admin upserted');

  // ── 2. System Settings ────────────────────────────────────────────────────
  const settings = [
    { key: 'points_per_kzt',        value: '1',       type: 'number' },
    { key: 'min_redemption_points', value: '100',     type: 'number' },
    { key: 'bronze_multiplier',     value: '1.0',     type: 'number' },
    { key: 'silver_multiplier',     value: '1.5',     type: 'number' },
    { key: 'gold_multiplier',       value: '2.0',     type: 'number' },
    { key: 'cashback_rate',         value: '0.05',    type: 'number' },
    { key: 'platform_name',         value: 'SweetLoyalty', type: 'string' },
    { key: 'token_symbol',          value: 'SWEET',   type: 'string' },
    { key: 'spin_cooldown_hours',   value: '24',      type: 'number' },
    { key: 'checkin_bonus_base',    value: '10',      type: 'number' },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('  [2/10] System settings upserted');

  // ── 3. Achievements ───────────────────────────────────────────────────────
  const achievementIds: Record<string, string> = {};
  for (const a of ACHIEVEMENTS_DEF) {
    const result = await prisma.achievement.upsert({
      where: { code: a.code },
      update: { name: a.name, description: a.description, points: a.points },
      create: { ...a, isActive: true },
    });
    achievementIds[a.code] = result.id;
  }
  console.log(`  [3/10] ${ACHIEVEMENTS_DEF.length} achievements upserted`);

  // ── 4. Rewards ────────────────────────────────────────────────────────────
  const rewardIds: Record<string, string> = {};
  for (const r of REWARDS_DEF) {
    const existing = await prisma.reward.findFirst({ where: { title: r.title } });
    if (existing) {
      rewardIds[r.key] = existing.id;
      await prisma.reward.update({
        where: { id: existing.id },
        data: { totalClaimed: r.totalClaimed, isActive: true },
      });
    } else {
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1);
      const created = await prisma.reward.create({
        data: {
          title: r.title,
          description: r.description,
          pointsRequired: r.pointsRequired,
          category: r.category,
          available: r.available,
          maxClaims: r.maxClaims,
          totalClaimed: r.totalClaimed,
          isActive: true,
          validFrom: new Date('2024-01-01'),
          validUntil,
        },
      });
      rewardIds[r.key] = created.id;
    }
  }
  console.log(`  [4/10] ${REWARDS_DEF.length} rewards seeded`);

  // ── 5. Partners + LoyaltyPoints ───────────────────────────────────────────
  const partnerIds: Record<string, string> = {};
  const partnerWallets: Record<string, string> = {};

  for (const p of PARTNERS_DEF) {
    const joinedAt = exactDaysAgo(p.joinedDaysAgo);
    const partner = await prisma.partner.upsert({
      where: { walletAddress: p.wallet },
      update: {
        tier: p.tier,
        status: PartnerStatus.ACTIVE,
        lastLoginAt: daysAgo(3),
      },
      create: {
        walletAddress: p.wallet,
        companyName: p.companyName,
        email: p.email,
        phone: p.phone,
        tier: p.tier,
        status: PartnerStatus.ACTIVE,
        referralCode: p.referralCode,
        createdAt: joinedAt,
        lastLoginAt: daysAgo(3),
      },
    });
    partnerIds[p.key] = partner.id;
    partnerWallets[p.key] = p.wallet;

    await prisma.loyaltyPoints.upsert({
      where: { partnerId: partner.id },
      update: {
        balance: p.initialBalance,
        lifetimeEarned: p.lifetimeEarned,
        lifetimeRedeemed: p.lifetimeRedeemed,
      },
      create: {
        partnerId: partner.id,
        balance: p.initialBalance,
        lifetimeEarned: p.lifetimeEarned,
        lifetimeRedeemed: p.lifetimeRedeemed,
      },
    });
  }

  // Set referral relationships: astana was referred by rakhat, nomad by almaty
  await prisma.partner.update({
    where: { id: partnerIds['astana'] },
    data: { referredById: partnerIds['rakhat'] },
  });
  await prisma.partner.update({
    where: { id: partnerIds['nomad'] },
    data: { referredById: partnerIds['almaty'] },
  });
  await prisma.partner.update({
    where: { id: partnerIds['cakelab'] },
    data: { referredById: partnerIds['sultan'] },
  });

  console.log(`  [5/10] ${PARTNERS_DEF.length} partners + loyalty points upserted`);

  // ── 6. Transactions ───────────────────────────────────────────────────────
  // Check how many transactions already exist to avoid duplicating
  const existingTxCount = await prisma.transaction.count();

  if (existingTxCount < 15) {
    const txDescriptions: Record<string, string[]> = {
      rakhat: [
        'Corporate chocolate order 10kg', 'Wedding candy buffet setup',
        'Retail store daily sales', 'Holiday gift box promotion',
        'Online order — Napoleon + medovik', 'Bulk order for Nauryz event',
        'B2B supply to hotel chain', 'Festive macaron tower order',
      ],
      astana: [
        'Patisserie daily revenue', 'Custom wedding cake — 4 tier',
        'Corporate catering order', 'Tasting event sales',
        'Mille-feuille weekend special', 'Croissant morning batch',
        'Online delivery — capital district',
      ],
      almaty: [
        'Birthday cake custom order', 'Graduation cake delivery',
        'Cupcake batch — Saturday market', 'New year cake pre-orders',
        'Wedding consultation deposit', 'Retail daily sales',
      ],
      sultan: [
        'Baursak bulk order — restaurant', 'Nauryz traditional sweets',
        'Shelpek morning batch', 'Catering order — corporate lunch',
        'Online order — national sweets box',
      ],
      nomad: [
        'Artisan chocolate tasting kit', 'Steppe honey truffle set',
        'First week sales — launch promo', 'Corporate gift order',
      ],
      cakelab: [
        '3D cake — tech startup launch', 'Dessert table — birthday party',
        'First order — new client', 'Sugar art workshop revenue',
      ],
    };

    const txTypeWeights: TransactionType[] = [
      TransactionType.PURCHASE, TransactionType.PURCHASE, TransactionType.PURCHASE,
      TransactionType.PURCHASE, TransactionType.PURCHASE,
      TransactionType.BONUS, TransactionType.BONUS,
      TransactionType.REFERRAL,
      TransactionType.PROMOTION,
    ];

    // Spread of transactions per partner
    const txCounts: Record<string, number> = {
      rakhat: 28, astana: 22, almaty: 16, sultan: 12, nomad: 7, cakelab: 5,
    };

    let totalTxCreated = 0;
    for (const [key, count] of Object.entries(txCounts)) {
      const partnerId = partnerIds[key];
      const daysJoined = PARTNERS_DEF.find(p => p.key === key)!.joinedDaysAgo;
      const descs = txDescriptions[key] ?? ['Platform transaction'];

      for (let i = 0; i < count; i++) {
        const type = pick(txTypeWeights);
        const amountKZT = 1000 + Math.floor(Math.random() * 14000); // 1000–15000 KZT
        const multiplier = key === 'rakhat' || key === 'astana' ? 2.0
          : key === 'almaty' || key === 'sultan' ? 1.5 : 1.0;
        const pointsEarned = BigInt(Math.floor(amountKZT * multiplier * 0.1));
        const withHash = Math.random() > 0.35; // ~65% have an on-chain tx hash

        await prisma.transaction.create({
          data: {
            partnerId,
            amount: BigInt(amountKZT),
            pointsEarned,
            type,
            description: pick(descs),
            txHash: withHash ? fakeTxHash() : null,
            blockNumber: withHash ? BigInt(30000000 + Math.floor(Math.random() * 5000000)) : null,
            createdAt: daysAgo(daysJoined, 0),
          },
        });
        totalTxCreated++;
      }
    }
    console.log(`  [6/10] ${totalTxCreated} transactions created`);
  } else {
    console.log(`  [6/10] Transactions already exist (${existingTxCount}), skipping`);
  }

  // ── 7. Claimed Rewards + Coupons ──────────────────────────────────────────
  // Rakhat has claimed multiple rewards (active power user)
  const claimedDefs = [
    {
      partnerKey: 'rakhat',
      rewardKey: 'napoleon_disc',
      points: 500n,
      status: ClaimStatus.FULFILLED,
      processedDaysAgo: 5,
      couponStatus: CouponStatus.REDEEMED,
      couponCode: 'RAKHAT-NAPO-2024-0001',
    },
    {
      partnerKey: 'rakhat',
      rewardKey: 'vip_tasting',
      points: 5000n,
      status: ClaimStatus.APPROVED,
      processedDaysAgo: 2,
      couponStatus: CouponStatus.ACTIVE,
      couponCode: 'RAKHAT-VIP-2024-0002',
    },
    {
      partnerKey: 'astana',
      rewardKey: 'bday_upgrade',
      points: 2000n,
      status: ClaimStatus.FULFILLED,
      processedDaysAgo: 10,
      couponStatus: CouponStatus.REDEEMED,
      couponCode: 'ASTANA-BDAY-2024-0001',
    },
    {
      partnerKey: 'almaty',
      rewardKey: 'coffee_pastry',
      points: 200n,
      status: ClaimStatus.FULFILLED,
      processedDaysAgo: 7,
      couponStatus: CouponStatus.REDEEMED,
      couponCode: 'ALMATY-CAFE-2024-0001',
    },
    {
      partnerKey: 'almaty',
      rewardKey: 'eclair_free',
      points: 1000n,
      status: ClaimStatus.PENDING,
      processedDaysAgo: null,
      couponStatus: CouponStatus.ACTIVE,
      couponCode: 'ALMATY-ECLA-2024-0002',
    },
    {
      partnerKey: 'sultan',
      rewardKey: 'cashback_5k',
      points: 300n,
      status: ClaimStatus.APPROVED,
      processedDaysAgo: 3,
      couponStatus: CouponStatus.ACTIVE,
      couponCode: 'SULTAN-CASH-2024-0001',
    },
  ];

  let claimedCount = 0;
  let couponCount = 0;
  for (const def of claimedDefs) {
    const partnerId = partnerIds[def.partnerKey];
    const rewardId = rewardIds[def.rewardKey];
    if (!partnerId || !rewardId) continue;

    // Check if coupon code already exists
    const existingCoupon = await prisma.coupon.findUnique({ where: { code: def.couponCode } });
    if (existingCoupon) continue;

    // ClaimedReward
    const processedAt = def.processedDaysAgo !== null ? exactDaysAgo(def.processedDaysAgo) : null;
    const claimedAt = exactDaysAgo((def.processedDaysAgo ?? 0) + 2);
    const claimed = await prisma.claimedReward.create({
      data: {
        partnerId,
        rewardId,
        pointsSpent: def.points,
        status: def.status,
        processedAt,
        processedBy: def.status !== ClaimStatus.PENDING ? 'Platform Admin' : null,
        txHash: def.status === ClaimStatus.FULFILLED ? fakeTxHash() : null,
        createdAt: claimedAt,
      },
    });
    claimedCount++;

    // Coupon
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 3);
    const rewardDef = REWARDS_DEF.find(r => r.key === def.rewardKey)!;
    const partnerDef = PARTNERS_DEF.find(p => p.key === def.partnerKey)!;

    await prisma.coupon.create({
      data: {
        code: def.couponCode,
        partnerId,
        rewardId,
        pointsSpent: def.points,
        status: def.couponStatus,
        partnerName: partnerDef.companyName,
        rewardTitle: rewardDef.title,
        expiresAt,
        redeemedAt: def.couponStatus === CouponStatus.REDEEMED ? processedAt : null,
        createdAt: claimedAt,
      },
    });
    couponCount++;
  }
  console.log(`  [7/10] ${claimedCount} claimed rewards, ${couponCount} coupons created`);

  // ── 8. Partner Achievements ───────────────────────────────────────────────
  // Story: Rakhat (GOLD) has many achievements; newer partners have fewer
  const partnerAchievementDefs: Array<{
    partnerKey: string;
    code: string;
    progress: number;
    unlocked: boolean;
    daysAgoUnlocked?: number;
  }> = [
    // Rakhat — top performer
    { partnerKey: 'rakhat', code: 'FIRST_PURCHASE',    progress: 1,     unlocked: true, daysAgoUnlocked: 88 },
    { partnerKey: 'rakhat', code: 'LOYAL_10',          progress: 10,    unlocked: true, daysAgoUnlocked: 70 },
    { partnerKey: 'rakhat', code: 'TRANSACTIONS_50',   progress: 50,    unlocked: true, daysAgoUnlocked: 40 },
    { partnerKey: 'rakhat', code: 'SWEET_EXPLORER',    progress: 3,     unlocked: true, daysAgoUnlocked: 60 },
    { partnerKey: 'rakhat', code: 'REFERRAL_CHAMPION', progress: 5,     unlocked: true, daysAgoUnlocked: 30 },
    { partnerKey: 'rakhat', code: 'POINTS_10000',      progress: 10000, unlocked: true, daysAgoUnlocked: 55 },
    { partnerKey: 'rakhat', code: 'POINTS_50000',      progress: 50000, unlocked: true, daysAgoUnlocked: 10 },
    { partnerKey: 'rakhat', code: 'TIER_GOLD',         progress: 1,     unlocked: true, daysAgoUnlocked: 45 },
    { partnerKey: 'rakhat', code: 'STREAK_7',          progress: 7,     unlocked: true, daysAgoUnlocked: 20 },
    // Astana — active Gold
    { partnerKey: 'astana', code: 'FIRST_PURCHASE',  progress: 1,     unlocked: true, daysAgoUnlocked: 73 },
    { partnerKey: 'astana', code: 'LOYAL_10',        progress: 10,    unlocked: true, daysAgoUnlocked: 55 },
    { partnerKey: 'astana', code: 'POINTS_10000',    progress: 10000, unlocked: true, daysAgoUnlocked: 40 },
    { partnerKey: 'astana', code: 'TIER_GOLD',       progress: 1,     unlocked: true, daysAgoUnlocked: 35 },
    { partnerKey: 'astana', code: 'TRANSACTIONS_50', progress: 22,    unlocked: false },
    { partnerKey: 'astana', code: 'STREAK_7',        progress: 4,     unlocked: false },
    // Almaty — silver, progressing
    { partnerKey: 'almaty', code: 'FIRST_PURCHASE',  progress: 1,     unlocked: true, daysAgoUnlocked: 58 },
    { partnerKey: 'almaty', code: 'LOYAL_10',        progress: 10,    unlocked: true, daysAgoUnlocked: 40 },
    { partnerKey: 'almaty', code: 'TIER_SILVER',     progress: 1,     unlocked: true, daysAgoUnlocked: 50 },
    { partnerKey: 'almaty', code: 'POINTS_10000',    progress: 8700,  unlocked: false },
    { partnerKey: 'almaty', code: 'SWEET_EXPLORER',  progress: 2,     unlocked: false },
    // Sultan — silver, mid-journey
    { partnerKey: 'sultan', code: 'FIRST_PURCHASE',  progress: 1,     unlocked: true, daysAgoUnlocked: 43 },
    { partnerKey: 'sultan', code: 'LOYAL_10',        progress: 10,    unlocked: true, daysAgoUnlocked: 28 },
    { partnerKey: 'sultan', code: 'TIER_SILVER',     progress: 1,     unlocked: true, daysAgoUnlocked: 38 },
    { partnerKey: 'sultan', code: 'POINTS_10000',    progress: 6200,  unlocked: false },
    // Nomad — bronze, just started
    { partnerKey: 'nomad', code: 'FIRST_PURCHASE',   progress: 1,     unlocked: true, daysAgoUnlocked: 28 },
    { partnerKey: 'nomad', code: 'LOYAL_10',         progress: 7,     unlocked: false },
    { partnerKey: 'nomad', code: 'POINTS_10000',     progress: 3600,  unlocked: false },
    // CakeLab — newest, just getting started
    { partnerKey: 'cakelab', code: 'FIRST_PURCHASE', progress: 1,     unlocked: true, daysAgoUnlocked: 18 },
    { partnerKey: 'cakelab', code: 'LOYAL_10',       progress: 3,     unlocked: false },
  ];

  let achCount = 0;
  for (const def of partnerAchievementDefs) {
    const partnerId = partnerIds[def.partnerKey];
    const achievementId = achievementIds[def.code];
    if (!partnerId || !achievementId) continue;

    await prisma.partnerAchievement.upsert({
      where: { partnerId_achievementId: { partnerId, achievementId } },
      update: { progress: def.progress, unlockedAt: def.unlocked ? exactDaysAgo(def.daysAgoUnlocked ?? 5) : null },
      create: {
        partnerId,
        achievementId,
        progress: def.progress,
        unlockedAt: def.unlocked ? exactDaysAgo(def.daysAgoUnlocked ?? 5) : null,
        nftTxHash: def.unlocked ? fakeTxHash() : null,
        createdAt: exactDaysAgo((def.daysAgoUnlocked ?? 0) + 1),
      },
    });
    achCount++;
  }
  console.log(`  [8/10] ${achCount} partner achievements seeded`);

  // ── 9. Spin History + Daily Check-ins ─────────────────────────────────────
  const existingSpins = await prisma.spinHistory.count();
  if (existingSpins < 5) {
    const spinData = [
      { partnerKey: 'rakhat', prizes: [100, 250, 50, 500, 100, 200, 150] },
      { partnerKey: 'astana', prizes: [200, 100, 300, 100, 250] },
      { partnerKey: 'almaty', prizes: [50, 100, 150, 100] },
      { partnerKey: 'sultan', prizes: [100, 200, 50] },
      { partnerKey: 'nomad',  prizes: [100, 50] },
      { partnerKey: 'cakelab', prizes: [100] },
    ];

    let spinCount = 0;
    for (const s of spinData) {
      const partnerId = partnerIds[s.partnerKey];
      const joinedDays = PARTNERS_DEF.find(p => p.key === s.partnerKey)!.joinedDaysAgo;
      for (let i = 0; i < s.prizes.length; i++) {
        await prisma.spinHistory.create({
          data: {
            partnerId,
            prize: s.prizes[i],
            createdAt: daysAgo(joinedDays - i, 0),
          },
        });
        spinCount++;
      }
    }
    console.log(`  [9a/10] ${spinCount} spin history entries created`);
  } else {
    console.log(`  [9a/10] Spin history already exists, skipping`);
  }

  const existingCheckins = await prisma.dailyCheckin.count();
  if (existingCheckins < 5) {
    const checkinData = [
      // Rakhat — 14-day streak history
      { partnerKey: 'rakhat', entries: [
        { daysAgo: 14, streak: 1,  bonus: 10 },
        { daysAgo: 13, streak: 2,  bonus: 10 },
        { daysAgo: 12, streak: 3,  bonus: 15 },
        { daysAgo: 11, streak: 4,  bonus: 15 },
        { daysAgo: 10, streak: 5,  bonus: 20 },
        { daysAgo: 9,  streak: 6,  bonus: 20 },
        { daysAgo: 8,  streak: 7,  bonus: 50 },
        { daysAgo: 6,  streak: 1,  bonus: 10 },
        { daysAgo: 5,  streak: 2,  bonus: 10 },
        { daysAgo: 4,  streak: 3,  bonus: 15 },
        { daysAgo: 3,  streak: 4,  bonus: 15 },
        { daysAgo: 2,  streak: 5,  bonus: 20 },
        { daysAgo: 1,  streak: 6,  bonus: 20 },
        { daysAgo: 0,  streak: 7,  bonus: 50 },
      ]},
      { partnerKey: 'astana', entries: [
        { daysAgo: 5, streak: 1, bonus: 10 },
        { daysAgo: 4, streak: 2, bonus: 10 },
        { daysAgo: 3, streak: 3, bonus: 15 },
        { daysAgo: 2, streak: 4, bonus: 15 },
        { daysAgo: 1, streak: 5, bonus: 20 },
        { daysAgo: 0, streak: 6, bonus: 20 },
      ]},
      { partnerKey: 'almaty', entries: [
        { daysAgo: 3, streak: 1, bonus: 10 },
        { daysAgo: 2, streak: 2, bonus: 10 },
        { daysAgo: 1, streak: 3, bonus: 15 },
      ]},
      { partnerKey: 'sultan', entries: [
        { daysAgo: 2, streak: 1, bonus: 10 },
        { daysAgo: 1, streak: 2, bonus: 10 },
        { daysAgo: 0, streak: 3, bonus: 15 },
      ]},
      { partnerKey: 'nomad', entries: [
        { daysAgo: 1, streak: 1, bonus: 10 },
        { daysAgo: 0, streak: 2, bonus: 10 },
      ]},
    ];

    let checkinTotal = 0;
    for (const c of checkinData) {
      const partnerId = partnerIds[c.partnerKey];
      for (const entry of c.entries) {
        const d = new Date();
        d.setDate(d.getDate() - entry.daysAgo);
        d.setHours(9, 0, 0, 0);
        await prisma.dailyCheckin.create({
          data: { partnerId, streak: entry.streak, bonus: entry.bonus, createdAt: d },
        });
        checkinTotal++;
      }
    }
    console.log(`  [9b/10] ${checkinTotal} daily check-in records created`);
  } else {
    console.log(`  [9b/10] Daily check-ins already exist, skipping`);
  }

  // ── 10. Token Gifts ───────────────────────────────────────────────────────
  const existingGifts = await prisma.tokenGift.count();
  if (existingGifts < 2) {
    const giftDefs = [
      {
        senderWallet: partnerWallets['rakhat'],
        receiverWallet: partnerWallets['nomad'],
        amount: 500,
        message: 'Welcome to the platform, Nomad! Enjoy these starter SWEET tokens.',
        createdAt: exactDaysAgo(25),
      },
      {
        senderWallet: partnerWallets['astana'],
        receiverWallet: partnerWallets['cakelab'],
        amount: 300,
        message: 'Happy to have you onboard, CakeLab team! A small gift from Astana Patisserie.',
        createdAt: exactDaysAgo(18),
      },
      {
        senderWallet: partnerWallets['almaty'],
        receiverWallet: partnerWallets['sultan'],
        amount: 200,
        message: 'Ramadan Mubarak from Almaty Cakes!',
        createdAt: exactDaysAgo(10),
      },
    ];

    for (const g of giftDefs) {
      await prisma.tokenGift.create({ data: g });
    }
    console.log(`  [10/10] ${giftDefs.length} token gifts created`);
  } else {
    console.log(`  [10/10] Token gifts already exist, skipping`);
  }

  // ── Commission Payouts ────────────────────────────────────────────────────
  const existingPayouts = await prisma.commissionPayout.count();
  if (existingPayouts < 2) {
    const payoutDefs = [
      {
        partnerId: partnerIds['rakhat'],
        amount: 15000000000n, // 15 TON in nanoTON
        tier: PartnerTier.GOLD,
        period: '2024-Q4',
        status: PayoutStatus.COMPLETED,
        txHash: fakeTxHash(),
        processedAt: exactDaysAgo(15),
        createdAt: exactDaysAgo(20),
      },
      {
        partnerId: partnerIds['astana'],
        amount: 9000000000n,
        tier: PartnerTier.GOLD,
        period: '2024-Q4',
        status: PayoutStatus.COMPLETED,
        txHash: fakeTxHash(),
        processedAt: exactDaysAgo(15),
        createdAt: exactDaysAgo(20),
      },
      {
        partnerId: partnerIds['almaty'],
        amount: 4500000000n,
        tier: PartnerTier.SILVER,
        period: '2024-Q4',
        status: PayoutStatus.PROCESSING,
        txHash: null,
        processedAt: null,
        createdAt: exactDaysAgo(5),
      },
      {
        partnerId: partnerIds['sultan'],
        amount: 3000000000n,
        tier: PartnerTier.SILVER,
        period: '2024-Q4',
        status: PayoutStatus.PENDING,
        txHash: null,
        processedAt: null,
        createdAt: exactDaysAgo(3),
      },
    ];

    for (const payout of payoutDefs) {
      await prisma.commissionPayout.create({ data: payout });
    }
    console.log(`  [+] ${payoutDefs.length} commission payouts created`);
  }

  // ── Audit Logs ────────────────────────────────────────────────────────────
  const existingLogs = await prisma.auditLog.count();
  if (existingLogs < 5) {
    const auditLogs = [
      {
        actorId: 'EQAdminSuperWalletDiplomaProjectAITU2024Kazakhstan',
        actorType: 'admin',
        action: 'APPROVE_CLAIM',
        entityType: 'claimed_reward',
        entityId: partnerIds['rakhat'],
        metadata: { reward: '10% off Napoleon Cake', points: 500 },
        createdAt: exactDaysAgo(5),
      },
      {
        actorId: 'EQAdminSuperWalletDiplomaProjectAITU2024Kazakhstan',
        actorType: 'admin',
        action: 'MINT_TOKENS',
        entityType: 'wallet',
        entityId: partnerWallets['rakhat'],
        metadata: { amount: 5000, token: 'SWEET' },
        createdAt: exactDaysAgo(10),
      },
      {
        actorId: 'EQAdminSuperWalletDiplomaProjectAITU2024Kazakhstan',
        actorType: 'admin',
        action: 'UPDATE_PARTNER',
        entityType: 'partner',
        entityId: partnerIds['astana'],
        metadata: { field: 'tier', from: 'SILVER', to: 'GOLD' },
        createdAt: exactDaysAgo(35),
      },
      {
        actorId: partnerWallets['rakhat'],
        actorType: 'partner',
        action: 'ISSUE_COUPON',
        entityType: 'coupon',
        entityId: 'RAKHAT-NAPO-2024-0001',
        metadata: { reward: '10% off Napoleon Cake' },
        createdAt: exactDaysAgo(7),
      },
      {
        actorId: 'EQAdminSuperWalletDiplomaProjectAITU2024Kazakhstan',
        actorType: 'admin',
        action: 'ISSUE_SBT',
        entityType: 'partner',
        entityId: partnerIds['rakhat'],
        metadata: { achievement: 'Gold Member', nftTier: 'GOLD' },
        createdAt: exactDaysAgo(45),
      },
    ];

    for (const log of auditLogs) {
      await prisma.auditLog.create({ data: log });
    }
    console.log(`  [+] ${auditLogs.length} audit log entries created`);
  }

  console.log('\nDemo seed completed successfully!');
  console.log('─'.repeat(50));
  console.log('Partners seeded:');
  for (const p of PARTNERS_DEF) {
    console.log(`  ${p.tier.padEnd(7)} | ${p.companyName.padEnd(22)} | ${p.wallet.slice(0, 20)}...`);
  }
  console.log('\nKey demo wallets for the committee presentation:');
  console.log(`  Rakhat Sweets  (GOLD):   ${PARTNERS_DEF[0].wallet}`);
  console.log(`  Astana Patisserie (GOLD): ${PARTNERS_DEF[1].wallet}`);
  console.log(`  Sultan Baursak (SILVER): ${PARTNERS_DEF[3].wallet}`);
  console.log('─'.repeat(50));
}

main()
  .catch((e) => {
    console.error('Demo seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
