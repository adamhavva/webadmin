-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CUSTOMER', 'BARISTA');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "InventoryUnit" AS ENUM ('ML', 'PCS', 'GR');

-- CreateEnum
CREATE TYPE "InventoryBatchSourceType" AS ENUM ('RESTOCK');

-- CreateEnum
CREATE TYPE "RestockStatus" AS ENUM ('ACTIVE', 'VOIDED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'SEARCHING', 'ASSIGNED', 'ACCEPTED', 'DELIVERING', 'ARRIVED', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReassignReason" AS ENUM ('STOK_HABIS', 'ALAT_RUSAK', 'JARAK_TERLALU_JAUH', 'LAINNYA');

-- CreateEnum
CREATE TYPE "BaristaStockMovementType" AS ENUM ('RESTOCK', 'SOLD', 'ADJUSTMENT', 'RETURN', 'WASTE');

-- CreateEnum
CREATE TYPE "SettingType" AS ENUM ('PERCENTAGE', 'NOMINAL');

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "SettingType" NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pusat" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pusat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "avatarUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "idNumber" TEXT,
    "birthDate" TIMESTAMP(3),
    "joinDate" TIMESTAMP(3),
    "addressKtp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sellingPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMetadata" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMetadata_pkey" PRIMARY KEY ("id")
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
    "status" "RestockStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidedAt" TIMESTAMP(3),
    "voidNote" TEXT,
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

-- CreateTable
CREATE TABLE "BaristaStock" (
    "id" TEXT NOT NULL,
    "baristaId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minThreshold" INTEGER NOT NULL DEFAULT 3,
    "lastRestockAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaristaStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaristaRestock" (
    "id" TEXT NOT NULL,
    "baristaId" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaristaRestock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaristaRestockItem" (
    "id" TEXT NOT NULL,
    "restockId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "finishedBatchId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaristaRestockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaristaStockMovement" (
    "id" TEXT NOT NULL,
    "baristaId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "BaristaStockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "orderId" TEXT,
    "baristaRestockId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaristaStockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "channel" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "deliveryAddress" TEXT,
    "deliveryLatitude" DOUBLE PRECISION,
    "deliveryLongitude" DOUBLE PRECISION,
    "deliveryNote" TEXT,
    "baristaId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "originalBaristaId" TEXT,
    "reassignedAt" TIMESTAMP(3),
    "reassignReason" "ReassignReason",
    "reassignNote" TEXT,
    "reassignCount" INTEGER NOT NULL DEFAULT 0,
    "assignedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "deliveringAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "estimatedDeliveryAt" TIMESTAMP(3),
    "actualDeliveryAt" TIMESTAMP(3),
    "distanceKm" DOUBLE PRECISION,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "chargesTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "deliveryFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentProvider" TEXT NOT NULL DEFAULT 'MIDTRANS',
    "paymentChannel" TEXT,
    "paymentMethodCode" TEXT,
    "paymentMethodName" TEXT,
    "paymentMethodGroup" TEXT,
    "paymentFeeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "snapToken" TEXT,
    "paymentUrl" TEXT,
    "providerChannel" TEXT,
    "paymentExpiredAt" TIMESTAMP(3),
    "callbackPayload" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "finishedBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "actorRole" "UserRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "PaymentWebhookLog" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "PaymentWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "methodCode" TEXT,
    "methodName" TEXT,
    "methodGroup" TEXT,
    "providerChannel" TEXT,
    "methodFeeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "snapToken" TEXT,
    "providerTransactionId" TEXT,
    "paymentUrl" TEXT,
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
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_isActive_idx" ON "Setting"("isActive");

-- CreateIndex
CREATE INDEX "Setting_sortOrder_idx" ON "Setting"("sortOrder");

-- CreateIndex
CREATE INDEX "Pusat_isActive_idx" ON "Pusat"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_key_key" ON "ProductImage"("key");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_isPrimary_idx" ON "ProductImage"("productId", "isPrimary");

-- CreateIndex
CREATE INDEX "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductMetadata_productId_idx" ON "ProductMetadata"("productId");

-- CreateIndex
CREATE INDEX "ProductMetadata_productId_sortOrder_idx" ON "ProductMetadata"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMetadata_productId_key_key" ON "ProductMetadata"("productId", "key");

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
CREATE INDEX "Restock_status_idx" ON "Restock"("status");

-- CreateIndex
CREATE INDEX "Restock_voidedAt_idx" ON "Restock"("voidedAt");

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

-- CreateIndex
CREATE INDEX "BaristaStock_baristaId_idx" ON "BaristaStock"("baristaId");

-- CreateIndex
CREATE INDEX "BaristaStock_productId_idx" ON "BaristaStock"("productId");

-- CreateIndex
CREATE INDEX "BaristaStock_baristaId_quantity_idx" ON "BaristaStock"("baristaId", "quantity");

-- CreateIndex
CREATE UNIQUE INDEX "BaristaStock_baristaId_productId_key" ON "BaristaStock"("baristaId", "productId");

-- CreateIndex
CREATE INDEX "BaristaRestock_baristaId_idx" ON "BaristaRestock"("baristaId");

-- CreateIndex
CREATE INDEX "BaristaRestock_createdAt_idx" ON "BaristaRestock"("createdAt");

-- CreateIndex
CREATE INDEX "BaristaRestockItem_restockId_idx" ON "BaristaRestockItem"("restockId");

-- CreateIndex
CREATE INDEX "BaristaRestockItem_productId_idx" ON "BaristaRestockItem"("productId");

-- CreateIndex
CREATE INDEX "BaristaStockMovement_baristaId_createdAt_idx" ON "BaristaStockMovement"("baristaId", "createdAt");

-- CreateIndex
CREATE INDEX "BaristaStockMovement_productId_createdAt_idx" ON "BaristaStockMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "BaristaStockMovement_type_idx" ON "BaristaStockMovement"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_snapToken_key" ON "Order"("snapToken");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

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

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_status_idx" ON "OrderStatusHistory"("status");

-- CreateIndex
CREATE INDEX "OrderCharge_orderId_idx" ON "OrderCharge"("orderId");

-- CreateIndex
CREATE INDEX "OrderCharge_settingKey_idx" ON "OrderCharge"("settingKey");

-- CreateIndex
CREATE INDEX "OrderCharge_createdAt_idx" ON "OrderCharge"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_requestId_idx" ON "PaymentWebhookLog"("requestId");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_isProcessed_idx" ON "PaymentWebhookLog"("isProcessed");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_paymentId_idx" ON "PaymentWebhookLog"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_createdAt_idx" ON "PaymentWebhookLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_snapToken_key" ON "Payment"("snapToken");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_methodCode_idx" ON "Payment"("methodCode");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMetadata" ADD CONSTRAINT "ProductMetadata_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRecipe" ADD CONSTRAINT "ProductRecipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "ProductRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restock" ADD CONSTRAINT "Restock_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restock" ADD CONSTRAINT "Restock_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "InventoryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Production" ADD CONSTRAINT "Production_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionComponent" ADD CONSTRAINT "ProductionComponent_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionComponent" ADD CONSTRAINT "ProductionComponent_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionComponent" ADD CONSTRAINT "ProductionComponent_inventoryBatchId_fkey" FOREIGN KEY ("inventoryBatchId") REFERENCES "InventoryBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedProductBatch" ADD CONSTRAINT "FinishedProductBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedProductBatch" ADD CONSTRAINT "FinishedProductBatch_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCostHistory" ADD CONSTRAINT "ProductCostHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaristaStock" ADD CONSTRAINT "BaristaStock_baristaId_fkey" FOREIGN KEY ("baristaId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaristaStock" ADD CONSTRAINT "BaristaStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaristaRestock" ADD CONSTRAINT "BaristaRestock_baristaId_fkey" FOREIGN KEY ("baristaId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaristaRestockItem" ADD CONSTRAINT "BaristaRestockItem_restockId_fkey" FOREIGN KEY ("restockId") REFERENCES "BaristaRestock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaristaRestockItem" ADD CONSTRAINT "BaristaRestockItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaristaRestockItem" ADD CONSTRAINT "BaristaRestockItem_finishedBatchId_fkey" FOREIGN KEY ("finishedBatchId") REFERENCES "FinishedProductBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_baristaId_fkey" FOREIGN KEY ("baristaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_finishedBatchId_fkey" FOREIGN KEY ("finishedBatchId") REFERENCES "FinishedProductBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCharge" ADD CONSTRAINT "OrderCharge_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookLog" ADD CONSTRAINT "PaymentWebhookLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
