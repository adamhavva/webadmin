-- Drop PaymentWebhookLog.providerId FK and column
ALTER TABLE "PaymentWebhookLog" DROP CONSTRAINT IF EXISTS "PaymentWebhookLog_providerId_fkey";
ALTER TABLE "PaymentWebhookLog" DROP COLUMN IF EXISTS "providerId";

-- Drop PaymentProviderConfig.providerId from Payment if it exists
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "providerId";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "providerCode";
ALTER TABLE "Payment" ALTER COLUMN "methodCode" DROP NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "methodName" DROP NOT NULL;

-- Drop tables
DROP TABLE IF EXISTS "CustomerPaymentAccount";
DROP TABLE IF EXISTS "PaymentMethodConfig";
DROP TABLE IF EXISTS "PaymentProviderConfig";
