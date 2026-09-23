// ============================================================
// API: /api/inventory/products/[id]
//
// GET    → detail product (dengan recipes, images, metadata)
// PATCH  → update product
// DELETE → soft delete
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { updateProductSchema } from "@/modules/product/product.validator";
import {
  deactivateProduct,
  getProductById,
  updateProduct,
} from "@/modules/product/product.service";

export const GET = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const product = await getProductById(id);
  return ok(product);
});

export const PATCH = handleAuth(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const input = updateProductSchema.parse(body);

  const product = await updateProduct(id, input);
  return ok(product);
});

export const DELETE = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const product = await deactivateProduct(id);
  return ok(product);
});