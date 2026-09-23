// ============================================================
// API: /api/orders/[id]/complete
// POST → complete order
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { completeOrderSchema } from "@/modules/order/order.validator";
import { completeOrder } from "@/modules/order/order.service";

export const POST = handleAuth(
  async (req, ctx) => {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const input = completeOrderSchema.parse(body);
    const result = await completeOrder(id, input);
    return ok(result);
  },
  { roles: ["BARISTA", "CUSTOMER", "ADMIN"] }
);