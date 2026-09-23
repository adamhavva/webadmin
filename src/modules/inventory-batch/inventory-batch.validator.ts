import { z } from "zod";

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

export type ListInventoryBatchQuery = z.infer<
  typeof listInventoryBatchQuerySchema
>;