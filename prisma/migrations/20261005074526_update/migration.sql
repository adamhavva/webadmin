-- AlterTable
ALTER TABLE "User" ADD COLUMN     "last_active_at" TIMESTAMPTZ(6),
ADD COLUMN     "online_status" VARCHAR(20) DEFAULT 'OFFLINE';

-- CreateIndex
CREATE INDEX "User_online_status_idx" ON "User"("online_status");

-- CreateIndex
CREATE INDEX "User_role_online_status_idx" ON "User"("role", "online_status");
