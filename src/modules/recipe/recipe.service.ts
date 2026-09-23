// ============================================================
// RECIPE SERVICE
//
// Aturan:
// - Recipe menunjuk ke InventoryItem, BUKAN InventoryBatch.
// - Hanya SATU recipe aktif per Product.
// - Saat set isActive = true → non-aktifkan recipe lain.
// - Semua InventoryItem harus ada dan aktif.
// ============================================================

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type { Prisma } from "@/prisma/generated/client";
import type {
  CreateRecipeInput,
  ListRecipeQuery,
  RecipeItemInput,
  UpdateRecipeInput,
} from "./recipe.validator";

/**
 * Validasi semua inventoryItemId di dalam items:
 * - harus ada
 * - harus aktif
 * - tidak duplikat (sudah dicek Zod, ini double check)
 */
async function validateInventoryItems(
  tx: Prisma.TransactionClient,
  items: RecipeItemInput[]
) {
  const ids = items.map((i) => i.inventoryItemId);

  const found = await tx.inventoryItem.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, isActive: true },
  });

  if (found.length !== ids.length) {
    const foundIds = new Set(found.map((f) => f.id));
    const missing = ids.filter((id) => !foundIds.has(id));
    throw ApiError.unprocessable(
      `Inventory item tidak ditemukan: ${missing.join(", ")}`
    );
  }

  const inactive = found.filter((f) => !f.isActive);
  if (inactive.length > 0) {
    throw ApiError.unprocessable(
      `Inventory item tidak aktif: ${inactive.map((i) => i.name).join(", ")}`
    );
  }
}

/**
 * Auto-generate version kalau tidak dikirim.
 * Version = max(version) + 1 untuk product tsb.
 */
async function generateVersion(
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

const recipeDetailSelect = {
  id: true,
  productId: true,
  version: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  product: {
    select: { id: true, name: true, sellingPrice: true },
  },
  items: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      inventoryItemId: true,
      quantity: true,
      inventoryItem: {
        select: { id: true, name: true, unit: true, isActive: true },
      },
    },
  },
};

export async function createRecipe(input: CreateRecipeInput) {
  // Pastikan product ada
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, name: true },
  });

  if (!product) {
    throw ApiError.notFound("Product tidak ditemukan");
  }

  return prisma.$transaction(async (tx) => {
    await validateInventoryItems(tx, input.items);

    const version = input.version ?? (await generateVersion(tx, product.id));

    // Cek duplikat version
    const existingVersion = await tx.productRecipe.findUnique({
      where: {
        productId_version: { productId: product.id, version },
      },
      select: { id: true },
    });

    if (existingVersion) {
      throw ApiError.conflict(
        `Recipe versi ${version} untuk product "${product.name}" sudah ada`
      );
    }

    // Kalau isActive true, non-aktifkan yang lain
    if (input.isActive) {
      await tx.productRecipe.updateMany({
        where: { productId: product.id, isActive: true },
        data: { isActive: false },
      });
    }

    return tx.productRecipe.create({
      data: {
        productId: product.id,
        version,
        isActive: input.isActive,
        items: {
          create: input.items.map((i) => ({
            inventoryItemId: i.inventoryItemId,
            quantity: i.quantity,
          })),
        },
      },
      select: recipeDetailSelect,
    });
  });
}

export async function listRecipes(query: ListRecipeQuery) {
  const where: Prisma.ProductRecipeWhereInput = {};

  if (query.productId) where.productId = query.productId;
  if (query.isActive !== undefined) where.isActive = query.isActive;

  const items = await prisma.productRecipe.findMany({
    where,
    orderBy: [{ productId: "asc" }, { version: "desc" }],
    select: {
      id: true,
      productId: true,
      version: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      product: {
        select: { id: true, name: true, sellingPrice: true },
      },
      _count: { select: { items: true } },
    },
  });

  return items;
}

export async function getRecipeById(id: string) {
  const recipe = await prisma.productRecipe.findUnique({
    where: { id },
    select: recipeDetailSelect,
  });

  if (!recipe) {
    throw ApiError.notFound("Recipe tidak ditemukan");
  }

  return recipe;
}

export async function updateRecipe(id: string, input: UpdateRecipeInput) {
  const existing = await prisma.productRecipe.findUnique({
    where: { id },
    select: { id: true, productId: true, isActive: true },
  });

  if (!existing) {
    throw ApiError.notFound("Recipe tidak ditemukan");
  }

  return prisma.$transaction(async (tx) => {
    // Kalau update items, validasi item-item baru
    if (input.items) {
      await validateInventoryItems(tx, input.items);
    }

    // Kalau mau aktifkan recipe ini, non-aktifkan yang lain
    if (input.isActive === true) {
      await tx.productRecipe.updateMany({
        where: {
          productId: existing.productId,
          isActive: true,
          NOT: { id },
        },
        data: { isActive: false },
      });
    }

    // Update recipe + replace items jika dikirim
    return tx.productRecipe.update({
      where: { id },
      data: {
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.items && {
          items: {
            deleteMany: {},
            create: input.items.map((i) => ({
              inventoryItemId: i.inventoryItemId,
              quantity: i.quantity,
            })),
          },
        }),
      },
      select: recipeDetailSelect,
    });
  });
}

/**
 * Soft delete: set isActive = false.
 *
 * Recipe tidak dihapus permanen karena:
 * - Recipe dapat direferensikan oleh Production history di masa depan.
 * - Version history harus tetap ada.
 */
export async function deactivateRecipe(id: string) {
  const existing = await prisma.productRecipe.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw ApiError.notFound("Recipe tidak ditemukan");
  }

  return prisma.productRecipe.update({
    where: { id },
    data: { isActive: false },
    select: recipeDetailSelect,
  });
}