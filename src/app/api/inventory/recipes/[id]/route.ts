// ============================================================
// API: /api/inventory/recipes/[id]
// GET    → detail resep
// PUT    → update resep (replace items, guard: belum dipakai production)
// DELETE → hapus resep (guard: bukan aktif & belum dipakai production)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { updateRecipeSchema } from "@/modules/recipe/recipe.validator";
import {
  deleteRecipe,
  getRecipeById,
  updateRecipe,
} from "@/modules/recipe/recipe.service";

export const GET = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const result = await getRecipeById(id);
  return ok(result);
});

export const PUT = handleAuth(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const input = updateRecipeSchema.parse(body);
  const result = await updateRecipe(id, input);
  return ok(result);
});

export const DELETE = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const result = await deleteRecipe(id);
  return ok(result);
});