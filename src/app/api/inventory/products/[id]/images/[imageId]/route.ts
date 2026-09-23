// ============================================================
// API: /api/inventory/products/[id]/images/[imageId]
//
// PATCH  → update isPrimary / sortOrder
// DELETE → hapus gambar (R2 + DB)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { updateProductImageSchema } from "@/modules/product/product-image.validator";
import {
  deleteProductImage,
  updateProductImage,
} from "@/modules/product/product-image.service";

export const PATCH = handleAuth(async (req, ctx) => {
  const { id, imageId } = await ctx.params;
  const body = await req.json();
  const input = updateProductImageSchema.parse(body);

  const image = await updateProductImage(id, imageId, input);
  return ok(image);
});

export const DELETE = handleAuth(async (_req, ctx) => {
  const { id, imageId } = await ctx.params;
  const result = await deleteProductImage(id, imageId);
  return ok(result);
});