// ============================================================
// API: /api/inventory/items
// GET  → list inventory items
// POST → create inventory item
// ============================================================

import { handle, ok, created } from "@/lib/api-response";
import {
  createInventoryItemSchema,
  listInventoryItemQuerySchema,
} from "@/modules/inventory-item/inventory-item.validator";
import {
  createInventoryItem,
  listInventoryItems,
} from "@/modules/inventory-item/inventory-item.service";

export const GET = handle(async (req) => {
  const url = new URL(req.url);
  const query = listInventoryItemQuerySchema.parse({
    search: url.searchParams.get("search") ?? undefined,
    isActive: url.searchParams.get("isActive") ?? undefined,
  });

  const items = await listInventoryItems(query);
  return ok(items);
});

export const POST = handle(async (req) => {
  const body = await req.json();
  const input = createInventoryItemSchema.parse(body);

  const item = await createInventoryItem(input);
  return created(item);
});