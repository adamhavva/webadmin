// ============================================================
// API: /api/inventory/restocks/[id]
// GET    → detail restock
// DELETE → void restock (butuh konfirmasi batchCode)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { voidRestockSchema } from "@/modules/restock/restock.validator";
import {
  getRestockById,
  voidRestock,
} from "@/modules/restock/restock.service";

export const GET = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const restock = await getRestockById(id);
  return ok(restock);
});

export const DELETE = handleAuth(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const input = voidRestockSchema.parse(body);

  const result = await voidRestock(id, input);
  return ok(result);
});