// ============================================================
// API: /api/inventory/productions/[id]
// GET → detail produksi
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { getProductionById } from "@/modules/production/production.service";

export const GET = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const result = await getProductionById(id);
  return ok(result);
});