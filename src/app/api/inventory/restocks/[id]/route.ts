// ============================================================
// API: /api/inventory/restocks/[id]
// GET    → detail restock
// DELETE → void restock (hapus restock + batch kalau belum dikonsumsi)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import {
  getRestockById,
  voidRestock,
} from "@/modules/restock/restock.service";

export const GET = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const restock = await getRestockById(id);
  return ok(restock);
});

export const DELETE = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const result = await voidRestock(id);
  return ok(result);
});