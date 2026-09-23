-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "chargesTotal" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "OrderCharge" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "settingKey" TEXT NOT NULL,
    "settingName" TEXT NOT NULL,
    "type" "SettingType" NOT NULL,
    "rateValue" DECIMAL(65,30) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderCharge_orderId_idx" ON "OrderCharge"("orderId");

-- CreateIndex
CREATE INDEX "OrderCharge_settingKey_idx" ON "OrderCharge"("settingKey");

-- CreateIndex
CREATE INDEX "OrderCharge_createdAt_idx" ON "OrderCharge"("createdAt");

-- AddForeignKey
ALTER TABLE "OrderCharge" ADD CONSTRAINT "OrderCharge_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
