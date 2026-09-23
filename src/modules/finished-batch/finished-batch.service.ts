// ============================================================
// FINISHED BATCH SERVICE
//
// Read-only.
//
// FinishedProductBatch adalah stock Product jadi.
// Dibuat HANYA oleh Production.
// Dibedakan dari InventoryBatch (stock material).
// ============================================================

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type { Prisma } from "../../../prisma/generated/client";
import type { ListFinishedBatchQuery } from "./finished-batch.validator";

export async function listFinishedBatches(query: ListFinishedBatchQuery) {
  const where: Prisma.FinishedProductBatchWhereInput = {};

  if (query.productId) {
    where.productId = query.productId;
  }

  if (query.onlyAvailable) {
    where.remainingQuantity = { gt: 0 };
  }

  if (query.search) {
    where.OR = [
      { batchCode: { contains: query.search, mode: "insensitive" } },
      {
        product: {
          name: { contains: query.search, mode: "insensitive" },
        },
      },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    prisma.finishedProductBatch.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: query.limit,
      select: {
        id: true,
        productId: true,
        productionId: true,
        batchCode: true,
        quantity: true,
        remainingQuantity: true,
        unitCost: true,
        totalCost: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
            sellingPrice: true,
          },
        },
      },
    }),
    prisma.finishedProductBatch.count({ where }),
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

export async function getFinishedBatchById(id: string) {
  const batch = await prisma.finishedProductBatch.findUnique({
    where: { id },
    select: {
      id: true,
      productId: true,
      productionId: true,
      batchCode: true,
      quantity: true,
      remainingQuantity: true,
      unitCost: true,
      totalCost: true,
      createdAt: true,
      updatedAt: true,
      product: {
        select: {
          id: true,
          name: true,
          sellingPrice: true,
          isActive: true,
        },
      },
      production: {
        select: {
          id: true,
          productId: true,
          outputQuantity: true,
          totalCost: true,
          unitCost: true,
          createdAt: true,
          _count: { select: { components: true } },
        },
      },
    },
  });

  if (!batch) {
    throw ApiError.notFound("Finished product batch tidak ditemukan");
  }

  return batch;
}