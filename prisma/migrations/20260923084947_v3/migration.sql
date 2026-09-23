/*
  Warnings:

  - The values [PRODUCTION] on the enum `InventoryBatchSourceType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "InventoryBatchSourceType_new" AS ENUM ('RESTOCK');
ALTER TABLE "InventoryBatch" ALTER COLUMN "sourceType" TYPE "InventoryBatchSourceType_new" USING ("sourceType"::text::"InventoryBatchSourceType_new");
ALTER TYPE "InventoryBatchSourceType" RENAME TO "InventoryBatchSourceType_old";
ALTER TYPE "InventoryBatchSourceType_new" RENAME TO "InventoryBatchSourceType";
DROP TYPE "public"."InventoryBatchSourceType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "FinishedProductBatch" DROP CONSTRAINT "FinishedProductBatch_productionId_fkey";

-- DropForeignKey
ALTER TABLE "ProductCostHistory" DROP CONSTRAINT "ProductCostHistory_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductRecipe" DROP CONSTRAINT "ProductRecipe_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductionComponent" DROP CONSTRAINT "ProductionComponent_productionId_fkey";

-- DropForeignKey
ALTER TABLE "RecipeItem" DROP CONSTRAINT "RecipeItem_recipeId_fkey";

-- DropForeignKey
ALTER TABLE "Restock" DROP CONSTRAINT "Restock_batchId_fkey";

-- AddForeignKey
ALTER TABLE "ProductRecipe" ADD CONSTRAINT "ProductRecipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "ProductRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restock" ADD CONSTRAINT "Restock_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "InventoryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionComponent" ADD CONSTRAINT "ProductionComponent_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedProductBatch" ADD CONSTRAINT "FinishedProductBatch_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCostHistory" ADD CONSTRAINT "ProductCostHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
