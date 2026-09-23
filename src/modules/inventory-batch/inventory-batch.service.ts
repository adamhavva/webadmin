// ============================================================
// INVENTORY BATCH SERVICE
//
// Read-only untuk API. Mutation hanya lewat Restock & Production.
// ============================================================

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type { Prisma } from "@/prisma/generated/client";
import type { ListInventoryBatchQuery } from "./inventory-batch.validator";

export async function listInventoryBatches(
  query: ListInventoryBatchQuery
) {
  const where: Prisma.InventoryBatchWhereInput = {};

  if (query.inventoryItemId) {
    where.inventoryItemId = query.inventoryItemId;
  }

  if (query.onlyAvailable) {
    where.remainingQuantity = { gt: 0 };
  }

  if (query.search) {
    where.OR = [
      { batchCode: { contains: query.search, mode: "insensitive" } },
      {
        inventoryItem: {
          name: { contains: query.search, mode: "insensitive" },
        },
      },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    prisma.inventoryBatch.findMany({
      where,
      orderBy: [{ inventoryItemId: "asc" }, { createdAt: "asc" }],
      skip,
      take: query.limit,
      select: {
        id: true,
        inventoryItemId: true,
        batchCode: true,
        sourceType: true,
        quantity: true,
        remainingQuantity: true,
        unitCost: true,
        totalCost: true,
        createdAt: true,
        inventoryItem: {
          select: { id: true, name: true, unit: true },
        },
      },
    }),
    prisma.inventoryBatch.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
  };
}

export async function getInventoryBatchById(id: string) {
  const batch = await prisma.inventoryBatch.findUnique({
    where: { id },
    select: {
      id: true,
      inventoryItemId: true,
      batchCode: true,
      sourceType: true,
      quantity: true,
      remainingQuantity: true,
      unitCost: true,
      totalCost: true,
      createdAt: true,
      updatedAt: true,
      inventoryItem: {
        select: { id: true, name: true, unit: true },
      },
      restock: {
        select: {
          id: true,
          supplierName: true,
          createdAt: true,
        },
      },
      productionComponents: {
        select: {
          id: true,
          productionId: true,
          quantity: true,
          unitCost: true,
          totalCost: true,
          createdAt: true,
          production: {
            select: {
              id: true,
              productId: true,
              outputQuantity: true,
              product: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!batch) {
    throw ApiError.notFound("Inventory batch tidak ditemukan");
  }

  return batch;
}