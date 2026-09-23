/*
  Warnings:

  - A unique constraint covering the columns `[dokuInvoiceNumber]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('CASH', 'DOKU');

-- CreateEnum
CREATE TYPE "PaymentFeeType" AS ENUM ('NONE', 'PERCENTAGE', 'NOMINAL');

-- CreateEnum
CREATE TYPE "PaymentChannel" AS ENUM ('COD', 'PREPAID');

-- DropIndex
DROP INDEX "Order_baristaId_idx";

-- DropIndex
DROP INDEX "Order_channel_idx";

-- DropIndex
DROP INDEX "Order_customerId_idx";

-- DropIndex
DROP INDEX "Order_status_idx";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "dokuCallbackPayload" JSONB,
ADD COLUMN     "dokuExpiredAt" TIMESTAMP(3),
ADD COLUMN     "dokuInvoiceNumber" TEXT,
ADD COLUMN     "dokuPaidAt" TIMESTAMP(3),
ADD COLUMN     "dokuPaymentMethod" TEXT,
ADD COLUMN     "dokuPaymentUrl" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentChannel" "PaymentChannel" NOT NULL DEFAULT 'COD',
ADD COLUMN     "paymentFeeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentMethodCode" TEXT,
ADD COLUMN     "paymentMethodGroup" TEXT,
ADD COLUMN     "paymentMethodName" TEXT,
ADD COLUMN     "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'CASH',
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "PaymentMethodConfig" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "dokuChannelCode" TEXT,
    "feeType" "PaymentFeeType" NOT NULL DEFAULT 'NONE',
    "feeValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "icon" TEXT,
    "description" TEXT,
    "displayGroup" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "provider" "PaymentProvider" NOT NULL,
    "methodCode" TEXT NOT NULL,
    "methodName" TEXT NOT NULL,
    "methodGroup" TEXT,
    "methodFeeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "dokuInvoiceNumber" TEXT,
    "dokuTransactionId" TEXT,
    "dokuPaymentUrl" TEXT,
    "dokuChannelCode" TEXT,
    "requestPayload" JSONB,
    "callbackPayload" JSONB,
    "paidAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodConfig_code_key" ON "PaymentMethodConfig"("code");

-- CreateIndex
CREATE INDEX "PaymentMethodConfig_isActive_idx" ON "PaymentMethodConfig"("isActive");

-- CreateIndex
CREATE INDEX "PaymentMethodConfig_provider_idx" ON "PaymentMethodConfig"("provider");

-- CreateIndex
CREATE INDEX "PaymentMethodConfig_sortOrder_idx" ON "PaymentMethodConfig"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_dokuInvoiceNumber_key" ON "Payment"("dokuInvoiceNumber");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_provider_idx" ON "Payment"("provider");

-- CreateIndex
CREATE INDEX "Payment_methodCode_idx" ON "Payment"("methodCode");

-- CreateIndex
CREATE UNIQUE INDEX "Order_dokuInvoiceNumber_key" ON "Order"("dokuInvoiceNumber");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_paymentMethodCode_idx" ON "Order"("paymentMethodCode");

-- CreateIndex
CREATE INDEX "Order_baristaId_status_idx" ON "Order"("baristaId", "status");

-- CreateIndex
CREATE INDEX "Order_customerId_status_idx" ON "Order"("customerId", "status");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_baristaId_createdAt_idx" ON "Order"("baristaId", "createdAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
