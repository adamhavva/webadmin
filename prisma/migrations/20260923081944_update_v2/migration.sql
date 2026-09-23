-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CUSTOMER', 'BARISTA');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "InventoryUnit" AS ENUM ('ML', 'PCS');

-- CreateEnum
CREATE TYPE "InventoryBatchSourceType" AS ENUM ('RESTOCK', 'PRODUCTION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sellingPrice" DECIMAL(65,30) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRecipe" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeItem" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "InventoryUnit" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryBatch" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "sourceType" "InventoryBatchSourceType" NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "remainingQuantity" DECIMAL(65,30) NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Restock" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "supplierName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Restock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Production" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "outputQuantity" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Production_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionComponent" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "inventoryBatchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit" "InventoryUnit" NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishedProductBatch" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "remainingQuantity" DECIMAL(65,30) NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinishedProductBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCostHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "hpp" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCostHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "ProductRecipe_productId_idx" ON "ProductRecipe"("productId");

-- CreateIndex
CREATE INDEX "ProductRecipe_productId_isActive_idx" ON "ProductRecipe"("productId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRecipe_productId_version_key" ON "ProductRecipe"("productId", "version");

-- CreateIndex
CREATE INDEX "RecipeItem_recipeId_idx" ON "RecipeItem"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeItem_inventoryItemId_idx" ON "RecipeItem"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeItem_recipeId_inventoryItemId_key" ON "RecipeItem"("recipeId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "InventoryItem_isActive_idx" ON "InventoryItem"("isActive");

-- CreateIndex
CREATE INDEX "InventoryItem_name_idx" ON "InventoryItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBatch_batchCode_key" ON "InventoryBatch"("batchCode");

-- CreateIndex
CREATE INDEX "InventoryBatch_inventoryItemId_idx" ON "InventoryBatch"("inventoryItemId");

-- CreateIndex
CREATE INDEX "InventoryBatch_inventoryItemId_createdAt_idx" ON "InventoryBatch"("inventoryItemId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryBatch_inventoryItemId_remainingQuantity_idx" ON "InventoryBatch"("inventoryItemId", "remainingQuantity");

-- CreateIndex
CREATE INDEX "InventoryBatch_sourceType_idx" ON "InventoryBatch"("sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "Restock_batchId_key" ON "Restock"("batchId");

-- CreateIndex
CREATE INDEX "Restock_inventoryItemId_idx" ON "Restock"("inventoryItemId");

-- CreateIndex
CREATE INDEX "Restock_createdAt_idx" ON "Restock"("createdAt");

-- CreateIndex
CREATE INDEX "Production_productId_idx" ON "Production"("productId");

-- CreateIndex
CREATE INDEX "Production_createdAt_idx" ON "Production"("createdAt");

-- CreateIndex
CREATE INDEX "ProductionComponent_productionId_idx" ON "ProductionComponent"("productionId");

-- CreateIndex
CREATE INDEX "ProductionComponent_inventoryItemId_idx" ON "ProductionComponent"("inventoryItemId");

-- CreateIndex
CREATE INDEX "ProductionComponent_inventoryBatchId_idx" ON "ProductionComponent"("inventoryBatchId");

-- CreateIndex
CREATE INDEX "ProductionComponent_productionId_inventoryItemId_idx" ON "ProductionComponent"("productionId", "inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "FinishedProductBatch_productionId_key" ON "FinishedProductBatch"("productionId");

-- CreateIndex
CREATE UNIQUE INDEX "FinishedProductBatch_batchCode_key" ON "FinishedProductBatch"("batchCode");

-- CreateIndex
CREATE INDEX "FinishedProductBatch_productId_idx" ON "FinishedProductBatch"("productId");

-- CreateIndex
CREATE INDEX "FinishedProductBatch_productId_remainingQuantity_idx" ON "FinishedProductBatch"("productId", "remainingQuantity");

-- CreateIndex
CREATE INDEX "FinishedProductBatch_createdAt_idx" ON "FinishedProductBatch"("createdAt");

-- CreateIndex
CREATE INDEX "ProductCostHistory_productId_idx" ON "ProductCostHistory"("productId");

-- CreateIndex
CREATE INDEX "ProductCostHistory_productId_createdAt_idx" ON "ProductCostHistory"("productId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProductRecipe" ADD CONSTRAINT "ProductRecipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "ProductRecipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restock" ADD CONSTRAINT "Restock_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restock" ADD CONSTRAINT "Restock_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "InventoryBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Production" ADD CONSTRAINT "Production_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionComponent" ADD CONSTRAINT "ProductionComponent_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionComponent" ADD CONSTRAINT "ProductionComponent_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionComponent" ADD CONSTRAINT "ProductionComponent_inventoryBatchId_fkey" FOREIGN KEY ("inventoryBatchId") REFERENCES "InventoryBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedProductBatch" ADD CONSTRAINT "FinishedProductBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedProductBatch" ADD CONSTRAINT "FinishedProductBatch_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCostHistory" ADD CONSTRAINT "ProductCostHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
