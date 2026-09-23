// ============================================================
// API: /api/inventory/restocks
// GET  → list restocks
// POST → create restock (sekaligus buat InventoryBatch)
// ============================================================

import { handle, ok, created } from "@/lib/api-response";
import {
  createRestockSchema,
  listRestockQuerySchema,
} from "@/modules/restock/restock.validator";
import {
  createRestock,
  listRestocks,
} from "@/modules/restock/restock.service";

export const GET = handle(async (req) => {
  const url = new URL(req.url);
  const query = listRestockQuerySchema.parse({
    inventoryItemId: url.searchParams.get("inventoryItemId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const result = await listRestocks(query);
  return ok(result);
});

export const POST = handle(async (req) => {
  const body = await req.json();
  const input = createRestockSchema.parse(body);

  const restock = await createRestock(input);
  return created(restock);
});