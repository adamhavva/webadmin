// ============================================================
// API: /api/inventory/recipes/[id]
// GET    → detail recipe
// PATCH  → update recipe (bisa replace items / activate)
// DELETE → soft delete recipe
// ============================================================

import { handle, ok } from "@/lib/api-response";
import { updateRecipeSchema } from "@/modules/recipe/recipe.validator";
import {
  deactivateRecipe,
  getRecipeById,
  updateRecipe,
} from "@/modules/recipe/recipe.service";

export const GET = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  const recipe = await getRecipeById(id);
  return ok(recipe);
});

export const PATCH = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const input = updateRecipeSchema.parse(body);

  const recipe = await updateRecipe(id, input);
  return ok(recipe);
});

export const DELETE = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  const recipe = await deactivateRecipe(id);
  return ok(recipe);
});