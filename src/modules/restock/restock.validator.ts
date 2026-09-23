// ============================================================
// RESTOCK VALIDATOR
// ============================================================

import { z } from "zod";

export const createRestockSchema = z.object({
  inventoryItemId: z.string().min(1, "Inventory item wajib dipilih"),
  quantity: z
    .number()
    .positive("Quantity harus lebih dari 0"),
  totalCost: z
    .number()
    .nonnegative("Total cost tidak boleh negatif"),
  supplierName: z
    .string()
    .trim()
    .max(100)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const listRestockQuerySchema = z.object({
  inventoryItemId: z.string().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateRestockInput = z.infer<typeof createRestockSchema>;
export type ListRestockQuery = z.infer<typeof listRestockQuerySchema>;