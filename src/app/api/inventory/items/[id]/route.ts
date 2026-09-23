import { handleAuth, ok } from "@/lib/api-response";
import { updateInventoryItemSchema } from "@/modules/inventory-item/inventory-item.validator";
import {
  deactivateInventoryItem,
  getInventoryItemById,
  updateInventoryItem,
} from "@/modules/inventory-item/inventory-item.service";

export const GET = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const item = await getInventoryItemById(id);
  return ok(item);
});

export const PATCH = handleAuth(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const input = updateInventoryItemSchema.parse(body);

  const item = await updateInventoryItem(id, input);
  return ok(item);
});

export const DELETE = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const item = await deactivateInventoryItem(id);
  return ok(item);
});