// ============================================================
// API: /api/inventory/items
// GET  → list inventory items
// POST → create inventory item
// ============================================================
import { handleAuth, ok, created } from "@/lib/api-response";
import {
  createInventoryItemSchema,
  listInventoryItemQuerySchema,
} from "@/modules/inventory-item/inventory-item.validator";
import {
  createInventoryItem,
  listInventoryItems,
} from "@/modules/inventory-item/inventory-item.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const query = listInventoryItemQuerySchema.parse({
    search: url.searchParams.get("search") ?? undefined,
    isActive: url.searchParams.get("isActive") ?? undefined,
    stockStatus: url.searchParams.get("stockStatus") ?? undefined,
    lowStockThreshold:
      url.searchParams.get("lowStockThreshold") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const result = await listInventoryItems(query);
  return ok(result);
});

export const POST = handleAuth(async (req) => {
  const body = await req.json();
  const input = createInventoryItemSchema.parse(body);

  const item = await createInventoryItem(input);
  return created(item);
});