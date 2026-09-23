import { z } from "zod";

// ============================================================
// Item schema
// ============================================================

const recipeItemSchema = z.object({
  inventoryItemId: z.string().min(1, "Bahan wajib dipilih"),
  quantity: z.coerce
    .number({ error: "Quantity harus berupa angka" })
    .positive("Quantity harus lebih dari 0"),
});

// ============================================================
// Create — untuk produk tertentu
// ============================================================

export const createRecipeSchema = z.object({
  productId: z.string().min(1, "Produk wajib dipilih"),
  items: z
    .array(recipeItemSchema)
    .min(1, "Minimal 1 bahan")
    .max(50, "Maksimal 50 bahan"),
});

// ============================================================
// Update — hanya items (productId & version tidak berubah)
// ============================================================

export const updateRecipeSchema = z.object({
  items: z
    .array(recipeItemSchema)
    .min(1, "Minimal 1 bahan")
    .max(50, "Maksimal 50 bahan"),
});

// ============================================================
// List
// ============================================================

export const listRecipeQuerySchema = z.object({
  productId: z.string().optional(),
  isActive: z.enum(["true", "false", "all"]).default("all"),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================
// Types
// ============================================================

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type ListRecipeQuery = z.infer<typeof listRecipeQuerySchema>;
export type RecipeItemInput = z.infer<typeof recipeItemSchema>;