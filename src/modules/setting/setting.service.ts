import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type { Prisma } from "@/prisma/generated/client";
import type {
  CreateSettingInput,
  ListSettingQuery,
  UpdateSettingInput,
} from "./setting.validator";

// ============================================================
// List
// ============================================================

export async function listSettings(query: ListSettingQuery) {
  const where: Prisma.SettingWhereInput = {};

  if (query.isActive === "true") where.isActive = true;
  else if (query.isActive === "false") where.isActive = false;

  if (query.type !== "all") where.type = query.type;

  if (query.search) {
    where.OR = [
      { key: { contains: query.search, mode: "insensitive" } },
      { name: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.setting.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return {
    items: items.map((s) => ({
      id: s.id,
      key: s.key,
      name: s.name,
      description: s.description,
      type: s.type,
      value: Number(s.value),
      isActive: s.isActive,
      sortOrder: s.sortOrder,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    summary: {
      total: items.length,
      activeCount: items.filter((s) => s.isActive).length,
      percentageCount: items.filter((s) => s.type === "PERCENTAGE").length,
      nominalCount: items.filter((s) => s.type === "NOMINAL").length,
    },
  };
}

// ============================================================
// Detail
// ============================================================

export async function getSettingById(id: string) {
  const setting = await prisma.setting.findUnique({ where: { id } });
  if (!setting) throw ApiError.notFound("Setting tidak ditemukan");

  return {
    id: setting.id,
    key: setting.key,
    name: setting.name,
    description: setting.description,
    type: setting.type,
    value: Number(setting.value),
    isActive: setting.isActive,
    sortOrder: setting.sortOrder,
    createdAt: setting.createdAt.toISOString(),
    updatedAt: setting.updatedAt.toISOString(),
  };
}

// ============================================================
// Get by key (untuk internal use — order, payment, dll)
// ============================================================

export async function getSettingByKey(key: string) {
  const setting = await prisma.setting.findUnique({ where: { key } });
  if (!setting || !setting.isActive) return null;

  return {
    key: setting.key,
    name: setting.name,
    type: setting.type,
    value: Number(setting.value),
  };
}

// ============================================================
// Get all active — untuk dipakai di FE order
// ============================================================

export async function getActiveSettingsMap(): Promise<
  Record<string, { name: string; type: "PERCENTAGE" | "NOMINAL"; value: number }>
> {
  const items = await prisma.setting.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const map: Record<
    string,
    { name: string; type: "PERCENTAGE" | "NOMINAL"; value: number }
  > = {};

  for (const s of items) {
    map[s.key] = {
      name: s.name,
      type: s.type as "PERCENTAGE" | "NOMINAL",
      value: Number(s.value),
    };
  }

  return map;
}

// ============================================================
// Create
// ============================================================

export async function createSetting(input: CreateSettingInput) {
  // Cek key unik
  const existing = await prisma.setting.findUnique({
    where: { key: input.key },
    select: { id: true },
  });
  if (existing) {
    throw ApiError.unprocessable(
      `Key "${input.key}" sudah dipakai. Gunakan key lain.`
    );
  }

  const setting = await prisma.setting.create({
    data: {
      key: input.key,
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      value: input.value,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
    },
  });

  return {
    success: true,
    setting: {
      id: setting.id,
      key: setting.key,
      name: setting.name,
      description: setting.description,
      type: setting.type,
      value: Number(setting.value),
      isActive: setting.isActive,
      sortOrder: setting.sortOrder,
      createdAt: setting.createdAt.toISOString(),
      updatedAt: setting.updatedAt.toISOString(),
    },
  };
}

// ============================================================
// Update
// ============================================================

export async function updateSetting(id: string, input: UpdateSettingInput) {
  const existing = await prisma.setting.findUnique({
    where: { id },
    select: { id: true, type: true, value: true },
  });
  if (!existing) throw ApiError.notFound("Setting tidak ditemukan");

  // Kalau type atau value berubah, validasi konsistensi
  const finalType = input.type ?? existing.type;
  const finalValue =
    input.value !== undefined ? input.value : Number(existing.value);

  if (finalType === "PERCENTAGE" && finalValue > 100) {
    throw ApiError.unprocessable(
      "Persentase tidak boleh lebih dari 100%"
    );
  }

  const updateData: Prisma.SettingUpdateInput = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined)
    updateData.description = input.description ?? null;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.value !== undefined) updateData.value = input.value;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;
  if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

  const setting = await prisma.setting.update({
    where: { id },
    data: updateData,
  });

  return {
    success: true,
    setting: {
      id: setting.id,
      key: setting.key,
      name: setting.name,
      description: setting.description,
      type: setting.type,
      value: Number(setting.value),
      isActive: setting.isActive,
      sortOrder: setting.sortOrder,
      createdAt: setting.createdAt.toISOString(),
      updatedAt: setting.updatedAt.toISOString(),
    },
  };
}

// ============================================================
// Delete
// ============================================================

export async function deleteSetting(id: string) {
  const setting = await prisma.setting.findUnique({
    where: { id },
    select: { id: true, key: true, name: true },
  });
  if (!setting) throw ApiError.notFound("Setting tidak ditemukan");

  await prisma.setting.delete({ where: { id } });

  return {
    success: true,
    deletedSettingId: setting.id,
    key: setting.key,
    name: setting.name,
  };
}