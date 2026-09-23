// ============================================================
// API: /api/inventory/productions/[id]
// GET → detail production (component + finished batch)
// ============================================================

import { handle, ok } from "@/lib/api-response";
import { getProductionById } from "@/modules/production/production.service";

export const GET = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  const production = await getProductionById(id);
  return ok(production);
});