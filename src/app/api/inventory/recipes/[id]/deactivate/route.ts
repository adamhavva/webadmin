// ============================================================
// API: /api/inventory/recipes/[id]/deactivate
// PATCH → nonaktifkan resep ini
//
// Catatan: kalau ini satu-satunya resep aktif produk,
// produk akan tidak punya resep aktif → produksi akan gagal
// sampai ada resep aktif lain. FE sudah menampilkan warning.
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { deactivateRecipe } from "@/modules/recipe/recipe.service";

export const PATCH = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const result = await deactivateRecipe(id);
  return ok(result);
});