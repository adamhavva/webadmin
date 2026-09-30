-- ============================================================
-- Migrate payment provider from DOKU to Midtrans
-- ============================================================

-- Rename Payment fields
ALTER TABLE "Payment" RENAME COLUMN "dokuInvoiceNumber" TO "snapToken";
ALTER TABLE "Payment" RENAME COLUMN "dokuTransactionId" TO "providerTransactionId";
ALTER TABLE "Payment" RENAME COLUMN "dokuPaymentUrl" TO "paymentUrl";
ALTER TABLE "Payment" RENAME COLUMN "dokuChannelCode" TO "providerChannel";
UPDATE "Payment" SET "providerCode" = 'MIDTRANS' WHERE "providerCode" = 'DOKU';

-- Rename PaymentProviderConfig fields
ALTER TABLE "PaymentProviderConfig" RENAME COLUMN "dokuClientId" TO "midtransClientKey";
ALTER TABLE "PaymentProviderConfig" RENAME COLUMN "dokuClientSecret" TO "midtransServerKey";
ALTER TABLE "PaymentProviderConfig" RENAME COLUMN "dokuSandboxClientId" TO "midtransSandboxClientKey";
ALTER TABLE "PaymentProviderConfig" RENAME COLUMN "dokuSandboxClientSecret" TO "midtransSandboxServerKey";
-- Drop unused DOKU columns
ALTER TABLE "PaymentProviderConfig" DROP COLUMN IF EXISTS "dokuPrivateKey";
ALTER TABLE "PaymentProviderConfig" DROP COLUMN IF EXISTS "dokuPublicKey";
ALTER TABLE "PaymentProviderConfig" DROP COLUMN IF EXISTS "dokuSandboxPrivateKey";
ALTER TABLE "PaymentProviderConfig" DROP COLUMN IF EXISTS "dokuSandboxPublicKey";
UPDATE "PaymentProviderConfig" SET "code" = 'MIDTRANS', "name" = 'Midtrans Snap' WHERE "code" = 'DOKU';

-- Rename PaymentMethodConfig field
ALTER TABLE "PaymentMethodConfig" RENAME COLUMN "dokuChannelCode" TO "providerChannelCode";

-- Update PaymentWebhookLog snapshots
UPDATE "PaymentWebhookLog" SET "providerCode" = 'MIDTRANS' WHERE "providerCode" = 'DOKU';

-- Update Order table: rename DOKU-specific columns to generic names
ALTER TABLE "Order" RENAME COLUMN "dokuInvoiceNumber" TO "snapToken";
ALTER TABLE "Order" RENAME COLUMN "dokuPaymentUrl" TO "paymentUrl";
ALTER TABLE "Order" RENAME COLUMN "dokuPaymentMethod" TO "providerChannel";
ALTER TABLE "Order" RENAME COLUMN "dokuExpiredAt" TO "paymentExpiredAt";
ALTER TABLE "Order" RENAME COLUMN "dokuCallbackPayload" TO "callbackPayload";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "dokuPaidAt";
-- Update paymentProvider column values
UPDATE "Order" SET "paymentProvider" = 'MIDTRANS' WHERE "paymentProvider" = 'DOKU';
