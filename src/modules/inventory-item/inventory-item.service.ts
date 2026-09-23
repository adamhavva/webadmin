// ============================================================
// INVENTORY ITEM SERVICE
// Business logic untuk master material.
// ============================================================

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  ListInventoryItemQuery,
} from "./inventory-item.validator";

export async function listInventoryItems(query: ListInventoryItemQuery) {
  const where: {
    isActive?: boolean;
    name?: { contains: string; mode: "insensitive" };
  } = {};

  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }

  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      unit: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return items;
}

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

  return item;
}

export async function createInventoryItem(input: CreateInventoryItemInput) {
  // Cek duplikat nama (case-insensitive)
  const existing = await prisma.inventoryItem.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" } },
    select: { id: true },
  });

  if (existing) {
    throw ApiError.conflict(`Inventory item "${input.name}" sudah ada`);
  }

  return prisma.inventoryItem.create({
    data: {
      name: input.name,
      unit: input.unit,
      isActive: input.isActive
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

export async function updateInventoryItem(
  id: string,
  input: UpdateInventoryItemInput
) {
  await getInventoryItemById(id); // pastikan ada

  if (input.name) {
    const existing = await prisma.inventoryItem.findFirst({
      where: {
        name: { equals: input.name, mode: "insensitive" },
        NOT: { id },
      },
      select: { id: true },
    });

    if (existing) {
      throw ApiError.conflict(`Inventory item "${input.name}" sudah ada`);
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

/**
 * Soft delete: hanya set isActive = false.
 *
 * InventoryItem tidak boleh dihapus permanen karena:
 * - Sudah direferensikan oleh RecipeItem
 * - Sudah direferensikan oleh InventoryBatch
 * - Sudah direferensikan oleh ProductionComponent
 *
 * Menghapus permanen akan merusak histori.
 */
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