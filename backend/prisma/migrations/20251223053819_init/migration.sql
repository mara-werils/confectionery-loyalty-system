-- CreateEnum
CREATE TYPE "PartnerTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'BONUS', 'REFERRAL', 'PROMOTION');

-- CreateEnum
CREATE TYPE "RewardCategory" AS ENUM ('DISCOUNT', 'PRODUCT', 'CASHBACK', 'SPECIAL');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "tier" "PartnerTier" NOT NULL DEFAULT 'BRONZE',
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "kyc_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_points" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "lifetime_earned" BIGINT NOT NULL DEFAULT 0,
    "lifetime_redeemed" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "points_earned" BIGINT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT,
    "tx_hash" TEXT,
    "block_number" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "points_required" BIGINT NOT NULL,
    "category" "RewardCategory" NOT NULL,
    "image_url" TEXT,
    "available" INTEGER NOT NULL DEFAULT 0,
    "max_claims" INTEGER NOT NULL DEFAULT 0,
    "total_claimed" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claimed_rewards" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "reward_id" TEXT NOT NULL,
    "points_spent" BIGINT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMP(3),
    "processed_by" TEXT,
    "notes" TEXT,
    "tx_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claimed_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_payouts" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "tier" "PartnerTier" NOT NULL,
    "period" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "tx_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "commission_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partners_wallet_address_key" ON "partners"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "partners_email_key" ON "partners"("email");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_points_partner_id_key" ON "loyalty_points"("partner_id");

-- CreateIndex
CREATE INDEX "transactions_partner_id_idx" ON "transactions"("partner_id");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");

-- CreateIndex
CREATE INDEX "claimed_rewards_partner_id_idx" ON "claimed_rewards"("partner_id");

-- CreateIndex
CREATE INDEX "claimed_rewards_status_idx" ON "claimed_rewards"("status");

-- CreateIndex
CREATE INDEX "commission_payouts_partner_id_idx" ON "commission_payouts"("partner_id");

-- CreateIndex
CREATE INDEX "commission_payouts_status_idx" ON "commission_payouts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "admins_wallet_address_key" ON "admins"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "loyalty_points" ADD CONSTRAINT "loyalty_points_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claimed_rewards" ADD CONSTRAINT "claimed_rewards_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claimed_rewards" ADD CONSTRAINT "claimed_rewards_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "rewards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
