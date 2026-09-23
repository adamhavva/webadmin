import { z } from "zod";

// ============================================================
// List
// ============================================================

export const listInventoryBatchQuerySchema = z.object({
  inventoryItemId: z.string().optional(),
  search: z.string().trim().optional(),
  onlyAvailable: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================
// Update remainingQuantity (stock opname)
// ============================================================

export const updateInventoryBatchSchema = z.object({
  remainingQuantity: z.coerce
    .number({ error: "Sisa harus berupa angka" })
    .nonnegative("Sisa tidak boleh negatif"),
});

// ============================================================
// Types
// ============================================================

export type ListInventoryBatchQuery = z.infer<
  typeof listInventoryBatchQuerySchema
>;
export type UpdateInventoryBatchInput = z.infer<
  typeof updateInventoryBatchSchema
>;