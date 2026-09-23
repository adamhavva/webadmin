import { z } from "zod";

// ============================================================
// List
// ============================================================

export const listFinishedBatchQuerySchema = z.object({
  productId: z.string().optional(),
  search: z.string().trim().optional(),
  status: z.enum(["all", "available", "empty"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================
// Update remainingQuantity (stock opname)
// ============================================================

export const updateFinishedBatchSchema = z.object({
  remainingQuantity: z.coerce
    .number({ error: "Sisa harus berupa angka" })
    .nonnegative("Sisa tidak boleh negatif"),
});

// ============================================================
// Void (un-restock) — wajib konfirmasi batchCode
// ============================================================

export const voidFinishedBatchSchema = z.object({
  batchCode: z
    .string()
    .trim()
    .min(1, "Batch code wajib diisi untuk konfirmasi"),
  voidNote: z
    .string()
    .trim()
    .max(500, "Catatan maksimal 500 karakter")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// ============================================================
// Types
// ============================================================

export type ListFinishedBatchQuery = z.infer<
  typeof listFinishedBatchQuerySchema
>;
export type UpdateFinishedBatchInput = z.infer<
  typeof updateFinishedBatchSchema
>;
export type VoidFinishedBatchInput = z.infer<
  typeof voidFinishedBatchSchema
>;