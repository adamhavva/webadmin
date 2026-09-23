// ============================================================
// COST HISTORY SERVICE
//
// Read-only. Endpoint untuk melihat histori HPP Product.
//
// Data ini ditulis oleh Production (via ProductCostHistory).
// Tidak ada update / delete.
// ============================================================

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type { Prisma } from "../../../prisma/generated/client";
import type { ListCostHistoryQuery } from "./cost-history.validator";

/**
 * List histori HPP untuk satu Product, dengan pagination.
 *
 * Product harus ada. Kalau tidak, 404.
 */
export async function listProductCostHistories(
  productId: string,
  query: ListCostHistoryQuery
) {
  // Pastikan product ada
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, sellingPrice: true, isActive: true },
  });

  if (!product) {
    throw ApiError.notFound("Product tidak ditemukan");
  }

  const where: Prisma.ProductCostHistoryWhereInput = { productId };

  // Filter tanggal
  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt.gte = query.dateFrom;
    if (query.dateTo) where.createdAt.lte = query.dateTo;
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    prisma.productCostHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
      select: {
        id: true,
        hpp: true,
        createdAt: true,
      },
    }),
    prisma.productCostHistory.count({ where }),
  ]);

  // Statistik ringkas: min, max, avg, latest
  const stats = await prisma.productCostHistory.aggregate({
    where,
    _min: { hpp: true },
    _max: { hpp: true },
    _avg: { hpp: true },
  });

  const latest = items[0]?.hpp ?? null;

  return {
    product,
    items,
    stats: {
      latest: latest !== null ? Number(latest) : null,
      min: stats._min.hpp !== null ? Number(stats._min.hpp) : null,
      max: stats._max.hpp !== null ? Number(stats._max.hpp) : null,
      avg: stats._avg.hpp !== null ? Number(stats._avg.hpp) : null,
    },
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
  };
}