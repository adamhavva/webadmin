// ============================================================
// API: /api/inventory/recipes/[id]/activate
// PATCH → jadikan resep ini aktif (nonaktifkan versi lain produk ini)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { activateRecipe } from "@/modules/recipe/recipe.service";

export const PATCH = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const result = await activateRecipe(id);
  return ok(result);
});