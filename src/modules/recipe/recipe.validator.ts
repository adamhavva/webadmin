// ============================================================
// RECIPE VALIDATOR
// ============================================================

import { z } from "zod";

export const recipeItemInputSchema = z.object({
  inventoryItemId: z.string().min(1, "Inventory item wajib dipilih"),
  quantity: z.number().positive("Quantity harus lebih dari 0"),
});

export const createRecipeSchema = z
  .object({
    productId: z.string().min(1, "Product wajib dipilih"),
    version: z.number().int().positive().optional(),
    isActive: z.boolean().optional().default(true),
    items: z
      .array(recipeItemInputSchema)
      .min(1, "Recipe harus memiliki minimal 1 item"),
  })
  .refine(
    (v) => {
      const ids = v.items.map((i) => i.inventoryItemId);
      return new Set(ids).size === ids.length;
    },
    { message: "Inventory item tidak boleh duplikat dalam satu recipe" }
  );

export const updateRecipeSchema = z
  .object({
    isActive: z.boolean().optional(),
    items: z
      .array(recipeItemInputSchema)
      .min(1, "Recipe harus memiliki minimal 1 item")
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Tidak ada field yang diubah",
  })
  .refine(
    (v) => {
      if (!v.items) return true;
      const ids = v.items.map((i) => i.inventoryItemId);
      return new Set(ids).size === ids.length;
    },
    { message: "Inventory item tidak boleh duplikat dalam satu recipe" }
  );

export const listRecipeQuerySchema = z.object({
  productId: z.string().optional(),
  isActive: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export type RecipeItemInput = z.infer<typeof recipeItemInputSchema>;
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type ListRecipeQuery = z.infer<typeof listRecipeQuerySchema>;