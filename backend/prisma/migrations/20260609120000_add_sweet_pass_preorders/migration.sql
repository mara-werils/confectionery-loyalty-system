-- Migration: Add Sweet Pass prepaid pre-order escrow tracking
-- Mirrors the on-chain SweetPassEscrow state machine in Postgres.

-- CreateEnum
CREATE TYPE "PreOrderStatus" AS ENUM ('PENDING_DEPOSIT', 'FUNDED', 'RELEASED', 'REFUNDED');

-- CreateTable: pre_orders
CREATE TABLE "pre_orders" (
    "id" TEXT NOT NULL,
    "order_id" BIGINT NOT NULL,
    "customer_wallet" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "partner_wallet" TEXT NOT NULL,
    "item_description" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "amount_kzt" BIGINT NOT NULL,
    "status" "PreOrderStatus" NOT NULL DEFAULT 'PENDING_DEPOSIT',
    "deadline" TIMESTAMP(3) NOT NULL,
    "deposit_tx_hash" TEXT,
    "release_tx_hash" TEXT,
    "refund_tx_hash" TEXT,
    "funded_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pre_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pre_orders_order_id_key" ON "pre_orders"("order_id");
CREATE INDEX "pre_orders_customer_wallet_idx" ON "pre_orders"("customer_wallet");
CREATE INDEX "pre_orders_partner_id_idx" ON "pre_orders"("partner_id");
CREATE INDEX "pre_orders_status_idx" ON "pre_orders"("status");
CREATE INDEX "pre_orders_deadline_idx" ON "pre_orders"("deadline");

-- AddForeignKey
ALTER TABLE "pre_orders" ADD CONSTRAINT "pre_orders_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
