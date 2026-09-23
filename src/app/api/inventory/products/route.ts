// ============================================================
// API: /api/inventory/products
//
// GET  → list products (dengan filter search, isActive, pagination)
// POST → create product baru (termasuk description + metadata)
//
// Body POST:
//   {
//     name: string,
//     description?: string | null,
//     sellingPrice: number,
//     isActive?: boolean,
//     metadata?: Array<{ key: string, value: string }>
//   }
// ============================================================

import { handleAuth, ok, created } from "@/lib/api-response";
import {
  createProductSchema,
  listProductQuerySchema,
} from "@/modules/product/product.validator";
import {
  createProduct,
  listProducts,
} from "@/modules/product/product.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const query = listProductQuerySchema.parse({
    search: url.searchParams.get("search") ?? undefined,
    isActive: url.searchParams.get("isActive") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const result = await listProducts(query);
  return ok(result);
});

export const POST = handleAuth(async (req) => {
  const body = await req.json();
  const input = createProductSchema.parse(body);

  const product = await createProduct(input);
  return created(product);
});