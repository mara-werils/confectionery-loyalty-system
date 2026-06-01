import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PARTNERS = [
  { companyName: 'Home Macaron', tier: 'GOLD' as const, wallet: 'UQDemoHomeMacaronWallet000000000000000000aaa' },
  { companyName: 'Qulpynai', tier: 'SILVER' as const, wallet: 'UQDemoQulpynaiWallet000000000000000000000bbb' },
  { companyName: 'Panaderia', tier: 'SILVER' as const, wallet: 'UQDemoPanaderiaWallet000000000000000000000cc' },
  { companyName: 'Marrone Rosso', tier: 'BRONZE' as const, wallet: 'UQDemoMarroneRossoWallet00000000000000000dd' },
  { companyName: 'TapTatti', tier: 'GOLD' as const, wallet: 'UQDemoTapTattiWallet00000000000000000000eee' },
  { companyName: 'CakeLab Astana', tier: 'BRONZE' as const, wallet: 'UQDemoCakeLabWallet0000000000000000000000ff' },
];

const REWARDS = [
  { title: 'Free Espresso', description: 'Complimentary espresso or americano', pointsRequired: 80, category: 'PRODUCT' as const },
  { title: '10% Discount on Macarons', description: 'Save 10% on any macaron set', pointsRequired: 100, category: 'DISCOUNT' as const },
  { title: 'Free Croissant', description: 'Fresh artisan croissant', pointsRequired: 180, category: 'PRODUCT' as const },
  { title: 'Free Samsa', description: 'Samsa with any drink purchase', pointsRequired: 200, category: 'PRODUCT' as const },
  { title: '20% off Artisan Bread', description: 'Discount on sourdough bread', pointsRequired: 300, category: 'DISCOUNT' as const },
  { title: '2-for-1 Cakes', description: 'Buy one slice, get one free', pointsRequired: 400, category: 'SPECIAL' as const },
  { title: '+5% Cashback Boost', description: 'Extra cashback on next purchase', pointsRequired: 500, category: 'CASHBACK' as const },
];

const ACHIEVEMENTS = [
  { code: 'FIRST_PURCHASE', name: 'First Purchase', description: 'Complete your first transaction', category: 'transactions', requirement: 1, points: 50 },
  { code: 'TRANSACTIONS_10', name: '10 Transactions', description: 'Complete 10 transactions', category: 'transactions', requirement: 10, points: 200 },
  { code: 'TRANSACTIONS_100', name: '100 Transactions', description: 'Complete 100 transactions', category: 'transactions', requirement: 100, points: 1000 },
  { code: 'REFERRER_5', name: 'Networker', description: 'Refer 5 partners', category: 'referrals', requirement: 5, points: 300 },
  { code: 'REFERRER_20', name: 'Ambassador', description: 'Refer 20 partners', category: 'referrals', requirement: 20, points: 1000 },
  { code: 'POINTS_10000', name: 'Point Collector', description: 'Earn 10,000 lifetime points', category: 'spending', requirement: 10000, points: 500 },
  { code: 'POINTS_100000', name: 'Whale', description: 'Earn 100,000 lifetime points', category: 'spending', requirement: 100000, points: 2000 },
  { code: 'TIER_SILVER', name: 'Silver Member', description: 'Reach Silver tier', category: 'general', requirement: 1, points: 100 },
  { code: 'TIER_GOLD', name: 'Gold Member', description: 'Reach Gold tier', category: 'general', requirement: 1, points: 250 },
];

function randomDate(daysBack: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
  return d;
}

async function main() {
  console.log('Seeding demo data...');

  // Seed achievements
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      update: {},
      create: a,
    });
  }
  console.log(`  ${ACHIEVEMENTS.length} achievements`);

  // Seed rewards
  for (const r of REWARDS) {
    const existing = await prisma.reward.findFirst({ where: { title: r.title } });
    if (!existing) {
      await prisma.reward.create({
        data: { ...r, available: 100 + Math.floor(Math.random() * 500), isActive: true },
      });
    }
  }
  console.log(`  ${REWARDS.length} rewards`);

  // Seed partners
  const partnerIds: string[] = [];
  for (const p of PARTNERS) {
    const partner = await prisma.partner.upsert({
      where: { walletAddress: p.wallet },
      update: { tier: p.tier },
      create: {
        walletAddress: p.wallet,
        companyName: p.companyName,
        tier: p.tier,
        status: 'ACTIVE',
      },
    });
    partnerIds.push(partner.id);

    // Ensure loyalty points exist
    await prisma.loyaltyPoints.upsert({
      where: { partnerId: partner.id },
      update: {},
      create: { partnerId: partner.id, balance: 0n, lifetimeEarned: 0n },
    });
  }
  console.log(`  ${PARTNERS.length} partners`);

  // Seed transactions (200+)
  let txCount = 0;
  for (const partnerId of partnerIds) {
    const count = 25 + Math.floor(Math.random() * 30);
    let totalEarned = 0n;
    for (let i = 0; i < count; i++) {
      const amount = 500 + Math.floor(Math.random() * 9500); // 500-10000 KZT
      const earned = Math.floor(amount * 0.1);
      totalEarned += BigInt(earned);
      await prisma.transaction.create({
        data: {
          partnerId,
          amount: BigInt(amount),
          pointsEarned: earned,
          type: ['PURCHASE', 'PURCHASE', 'PURCHASE', 'BONUS', 'REFERRAL'][Math.floor(Math.random() * 5)] as 'PURCHASE' | 'BONUS' | 'REFERRAL',
          description: `Demo transaction ${amount} KZT`,
          createdAt: randomDate(90),
        },
      });
      txCount++;
    }
    // Update balance
    await prisma.loyaltyPoints.update({
      where: { partnerId },
      data: { balance: totalEarned, lifetimeEarned: totalEarned },
    });
  }
  console.log(`  ${txCount} transactions`);

  // Seed achievement progress
  const achievements = await prisma.achievement.findMany();
  for (const partnerId of partnerIds) {
    for (const a of achievements) {
      const isUnlocked = Math.random() > 0.6;
      const progress = isUnlocked ? a.requirement : Math.floor(Math.random() * a.requirement);
      await prisma.partnerAchievement.upsert({
        where: { partnerId_achievementId: { partnerId, achievementId: a.id } },
        update: { progress },
        create: {
          partnerId,
          achievementId: a.id,
          progress,
          ...(isUnlocked ? { unlockedAt: randomDate(30) } : {}),
        },
      });
    }
  }
  console.log('  Achievement progress seeded');

  // Seed system settings
  await prisma.systemSetting.upsert({
    where: { key: 'cashback_rate' },
    update: {},
    create: { key: 'cashback_rate', value: '0.10', type: 'number' },
  });
  await prisma.systemSetting.upsert({
    where: { key: 'platform_name' },
    update: {},
    create: { key: 'platform_name', value: 'Sweet Loyalty', type: 'string' },
  });
  console.log('  System settings seeded');

  console.log('Demo seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
