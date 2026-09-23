// ============================================================
// API: /api/inventory/restocks
// GET  → list restocks
// POST → create restock (single atau bulk — auto detect)
//
// Body single:
//   { inventoryItemId, quantity, totalCost, supplierName? }
//
// Body bulk:
//   { items: [{ inventoryItemId, quantity, totalCost }, ...], supplierName? }
//
// Response (selalu array):
//   { success: true, data: { count, items: [...] } }
// ============================================================

import { handleAuth, ok, created } from "@/lib/api-response";
import {
  createRestockSchema,
  listRestockQuerySchema,
} from "@/modules/restock/restock.validator";
import {
  createRestock,
  listRestocks,
} from "@/modules/restock/restock.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const query = listRestockQuerySchema.parse({
    inventoryItemId: url.searchParams.get("inventoryItemId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const result = await listRestocks(query);
  return ok(result);
});

export const POST = handleAuth(async (req) => {
  const body = await req.json();

  // createRestockSchema adalah union — terima single atau bulk.
  // Transform di schema mengubah keduanya jadi { supplierName, items: [...] }.
  const input = createRestockSchema.parse(body);

  const result = await createRestock(input);
  return created(result);
});