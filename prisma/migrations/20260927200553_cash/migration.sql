-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cashChange" DECIMAL(65,30),
ADD COLUMN     "cashPaid" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "cashChange" DECIMAL(65,30),
ADD COLUMN     "cashPaid" DECIMAL(65,30);
