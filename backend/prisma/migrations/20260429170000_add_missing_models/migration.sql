-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED');

-- AlterTable: add referral fields to partners
ALTER TABLE "partners" ADD COLUMN "referral_code" TEXT;
ALTER TABLE "partners" ADD COLUMN "referred_by_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "partners_referral_code_key" ON "partners"("referral_code");

-- AddForeignKey (self-referential)
ALTER TABLE "partners" ADD CONSTRAINT "partners_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: coupons
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "reward_id" TEXT NOT NULL,
    "points_spent" BIGINT NOT NULL,
    "status" "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "partner_name" TEXT,
    "reward_title" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "redeemed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
CREATE INDEX "coupons_partner_id_idx" ON "coupons"("partner_id");
CREATE INDEX "coupons_code_idx" ON "coupons"("code");
CREATE INDEX "coupons_status_idx" ON "coupons"("status");

ALTER TABLE "coupons" ADD CONSTRAINT "coupons_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "rewards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: achievements
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "requirement" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "nft_metadata" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");

-- CreateTable: partner_achievements
CREATE TABLE "partner_achievements" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "unlocked_at" TIMESTAMP(3),
    "nft_tx_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_achievements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_achievements_partner_id_achievement_id_key" ON "partner_achievements"("partner_id", "achievement_id");

ALTER TABLE "partner_achievements" ADD CONSTRAINT "partner_achievements_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_achievements" ADD CONSTRAINT "partner_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: audit_logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
