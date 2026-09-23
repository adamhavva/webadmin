// ============================================================
// API: /api/inventory/restocks/[id]
// GET → detail restock
// ============================================================

import { handle, ok } from "@/lib/api-response";
import { getRestockById } from "@/modules/restock/restock.service";

export const GET = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  const restock = await getRestockById(id);
  return ok(restock);
});