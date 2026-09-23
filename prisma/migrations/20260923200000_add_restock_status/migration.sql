-- ============================================================
-- Tambah status enum + voidedAt di Restock
-- ============================================================

CREATE TYPE "RestockStatus" AS ENUM ('ACTIVE', 'VOIDED');

ALTER TABLE "Restock"
  ADD COLUMN "status" "RestockStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "voidedAt" TIMESTAMP(3);

CREATE INDEX "Restock_status_idx" ON "Restock"("status");
CREATE INDEX "Restock_voidedAt_idx" ON "Restock"("voidedAt");