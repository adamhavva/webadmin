-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'SEARCHING', 'ASSIGNED', 'ACCEPTED', 'DELIVERING', 'ARRIVED', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('ONLINE', 'OFFLINE');

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
    "channel" "OrderChannel" NOT NULL DEFAULT 'ONLINE',
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
    "deliveryFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_isActive_idx" ON "Setting"("isActive");

-- CreateIndex
CREATE INDEX "Setting_sortOrder_idx" ON "Setting"("sortOrder");

-- CreateIndex
CREATE INDEX "Pusat_isActive_idx" ON "Pusat"("isActive");

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
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_baristaId_idx" ON "Order"("baristaId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_channel_idx" ON "Order"("channel");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_status_idx" ON "OrderStatusHistory"("status");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

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
