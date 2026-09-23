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

-- CreateIndex
CREATE INDEX "ProductMetadata_productId_idx" ON "ProductMetadata"("productId");

-- CreateIndex
CREATE INDEX "ProductMetadata_productId_sortOrder_idx" ON "ProductMetadata"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMetadata_productId_key_key" ON "ProductMetadata"("productId", "key");

-- AddForeignKey
ALTER TABLE "ProductMetadata" ADD CONSTRAINT "ProductMetadata_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
