import { PrismaClient, RewardCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Rewards (IDs match frontend hardcoded data) ───────────────
  const rewardData = [
    // Home Macaron
    { id: 'hm-1', title: '10% Discount on Macarons',    description: 'Get 10% off any macaron set at Home Macaron',          pointsRequired: 100n,  category: RewardCategory.DISCOUNT, available: 999 },
    { id: 'hm-2', title: 'Free Box of 6 Macarons',       description: 'Redeem for a free box of 6 assorted macarons',         pointsRequired: 350n,  category: RewardCategory.PRODUCT,  available: 50  },
    // Qulpynai
    { id: 'ql-1', title: '15% Discount on Pastries',     description: '15% off any pastry at any Qulpynai location',          pointsRequired: 150n,  category: RewardCategory.DISCOUNT, available: 500 },
    { id: 'ql-2', title: 'Free Samsa',                   description: 'Get a free samsa with any drink purchase',             pointsRequired: 200n,  category: RewardCategory.PRODUCT,  available: 100 },
    // Panaderia
    { id: 'pn-1', title: 'Free Croissant',               description: 'A fresh Spanish-style croissant on the house',        pointsRequired: 180n,  category: RewardCategory.PRODUCT,  available: 200 },
    { id: 'pn-2', title: '20% off Artisan Bread',        description: '20% discount on any artisan sourdough bread',         pointsRequired: 300n,  category: RewardCategory.DISCOUNT, available: 80  },
    // Marrone Rosso
    { id: 'mr-1', title: 'Free Espresso',                description: 'Enjoy a free espresso or americano at Marrone Rosso', pointsRequired: 80n,   category: RewardCategory.PRODUCT,  available: 300 },
    { id: 'mr-2', title: '2-for-1 Cakes',                description: 'Buy one cake slice, get one free',                    pointsRequired: 400n,  category: RewardCategory.SPECIAL,  available: 50  },
    // TapTatti
    { id: 'tt-1', title: '25% off Custom Cakes',         description: '25% discount on any custom-order cake with delivery', pointsRequired: 500n,  category: RewardCategory.DISCOUNT, available: 100 },
    { id: 'tt-2', title: 'Free Delivery',                description: 'Free delivery anywhere in Kazakhstan',                pointsRequired: 250n,  category: RewardCategory.SPECIAL,  available: 300 },
    // Platform-wide
    { id: 'pw-1', title: '+5% Cashback Boost',           description: 'Get 5% extra cashback on your next purchase',         pointsRequired: 500n,  category: RewardCategory.CASHBACK, available: 999 },
  ];

  let created = 0;
  let skipped = 0;
  for (const r of rewardData) {
    const exists = await prisma.reward.findUnique({ where: { id: r.id } });
    if (exists) { skipped++; continue; }
    await prisma.reward.create({ data: { ...r, isActive: true, maxClaims: 0 } });
    created++;
  }
  console.log(`✅ Rewards: ${created} created, ${skipped} already existed`);

  // ── System settings (upsert — safe to re-run) ─────────────────
  const settings = [
    { key: 'points_per_kzt',        value: '1',   type: 'number' },
    { key: 'min_redemption_points', value: '80',  type: 'number' },
    { key: 'bronze_multiplier',     value: '1.0', type: 'number' },
    { key: 'silver_multiplier',     value: '1.5', type: 'number' },
    { key: 'gold_multiplier',       value: '2.0', type: 'number' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where:  { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`✅ System settings upserted`);

  // ── Admin (upsert) ────────────────────────────────────────────
  await prisma.admin.upsert({
    where:  { walletAddress: 'EQD__________SAMPLE_ADMIN_WALLET__________' },
    update: {},
    create: {
      walletAddress: 'EQD__________SAMPLE_ADMIN_WALLET__________',
      name: 'System Admin',
      role: 'superadmin',
      isActive: true,
    },
  });
  console.log(`✅ Admin upserted`);

  console.log('\n🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
