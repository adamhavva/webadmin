-- Migration: Payment Provider Dynamic
-- Convert enums to strings and add dynamic provider tables

-- ============================================================
-- Step 1: Create new tables
-- ============================================================

-- PaymentProviderConfig
CREATE TABLE "PaymentProviderConfig" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dokuClientId" TEXT,
    "dokuClientSecret" TEXT,
    "dokuPrivateKey" TEXT,
    "dokuPublicKey" TEXT,
    "isProduction" BOOLEAN NOT NULL DEFAULT false,
    "dokuSandboxClientId" TEXT,
    "dokuSandboxClientSecret" TEXT,
    "dokuSandboxPrivateKey" TEXT,
    "dokuSandboxPublicKey" TEXT,
    "webhookSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentProviderConfig_code_key" ON "PaymentProviderConfig"("code");
CREATE INDEX "PaymentProviderConfig_isActive_idx" ON "PaymentProviderConfig"("isActive");

-- Insert default DOKU provider
INSERT INTO "PaymentProviderConfig" ("id", "code", "name", "isActive", "createdAt", "updatedAt")
VALUES ('default-doku', 'DOKU', 'DOKU SNAP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================================
-- Step 2: Add columns with temporary defaults
-- ============================================================

-- PaymentMethodConfig: add providerId
ALTER TABLE "PaymentMethodConfig" ADD COLUMN "providerId" TEXT;
ALTER TABLE "PaymentMethodConfig" ADD COLUMN "groupCode" TEXT;
ALTER TABLE "PaymentMethodConfig" ADD COLUMN "groupName" TEXT;
ALTER TABLE "PaymentMethodConfig" ADD COLUMN "availableForCustomer" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PaymentMethodConfig" ADD COLUMN "availableForAdmin" BOOLEAN NOT NULL DEFAULT true;

-- Set providerId to default DOKU provider
UPDATE "PaymentMethodConfig" SET "providerId" = 'default-doku';

-- Drop old enum columns
ALTER TABLE "PaymentMethodConfig" DROP COLUMN IF EXISTS "provider";
ALTER TABLE "PaymentMethodConfig" DROP COLUMN IF EXISTS "feeType";

-- Add foreign key
ALTER TABLE "PaymentMethodConfig" ADD CONSTRAINT "PaymentMethodConfig_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "PaymentProviderConfig"("id");

-- Payment: add providerId and providerCode
ALTER TABLE "Payment" ADD COLUMN "providerId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "providerCode" TEXT;
ALTER TABLE "Payment" ADD COLUMN "methodGroup" TEXT;

-- Set providerId and providerCode for existing payments (DOKU)
UPDATE "Payment" SET "providerId" = 'default-doku', "providerCode" = 'DOKU';

-- ============================================================
-- Step 3: Create webhook log table
-- ============================================================

CREATE TABLE "PaymentWebhookLog" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "requestId" TEXT,
    "requestPath" TEXT NOT NULL,
    "requestMethod" TEXT NOT NULL DEFAULT 'POST',
    "requestHeaders" JSONB,
    "requestBody" JSONB,
    "responseStatus" INTEGER,
    "responseBody" JSONB,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentWebhookLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PaymentWebhookLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "PaymentProviderConfig"("id"),
    CONSTRAINT "PaymentWebhookLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL
);

CREATE INDEX "PaymentWebhookLog_providerId_idx" ON "PaymentWebhookLog"("providerId");
CREATE INDEX "PaymentWebhookLog_requestId_idx" ON "PaymentWebhookLog"("requestId");
CREATE INDEX "PaymentWebhookLog_isProcessed_idx" ON "PaymentWebhookLog"("isProcessed");
CREATE INDEX "PaymentWebhookLog_paymentId_idx" ON "PaymentWebhookLog"("paymentId");
CREATE INDEX "PaymentWebhookLog_createdAt_idx" ON "PaymentWebhookLog"("createdAt");

-- ============================================================
-- Step 4: Create customer payment account table
-- ============================================================

CREATE TABLE "CustomerPaymentAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerCode" TEXT NOT NULL,
    "methodCode" TEXT NOT NULL,
    "externalAccountId" TEXT,
    "accountMasked" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "bindingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerPaymentAccount_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CustomerPaymentAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "CustomerPaymentAccount_userId_providerCode_methodCode_unique" UNIQUE ("userId", "providerCode", "methodCode")
);

CREATE INDEX "CustomerPaymentAccount_userId_idx" ON "CustomerPaymentAccount"("userId");
CREATE INDEX "CustomerPaymentAccount_externalAccountId_idx" ON "CustomerPaymentAccount"("externalAccountId");
CREATE INDEX "CustomerPaymentAccount_bindingStatus_idx" ON "CustomerPaymentAccount"("bindingStatus");

-- ============================================================
-- Step 5: Make columns NOT NULL after setting defaults
-- ============================================================

ALTER TABLE "PaymentMethodConfig" ALTER COLUMN "providerId" SET NOT NULL;
ALTER TABLE "PaymentMethodConfig" ALTER COLUMN "feeType" TYPE TEXT USING "feeType"::TEXT;

ALTER TABLE "Payment" ALTER COLUMN "providerId" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "providerCode" SET NOT NULL;

-- ============================================================
-- Step 6: Drop old enum types (after data migration)
-- ============================================================

-- Note: Enums are deprecated but kept for backward compatibility
-- They will be removed in a future migration after all references are updated
