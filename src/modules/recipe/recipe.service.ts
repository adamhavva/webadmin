import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import {
  computeFifoForRequests,
  getTotalStockMap,
  type FifoAllocation,
} from "@/modules/inventory-batch/inventory-batch.fifo";
import type { Prisma } from "../../../prisma/generated/client";
import type {
  CreateRecipeInput,
  ListRecipeQuery,
  RecipeItemInput,
  UpdateRecipeInput,
} from "./recipe.validator";

// ============================================================
// Internal Helpers
// ============================================================

async function getNextVersion(
  tx: Prisma.TransactionClient,
  productId: string
): Promise<number> {
  const latest = await tx.productRecipe.findFirst({
    where: { productId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  return (latest?.version ?? 0) + 1;
}

async function hasProductionSince(
  productId: string,
  since: Date
): Promise<boolean> {
  const count = await prisma.production.count({
    where: {
      productId,
      createdAt: { gte: since },
    },
  });
  return count > 0;
}

async function validateItems(items: RecipeItemInput[]) {
  const itemIds = items.map((i) => i.inventoryItemId);
  const uniqueIds = new Set(itemIds);

  if (uniqueIds.size !== itemIds.length) {
    throw ApiError.unprocessable(
      "Bahan tidak boleh duplikat dalam satu resep. Gabungkan jadi satu baris."
    );
  }

  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, name: true, unit: true, isActive: true },
  });
  const itemMap = new Map(inventoryItems.map((i) => [i.id, i]));

  for (let i = 0; i < items.length; i++) {
    const row = items[i];
    const inv = itemMap.get(row.inventoryItemId);

    if (!inv) {
      throw ApiError.unprocessable(`Baris #${i + 1}: bahan tidak ditemukan`);
    }
    if (!inv.isActive) {
      throw ApiError.unprocessable(
        `Baris #${i + 1}: bahan "${inv.name}" sedang tidak aktif`
      );
    }
    if (row.quantity <= 0) {
      throw ApiError.unprocessable(
        `Baris #${i + 1}: quantity harus lebih dari 0`
      );
    }
  }

  return itemMap;
}

/**
 * Hitung margin (%).
 * - null kalau harga jual ≤ 0 atau HPP = 0 (tidak bisa dihitung)
 * - bisa negatif (rugi) kalau HPP > harga jual
 */
function computeMargin(
  sellingPrice: number,
  totalHpp: number
): number | null {
  if (sellingPrice <= 0) return null;
  if (totalHpp <= 0) return null;
  return ((sellingPrice - totalHpp) / sellingPrice) * 100;
}

// ============================================================
// Serializer — enrich items dengan FIFO HPP
// ============================================================

type RawRecipeItem = {
  id: string;
  inventoryItemId: string;
  quantity: unknown;
  inventoryItem: {
    id: string;
    name: string;
    unit: string;
    isActive?: boolean;
  };
};

type SerializedRecipeItem = {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string;
  unit: string;
  isActive: boolean;
  quantity: number;
  unitCost: number | null;
  subtotal: number | null;
  availableStock: number;
  fulfilled: boolean;
  shortage: number;
  allocations: FifoAllocation[];
};

type SerializedRecipe = {
  items: SerializedRecipeItem[];
  totalHpp: number;
  totalFulfilled: boolean;
  unavailableItems: string[];
};

async function serializeRecipeItems(
  items: RawRecipeItem[]
): Promise<SerializedRecipe> {
  if (items.length === 0) {
    return {
      items: [],
      totalHpp: 0,
      totalFulfilled: true,
      unavailableItems: [],
    };
  }

  const requests = items.map((it) => ({
    inventoryItemId: it.inventoryItemId,
    quantity: Number(it.quantity),
  }));

  const itemIds = [...new Set(items.map((it) => it.inventoryItemId))];

  const [fifoMap, stockMap] = await Promise.all([
    computeFifoForRequests(requests),
    getTotalStockMap(itemIds),
  ]);

  const serialized: SerializedRecipeItem[] = items.map((it, idx) => {
    const qty = Number(it.quantity);
    const fifo = fifoMap.get(idx);
    const unitCost = fifo?.effectiveUnitCost ?? null;
    const subtotal = fifo && fifo.totalQuantity > 0 ? fifo.totalCost : null;
    const availableStock = stockMap.get(it.inventoryItemId) ?? 0;

    return {
      id: it.id,
      inventoryItemId: it.inventoryItemId,
      inventoryItemName: it.inventoryItem.name,
      unit: it.inventoryItem.unit,
      isActive: it.inventoryItem.isActive ?? true,
      quantity: qty,
      unitCost,
      subtotal,
      availableStock,
      fulfilled: fifo?.fulfilled ?? false,
      shortage: fifo?.shortage ?? qty,
      allocations: fifo?.allocations ?? [],
    };
  });

  const totalHpp = serialized.reduce(
    (sum, it) => sum + (it.subtotal ?? 0),
    0
  );

  const totalFulfilled = serialized.every((it) => it.fulfilled);

  const unavailableItems = serialized
    .filter((it) => !it.fulfilled)
    .map((it) => it.inventoryItemName);

  return { items: serialized, totalHpp, totalFulfilled, unavailableItems };
}

// ============================================================
// Create
// ============================================================

export async function createRecipe(input: CreateRecipeInput) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, name: true, isActive: true },
  });

  if (!product) throw ApiError.notFound("Produk tidak ditemukan");
  if (!product.isActive) {
    throw ApiError.unprocessable(
      `Produk "${product.name}" sedang tidak aktif`
    );
  }

  await validateItems(input.items);

  const result = await prisma.$transaction(
    async (tx) => {
      const existingActive = await tx.productRecipe.findFirst({
        where: { productId: input.productId, isActive: true },
        select: { id: true },
      });

      const shouldBeActive = !existingActive;
      const version = await getNextVersion(tx, input.productId);

      const recipe = await tx.productRecipe.create({
        data: {
          productId: input.productId,
          version,
          isActive: shouldBeActive,
          items: {
            create: input.items.map((i) => ({
              inventoryItemId: i.inventoryItemId,
              quantity: i.quantity,
            })),
          },
        },
        include: {
          items: {
            include: {
              inventoryItem: {
                select: { id: true, name: true, unit: true },
              },
            },
          },
        },
      });

      return recipe;
    },
    { timeout: 30000 }
  );

  const serialized = await serializeRecipeItems(result.items);

  return {
    success: true,
    recipe: {
      id: result.id,
      productId: result.productId,
      version: result.version,
      isActive: result.isActive,
      ...serialized,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    },
  };
}

// ============================================================
// List
// ============================================================

export async function listRecipes(query: ListRecipeQuery) {
  const where: Prisma.ProductRecipeWhereInput = {};

  if (query.productId) where.productId = query.productId;

  if (query.isActive === "true") where.isActive = true;
  else if (query.isActive === "false") where.isActive = false;

  if (query.search) {
    where.product = {
      name: { contains: query.search, mode: "insensitive" },
    };
  }

  const skip = (query.page - 1) * query.limit;

  const [recipes, total] = await Promise.all([
    prisma.productRecipe.findMany({
      where,
      orderBy: [{ productId: "asc" }, { version: "desc" }],
      skip,
      take: query.limit,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            isActive: true,
            sellingPrice: true,
          },
        },
        items: {
          include: {
            inventoryItem: {
              select: { id: true, name: true, unit: true },
            },
          },
        },
        _count: { select: { items: true } },
      },
    }),
    prisma.productRecipe.count({ where }),
  ]);

  const [activeCount, productCount] = await Promise.all([
    prisma.productRecipe.count({ where: { ...where, isActive: true } }),
    prisma.productRecipe
      .findMany({
        where,
        select: { productId: true },
        distinct: ["productId"],
      })
      .then((rows) => rows.length),
  ]);

  const items = await Promise.all(
    recipes.map(async (r) => {
      const serialized = await serializeRecipeItems(r.items);
      const sellingPrice = Number(r.product.sellingPrice);
      const estimatedMargin = computeMargin(
        sellingPrice,
        serialized.totalHpp
      );

      return {
        id: r.id,
        productId: r.productId,
        productName: r.product.name,
        productIsActive: r.product.isActive,
        productSellingPrice: sellingPrice,
        version: r.version,
        isActive: r.isActive,
        itemCount: r._count.items,
        items: serialized.items,
        totalHpp: serialized.totalHpp,
        totalFulfilled: serialized.totalFulfilled,
        unavailableItems: serialized.unavailableItems,
        estimatedMargin,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    })
  );

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
    summary: {
      activeCount,
      productCount,
      totalCount: total,
    },
  };
}

// ============================================================
// Detail
// ============================================================

export async function getRecipeById(id: string) {
  const recipe = await prisma.productRecipe.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          isActive: true,
          sellingPrice: true,
        },
      },
      items: {
        include: {
          inventoryItem: {
            select: {
              id: true,
              name: true,
              unit: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  if (!recipe) throw ApiError.notFound("Resep tidak ditemukan");

  const usedInProduction = await hasProductionSince(
    recipe.productId,
    recipe.createdAt
  );

  const canEdit = !usedInProduction;
  const canDelete = !recipe.isActive && !usedInProduction;

  const serialized = await serializeRecipeItems(recipe.items);

  const sellingPrice = Number(recipe.product.sellingPrice);
  const estimatedMargin = computeMargin(sellingPrice, serialized.totalHpp);

  const latestCost = await prisma.productCostHistory.findFirst({
    where: { productId: recipe.productId },
    orderBy: { createdAt: "desc" },
    select: { hpp: true, createdAt: true },
  });

  return {
    id: recipe.id,
    productId: recipe.productId,
    product: {
      id: recipe.product.id,
      name: recipe.product.name,
      isActive: recipe.product.isActive,
      sellingPrice,
    },
    version: recipe.version,
    isActive: recipe.isActive,
    items: serialized.items,
    totalHpp: serialized.totalHpp,
    totalFulfilled: serialized.totalFulfilled,
    unavailableItems: serialized.unavailableItems,
    estimatedMargin,
    latestHpp: latestCost
      ? {
          hpp: Number(latestCost.hpp),
          createdAt: latestCost.createdAt.toISOString(),
        }
      : null,
    canEdit,
    canDelete,
    usedInProduction,
    createdAt: recipe.createdAt.toISOString(),
    updatedAt: recipe.updatedAt.toISOString(),
  };
}

// ============================================================
// Update (replace all items)
// ============================================================

export async function updateRecipe(id: string, input: UpdateRecipeInput) {
  const recipe = await prisma.productRecipe.findUnique({
    where: { id },
    select: {
      id: true,
      productId: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!recipe) throw ApiError.notFound("Resep tidak ditemukan");

  const usedInProduction = await hasProductionSince(
    recipe.productId,
    recipe.createdAt
  );

  if (usedInProduction) {
    throw ApiError.unprocessable(
      "Resep ini sudah pernah dipakai di produksi. " +
        "Buat versi baru untuk mengubah komposisi (agar HPP historis tetap utuh)."
    );
  }

  await validateItems(input.items);

  const result = await prisma.$transaction(
    async (tx) => {
      await tx.recipeItem.deleteMany({ where: { recipeId: id } });

      const updated = await tx.productRecipe.update({
        where: { id },
        data: {
          items: {
            create: input.items.map((i) => ({
              inventoryItemId: i.inventoryItemId,
              quantity: i.quantity,
            })),
          },
        },
        include: {
          items: {
            include: {
              inventoryItem: {
                select: { id: true, name: true, unit: true },
              },
            },
          },
        },
      });

      return updated;
    },
    { timeout: 30000 }
  );

  const serialized = await serializeRecipeItems(result.items);

  return {
    success: true,
    recipe: {
      id: result.id,
      productId: result.productId,
      version: result.version,
      isActive: result.isActive,
      ...serialized,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    },
  };
}

// ============================================================
// Activate
// ============================================================

export async function activateRecipe(id: string) {
  const recipe = await prisma.productRecipe.findUnique({
    where: { id },
    select: {
      id: true,
      productId: true,
      isActive: true,
      version: true,
    },
  });

  if (!recipe) throw ApiError.notFound("Resep tidak ditemukan");

  if (recipe.isActive) {
    return {
      success: true,
      message: "Resep ini sudah aktif",
      recipeId: recipe.id,
      productId: recipe.productId,
      version: recipe.version,
    };
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.productRecipe.updateMany({
        where: { productId: recipe.productId, isActive: true },
        data: { isActive: false },
      });

      await tx.productRecipe.update({
        where: { id: recipe.id },
        data: { isActive: true },
      });
    },
    { timeout: 30000 }
  );

  return {
    success: true,
    recipeId: recipe.id,
    productId: recipe.productId,
    version: recipe.version,
  };
}

// ============================================================
// Deactivate
// ============================================================

export async function deactivateRecipe(id: string) {
  const recipe = await prisma.productRecipe.findUnique({
    where: { id },
    select: {
      id: true,
      productId: true,
      isActive: true,
      version: true,
    },
  });

  if (!recipe) throw ApiError.notFound("Resep tidak ditemukan");

  if (!recipe.isActive) {
    throw ApiError.unprocessable("Resep ini sudah nonaktif.");
  }

  // Set nonaktif (produk jadi tidak punya resep aktif — admin sudah dikasih
  // warning di FE). Kalau produk tetap isActive=true, Production akan
  // gagal sampai ada resep aktif lain diaktifkan.
  await prisma.productRecipe.update({
    where: { id: recipe.id },
    data: { isActive: false },
  });

  return {
    success: true,
    recipeId: recipe.id,
    productId: recipe.productId,
    version: recipe.version,
  };
}

// ============================================================
// Delete
// ============================================================

export async function deleteRecipe(id: string) {
  const recipe = await prisma.productRecipe.findUnique({
    where: { id },
    select: {
      id: true,
      productId: true,
      version: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!recipe) throw ApiError.notFound("Resep tidak ditemukan");

  if (recipe.isActive) {
    throw ApiError.unprocessable(
      "Resep aktif tidak bisa dihapus. Nonaktifkan dulu, baru hapus."
    );
  }

  const usedInProduction = await hasProductionSince(
    recipe.productId,
    recipe.createdAt
  );

  if (usedInProduction) {
    throw ApiError.unprocessable(
      "Resep ini sudah pernah dipakai di produksi. Tidak bisa dihapus untuk menjaga HPP historis."
    );
  }

  await prisma.productRecipe.delete({ where: { id } });

  return {
    success: true,
    deletedRecipeId: recipe.id,
    productId: recipe.productId,
    version: recipe.version,
  };
}