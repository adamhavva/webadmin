// ============================================================
// API: /api/inventory/finished-products/[id]
// GET    → detail batch produk jadi
// PATCH  → update remainingQuantity (stock opname)
// DELETE → void (un-restock) — butuh konfirmasi batchCode
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import {
  updateFinishedBatchSchema,
  voidFinishedBatchSchema,
} from "@/modules/finished-products/finished-product.validator";
import {
  getFinishedBatchById,
  updateFinishedBatch,
  voidFinishedBatch,
} from "@/modules/finished-products/finished-product.service";

export const GET = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const result = await getFinishedBatchById(id);
  return ok(result);
});

export const PATCH = handleAuth(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const input = updateFinishedBatchSchema.parse(body);
  const result = await updateFinishedBatch(id, input);
  return ok(result);
});

export const DELETE = handleAuth(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const input = voidFinishedBatchSchema.parse(body);
  const result = await voidFinishedBatch(id, input);
  return ok(result);
});