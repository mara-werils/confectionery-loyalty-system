-- Migration: Add DAO Governance + ML Churn Intervention models
-- Feature 1: DAO Governance (Proposals + Votes)
-- Feature 2: ML Churn Auto-Intervention tracking

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACTIVE', 'PASSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VoteChoice" AS ENUM ('FOR', 'AGAINST', 'ABSTAIN');

-- CreateEnum
CREATE TYPE "ProposalCategory" AS ENUM ('SYSTEM_PARAMS', 'NEW_FEATURES', 'PARTNERSHIPS', 'OTHER');

-- CreateTable: proposals
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ProposalCategory" NOT NULL DEFAULT 'OTHER',
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "proposer_id" TEXT NOT NULL,
    "votes_for" BIGINT NOT NULL DEFAULT 0,
    "votes_against" BIGINT NOT NULL DEFAULT 0,
    "votes_abstain" BIGINT NOT NULL DEFAULT 0,
    "total_voters" INTEGER NOT NULL DEFAULT 0,
    "quorum" INTEGER NOT NULL DEFAULT 60,
    "voting_ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable: votes
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "choice" "VoteChoice" NOT NULL,
    "voting_power" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: churn_interventions
CREATE TABLE "churn_interventions" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "risk_score" INTEGER NOT NULL,
    "risk_level" TEXT NOT NULL,
    "bonus_sent" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "churn_interventions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proposals_status_idx" ON "proposals"("status");
CREATE INDEX "proposals_created_at_idx" ON "proposals"("created_at");
CREATE UNIQUE INDEX "votes_proposal_id_partner_id_key" ON "votes"("proposal_id", "partner_id");
CREATE INDEX "votes_proposal_id_idx" ON "votes"("proposal_id");
CREATE INDEX "churn_interventions_partner_id_idx" ON "churn_interventions"("partner_id");
CREATE INDEX "churn_interventions_created_at_idx" ON "churn_interventions"("created_at");

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_proposer_id_fkey"
    FOREIGN KEY ("proposer_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "votes" ADD CONSTRAINT "votes_proposal_id_fkey"
    FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "votes" ADD CONSTRAINT "votes_partner_id_fkey"
    FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "churn_interventions" ADD CONSTRAINT "churn_interventions_partner_id_fkey"
    FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed initial governance proposals for demo
INSERT INTO "proposals" ("id", "title", "description", "category", "status", "proposer_id", "votes_for", "votes_against", "votes_abstain", "total_voters", "quorum", "voting_ends_at", "created_at", "updated_at")
SELECT
    gen_random_uuid()::text,
    'Increase cashback rate from 10% to 15% for GOLD tier',
    'This proposal aims to boost GOLD tier engagement by raising the cashback multiplier. Analysis shows a 15% cashback would increase average transaction frequency by ~22% based on historical data.',
    'SYSTEM_PARAMS'::"ProposalCategory",
    'ACTIVE'::"ProposalStatus",
    (SELECT id FROM partners LIMIT 1),
    8375,
    4125,
    1000,
    185,
    60,
    NOW() + INTERVAL '5 days',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
WHERE EXISTS (SELECT 1 FROM partners LIMIT 1);

INSERT INTO "proposals" ("id", "title", "description", "category", "status", "proposer_id", "votes_for", "votes_against", "votes_abstain", "total_voters", "quorum", "voting_ends_at", "created_at", "updated_at")
SELECT
    gen_random_uuid()::text,
    'Launch PLATINUM tier for 50,000+ SWEET holders',
    'Introduce a new PLATINUM tier with 3x earning multiplier and exclusive monthly airdrops for partners holding 50,000+ SWEET. This would incentivize long-term token accumulation.',
    'NEW_FEATURES'::"ProposalCategory",
    'ACTIVE'::"ProposalStatus",
    (SELECT id FROM partners LIMIT 1),
    10250,
    2250,
    500,
    210,
    60,
    NOW() + INTERVAL '3 days',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
WHERE EXISTS (SELECT 1 FROM partners LIMIT 1);

INSERT INTO "proposals" ("id", "title", "description", "category", "status", "proposer_id", "votes_for", "votes_against", "votes_abstain", "total_voters", "quorum", "voting_ends_at", "created_at", "updated_at")
SELECT
    gen_random_uuid()::text,
    'Reduce spin wheel cooldown from 24h to 12h on weekends',
    'Allow users to spin twice per day on Saturdays and Sundays to boost weekend engagement. Estimated 40% increase in weekend active users based on similar programs.',
    'SYSTEM_PARAMS'::"ProposalCategory",
    'PASSED'::"ProposalStatus",
    (SELECT id FROM partners LIMIT 1),
    14560,
    1440,
    800,
    290,
    60,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '1 day'
WHERE EXISTS (SELECT 1 FROM partners LIMIT 1);
