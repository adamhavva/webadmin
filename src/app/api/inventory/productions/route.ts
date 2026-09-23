// ============================================================
// API: /api/inventory/productions
// GET  → list productions (dengan filter tanggal)
// POST → create production (eksekusi FIFO + HPP)
// ============================================================

import { handleAuth, ok, created } from "@/lib/api-response";
import {
  createProductionSchema,
  listProductionQuerySchema,
} from "@/modules/production/production.validator";
import {
  createProduction,
  listProductions,
} from "@/modules/production/production.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const query = listProductionQuerySchema.parse({
    productId: url.searchParams.get("productId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const result = await listProductions(query);
  return ok(result);
});

export const POST = handleAuth(async (req) => {
  const body = await req.json();
  const input = createProductionSchema.parse(body);

  const production = await createProduction(input);
  return created(production);
});