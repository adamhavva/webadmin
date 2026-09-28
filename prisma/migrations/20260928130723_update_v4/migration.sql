/*
  Warnings:

  - The `channel` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `paymentChannel` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "channel",
ADD COLUMN     "channel" TEXT,
DROP COLUMN "paymentChannel",
ADD COLUMN     "paymentChannel" TEXT;

-- DropEnum
DROP TYPE "OrderChannel";

-- DropEnum
DROP TYPE "PaymentChannel";
