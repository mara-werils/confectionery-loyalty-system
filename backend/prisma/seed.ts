import { PrismaClient, PartnerTier, RewardCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample rewards
  const rewards = await Promise.all([
    prisma.reward.create({
      data: {
        title: '10% Discount',
        description: 'Get 10% off your next order',
        pointsRequired: 100n,
        category: RewardCategory.DISCOUNT,
        available: 1000,
        maxClaims: 0,
        isActive: true,
      },
    }),
    prisma.reward.create({
      data: {
        title: 'Free Cake Slice',
        description: 'Redeem for a free slice of any cake',
        pointsRequired: 250n,
        category: RewardCategory.PRODUCT,
        available: 100,
        maxClaims: 100,
        isActive: true,
      },
    }),
    prisma.reward.create({
      data: {
        title: '5% Cashback',
        description: 'Get 5% cashback on your next purchase',
        pointsRequired: 500n,
        category: RewardCategory.CASHBACK,
        available: 500,
        maxClaims: 0,
        isActive: true,
      },
    }),
    prisma.reward.create({
      data: {
        title: 'VIP Tasting Event',
        description: 'Exclusive access to our VIP tasting event',
        pointsRequired: 1000n,
        category: RewardCategory.SPECIAL,
        available: 50,
        maxClaims: 50,
        isActive: true,
      },
    }),
    prisma.reward.create({
      data: {
        title: '25% Discount',
        description: 'Get 25% off your next order',
        pointsRequired: 300n,
        category: RewardCategory.DISCOUNT,
        available: 500,
        maxClaims: 0,
        isActive: true,
      },
    }),
    prisma.reward.create({
      data: {
        title: 'Free Box of Chocolates',
        description: 'Redeem for a premium box of chocolates',
        pointsRequired: 750n,
        category: RewardCategory.PRODUCT,
        available: 200,
        maxClaims: 200,
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${rewards.length} rewards`);

  // Create system settings
  const settings = await Promise.all([
    prisma.systemSetting.create({
      data: {
        key: 'points_per_kzt',
        value: '1',
        type: 'number',
      },
    }),
    prisma.systemSetting.create({
      data: {
        key: 'min_redemption_points',
        value: '100',
        type: 'number',
      },
    }),
    prisma.systemSetting.create({
      data: {
        key: 'bronze_multiplier',
        value: '1.0',
        type: 'number',
      },
    }),
    prisma.systemSetting.create({
      data: {
        key: 'silver_multiplier',
        value: '1.5',
        type: 'number',
      },
    }),
    prisma.systemSetting.create({
      data: {
        key: 'gold_multiplier',
        value: '2.0',
        type: 'number',
      },
    }),
  ]);

  console.log(`✅ Created ${settings.length} system settings`);

  // Create a sample admin (for testing)
  const admin = await prisma.admin.create({
    data: {
      walletAddress: 'EQD__________SAMPLE_ADMIN_WALLET__________',
      name: 'System Admin',
      role: 'superadmin',
      isActive: true,
    },
  });

  console.log(`✅ Created admin: ${admin.name}`);

  console.log('\n🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




