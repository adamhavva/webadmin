// ============================================================
// API: /api/inventory/products/[id]/images
//
// GET  → list images untuk product
// POST → upload image baru (multipart/form-data)
//        field: file (wajib), isPrimary (opsional: "true"/"false")
// ============================================================

import { handleAuth, ok, created } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import {
  listProductImages,
  uploadProductImage,
} from "@/modules/product/product-image.service";

export const GET = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const images = await listProductImages(id);
  return ok(images);
});

export const POST = handleAuth(async (req, ctx) => {
  const { id } = await ctx.params;

  const formData = await req.formData();
  const file = formData.get("file");
  const isPrimaryRaw = formData.get("isPrimary");

  if (!(file instanceof File)) {
    throw ApiError.unprocessable("Field 'file' wajib diisi");
  }

  const isPrimary =
    typeof isPrimaryRaw === "string" && isPrimaryRaw === "true";

  const image = await uploadProductImage({
    productId: id,
    file,
    isPrimary,
  });

  return created(image);
});