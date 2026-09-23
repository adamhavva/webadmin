// ============================================================
// API: /api/inventory/recipes
// GET  → list recipes (filter by productId, isActive, search)
// POST → create recipe baru (versi baru)
//
// Body create:
//   {
//     productId: "...",
//     items: [{ inventoryItemId, quantity }, ...]
//   }
// ============================================================

import { handleAuth, ok, created } from "@/lib/api-response";
import {
  createRecipeSchema,
  listRecipeQuerySchema,
} from "@/modules/recipe/recipe.validator";
import {
  createRecipe,
  listRecipes,
} from "@/modules/recipe/recipe.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const query = listRecipeQuerySchema.parse({
    productId: url.searchParams.get("productId") ?? undefined,
    isActive: url.searchParams.get("isActive") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const result = await listRecipes(query);
  return ok(result);
});

export const POST = handleAuth(async (req) => {
  const body = await req.json();
  const input = createRecipeSchema.parse(body);
  const result = await createRecipe(input);
  return created(result);
});