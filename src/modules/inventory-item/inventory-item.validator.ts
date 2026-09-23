// ============================================================
// INVENTORY ITEM VALIDATOR
// ============================================================

import { z } from "zod";

export const inventoryUnitSchema = z.enum(["ML", "PCS"]);

export const createInventoryItemSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  unit: inventoryUnitSchema,
  isActive: z.boolean().optional().default(true),
});

export const updateInventoryItemSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    unit: inventoryUnitSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Tidak ada field yang diubah",
  });

export const listInventoryItemQuerySchema = z.object({
  search: z.string().trim().optional(),
  isActive: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export type CreateInventoryItemInput = z.infer<
  typeof createInventoryItemSchema
>;
export type UpdateInventoryItemInput = z.infer<
  typeof updateInventoryItemSchema
>;
export type ListInventoryItemQuery = z.infer<
  typeof listInventoryItemQuerySchema
>;