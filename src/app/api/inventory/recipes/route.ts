// ============================================================
// API: /api/inventory/recipes
// GET  → list recipes (bisa filter productId, isActive)
// POST → create recipe (dengan items)
// ============================================================

import { handle, ok, created } from "@/lib/api-response";
import {
  createRecipeSchema,
  listRecipeQuerySchema,
} from "@/modules/recipe/recipe.validator";
import {
  createRecipe,
  listRecipes,
} from "@/modules/recipe/recipe.service";

export const GET = handle(async (req) => {
  const url = new URL(req.url);
  const query = listRecipeQuerySchema.parse({
    productId: url.searchParams.get("productId") ?? undefined,
    isActive: url.searchParams.get("isActive") ?? undefined,
  });

  const recipes = await listRecipes(query);
  return ok(recipes);
});

export const POST = handle(async (req) => {
  const body = await req.json();
  const input = createRecipeSchema.parse(body);

  const recipe = await createRecipe(input);
  return created(recipe);
});