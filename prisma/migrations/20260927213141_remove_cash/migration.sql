/*
  Warnings:

  - The values [COD] on the enum `PaymentChannel` will be removed. If these variants are still used in the database, this will fail.
  - The values [CASH] on the enum `PaymentProvider` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `cashChange` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `cashPaid` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `cashChange` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `cashPaid` on the `Payment` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentChannel_new" AS ENUM ('PREPAID');
ALTER TABLE "public"."Order" ALTER COLUMN "paymentChannel" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "paymentChannel" TYPE "PaymentChannel_new" USING ("paymentChannel"::text::"PaymentChannel_new");
ALTER TYPE "PaymentChannel" RENAME TO "PaymentChannel_old";
ALTER TYPE "PaymentChannel_new" RENAME TO "PaymentChannel";
DROP TYPE "public"."PaymentChannel_old";
ALTER TABLE "Order" ALTER COLUMN "paymentChannel" SET DEFAULT 'PREPAID';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentProvider_new" AS ENUM ('DOKU');
ALTER TABLE "public"."Order" ALTER COLUMN "paymentProvider" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "paymentProvider" TYPE "PaymentProvider_new" USING ("paymentProvider"::text::"PaymentProvider_new");
ALTER TABLE "PaymentMethodConfig" ALTER COLUMN "provider" TYPE "PaymentProvider_new" USING ("provider"::text::"PaymentProvider_new");
ALTER TABLE "Payment" ALTER COLUMN "provider" TYPE "PaymentProvider_new" USING ("provider"::text::"PaymentProvider_new");
ALTER TYPE "PaymentProvider" RENAME TO "PaymentProvider_old";
ALTER TYPE "PaymentProvider_new" RENAME TO "PaymentProvider";
DROP TYPE "public"."PaymentProvider_old";
ALTER TABLE "Order" ALTER COLUMN "paymentProvider" SET DEFAULT 'DOKU';
COMMIT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "cashChange",
DROP COLUMN "cashPaid",
ALTER COLUMN "paymentChannel" SET DEFAULT 'PREPAID',
ALTER COLUMN "paymentProvider" SET DEFAULT 'DOKU';

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "cashChange",
DROP COLUMN "cashPaid";
