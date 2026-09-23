// ============================================================
// PRODUCT SERVICE
// ============================================================

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type { Prisma } from "@/prisma/generated/client";
import type {
  CreateProductInput,
  ListProductQuery,
  UpdateProductInput,
} from "./product.validator";

export async function listProducts(query: ListProductQuery) {
  const where: Prisma.ProductWhereInput = {};

  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: query.limit,
      select: {
        id: true,
        name: true,
        sellingPrice: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        recipes: {
          where: { isActive: true },
          take: 1,
          select: {
            id: true,
            version: true,
            _count: { select: { items: true } },
          },
        },
        _count: {
          select: { recipes: true, productions: true },
        },
      },
    }),
    prisma.product.count({ where }),
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

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      sellingPrice: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      recipes: {
        orderBy: { version: "desc" },
        select: {
          id: true,
          version: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          items: {
            select: {
              id: true,
              quantity: true,
              inventoryItem: {
                select: { id: true, name: true, unit: true, isActive: true },
              },
            },
          },
        },
      },
      costHistories: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          hpp: true,
          createdAt: true,
        },
      },
      _count: {
        select: { productions: true, finishedProductBatches: true },
      },
    },
  });

  if (!product) {
    throw ApiError.notFound("Product tidak ditemukan");
  }

  // Total stock = sum remainingQuantity dari semua FinishedProductBatch
  const stockAgg = await prisma.finishedProductBatch.aggregate({
    where: { productId: id },
    _sum: { remainingQuantity: true },
  });

  return {
    ...product,
    totalStock: stockAgg._sum.remainingQuantity ?? 0,
  };
}

export async function createProduct(input: CreateProductInput) {
  const existing = await prisma.product.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" } },
    select: { id: true },
  });

  if (existing) {
    throw ApiError.conflict(`Product "${input.name}" sudah ada`);
  }

  return prisma.product.create({
    data: {
      name: input.name,
      sellingPrice: input.sellingPrice,
      isActive: input.isActive,
    },
    select: {
      id: true,
      name: true,
      sellingPrice: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw ApiError.notFound("Product tidak ditemukan");
  }

  if (input.name) {
    const dup = await prisma.product.findFirst({
      where: {
        name: { equals: input.name, mode: "insensitive" },
        NOT: { id },
      },
      select: { id: true },
    });

    if (dup) {
      throw ApiError.conflict(`Product "${input.name}" sudah ada`);
    }
  }

  return prisma.product.update({
    where: { id },
    data: input,
    select: {
      id: true,
      name: true,
      sellingPrice: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Soft delete: set isActive = false.
 *
 * Product tidak dihapus permanen karena:
 * - Punya Production history
 * - Punya FinishedProductBatch
 * - Punya ProductCostHistory
 */
export async function deactivateProduct(id: string) {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw ApiError.notFound("Product tidak ditemukan");
  }

  return prisma.product.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      name: true,
      sellingPrice: true,
      isActive: true,
      updatedAt: true,
    },
  });
}