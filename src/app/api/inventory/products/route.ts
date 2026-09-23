// ============================================================
// API: /api/inventory/products
// GET  → list products
// POST → create product
// ============================================================

import { handle, ok, created } from "@/lib/api-response";
import {
  createProductSchema,
  listProductQuerySchema,
} from "@/modules/product/product.validator";
import {
  createProduct,
  listProducts,
} from "@/modules/product/product.service";

export const GET = handle(async (req) => {
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

export const POST = handle(async (req) => {
  const body = await req.json();
  const input = createProductSchema.parse(body);

  const product = await createProduct(input);
  return created(product);
});