import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type { Prisma } from "@/prisma/generated/client";
import type {
  CreateInventoryItemInput,
  ListInventoryItemQuery,
  UpdateInventoryItemInput,
} from "./inventory-item.validator";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

/**
 * Ambil total stock (sum remainingQuantity) untuk sekumpulan
 * inventoryItemId. Return Map<inventoryItemId, {totalStock, batchCount, availableBatchCount}>
 */
async function getStockMap(inventoryItemIds: string[]) {
  if (inventoryItemIds.length === 0) {
    return new Map<
      string,
      { totalStock: number; batchCount: number; availableBatchCount: number }
    >();
  }

  const grouped = await prisma.inventoryBatch.groupBy({
    by: ["inventoryItemId"],
    where: { inventoryItemId: { in: inventoryItemIds } },
    _sum: { remainingQuantity: true },
    _count: { _all: true },
  });

  const map = new Map<
    string,
    { totalStock: number; batchCount: number; availableBatchCount: number }
  >();

  for (const g of grouped) {
    map.set(g.inventoryItemId, {
      totalStock: Number(g._sum.remainingQuantity ?? 0),
      batchCount: g._count._all,
      availableBatchCount: 0,
    });
  }

  // Hitung batch yang masih available
  const availableCounts = await prisma.inventoryBatch.groupBy({
    by: ["inventoryItemId"],
    where: {
      inventoryItemId: { in: inventoryItemIds },
      remainingQuantity: { gt: 0 },
    },
    _count: { _all: true },
  });

  for (const g of availableCounts) {
    const existing = map.get(g.inventoryItemId);
    if (existing) {
      existing.availableBatchCount = g._count._all;
    } else {
      map.set(g.inventoryItemId, {
        totalStock: 0,
        batchCount: 0,
        availableBatchCount: g._count._all,
      });
    }
  }

  return map;
}

// ------------------------------------------------------------
// List
// ------------------------------------------------------------

export async function listInventoryItems(query: ListInventoryItemQuery) {
  const where: Prisma.InventoryItemWhereInput = {};

  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: query.limit,
      select: {
        id: true,
        name: true,
        unit: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  const ids = items.map((i) => i.id);
  const stockMap = await getStockMap(ids);

  // Filter by stock status (di memori karena butuh agregasi)
  let filtered = items;
  if (query.stockStatus !== "all") {
    filtered = items.filter((item) => {
      const stock = stockMap.get(item.id)?.totalStock ?? 0;
      if (query.stockStatus === "out-of-stock") return stock === 0;
      if (query.stockStatus === "low-stock")
        return stock > 0 && stock < query.lowStockThreshold;
      return stock >= query.lowStockThreshold;
    });
  }

  return {
    items: filtered.map((item) => {
      const stock = stockMap.get(item.id);
      return {
        ...item,
        totalStock: stock?.totalStock ?? 0,
        batchCount: stock?.batchCount ?? 0,
        availableBatchCount: stock?.availableBatchCount ?? 0,
      };
    }),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
    lowStockThreshold: query.lowStockThreshold,
  };
}

// ------------------------------------------------------------
// Detail
// ------------------------------------------------------------

export async function getInventoryItemById(id: string) {
  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      unit: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!item) {
    throw ApiError.notFound("Inventory item tidak ditemukan");
  }

  // Ambil semua batch item ini
  const batches = await prisma.inventoryBatch.findMany({
    where: { inventoryItemId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      batchCode: true,
      sourceType: true,
      quantity: true,
      remainingQuantity: true,
      unitCost: true,
      totalCost: true,
      createdAt: true,
    },
  });

  // Hitung agregat
  const totalStock = batches.reduce(
    (sum, b) => sum + Number(b.remainingQuantity),
    0
  );
  const totalQuantity = batches.reduce(
    (sum, b) => sum + Number(b.quantity),
    0
  );
  const totalValue = batches.reduce(
    (sum, b) => sum + Number(b.remainingQuantity) * Number(b.unitCost),
    0
  );
  const availableBatchCount = batches.filter(
    (b) => Number(b.remainingQuantity) > 0
  ).length;

  // Ambil recent restocks
  const recentRestocks = await prisma.restock.findMany({
    where: { inventoryItemId: id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      quantity: true,
      totalCost: true,
      unitCost: true,
      supplierName: true,
      createdAt: true,
    },
  });

  // Recipe usage
  const recipesUsing = await prisma.recipeItem.findMany({
    where: { inventoryItemId: id },
    select: {
      id: true,
      quantity: true,
      recipe: {
        select: {
          id: true,
          version: true,
          isActive: true,
          product: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  return {
    ...item,
    stock: {
      totalStock,
      totalQuantity,
      totalValue,
      batchCount: batches.length,
      availableBatchCount,
    },
    batches,
    recentRestocks,
    recipesUsing: recipesUsing.map((r) => ({
      id: r.id,
      quantity: Number(r.quantity),
      recipeId: r.recipe.id,
      version: r.recipe.version,
      isActive: r.recipe.isActive,
      productId: r.recipe.product.id,
      productName: r.recipe.product.name,
    })),
  };
}

// ------------------------------------------------------------
// Create
// ------------------------------------------------------------

export async function createInventoryItem(input: CreateInventoryItemInput) {
  const existing = await prisma.inventoryItem.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" } },
    select: { id: true },
  });

  if (existing) {
    throw ApiError.conflict(`Bahan "${input.name}" sudah ada`);
  }

  return prisma.inventoryItem.create({
    data: {
      name: input.name,
      unit: input.unit,
      isActive: input.isActive,
    },
    select: {
      id: true,
      name: true,
      unit: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// ------------------------------------------------------------
// Update
// ------------------------------------------------------------

export async function updateInventoryItem(
  id: string,
  input: UpdateInventoryItemInput
) {
  await getInventoryItemById(id);

  if (input.name) {
    const existing = await prisma.inventoryItem.findFirst({
      where: {
        name: { equals: input.name, mode: "insensitive" },
        NOT: { id },
      },
      select: { id: true },
    });

    if (existing) {
      throw ApiError.conflict(`Bahan "${input.name}" sudah ada`);
    }
  }

  return prisma.inventoryItem.update({
    where: { id },
    data: input,
    select: {
      id: true,
      name: true,
      unit: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// ------------------------------------------------------------
// Soft delete
// ------------------------------------------------------------

export async function deactivateInventoryItem(id: string) {
  await getInventoryItemById(id);

  return prisma.inventoryItem.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      name: true,
      unit: true,
      isActive: true,
      updatedAt: true,
    },
  });
}