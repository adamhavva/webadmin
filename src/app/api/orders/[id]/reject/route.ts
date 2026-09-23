// ============================================================
// API: /api/orders/[id]/reject
// POST → barista reject order
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { rejectOrderSchema } from "@/modules/order/order.validator";
import { rejectOrder } from "@/modules/order/order.service";

export const POST = handleAuth(
  async (req, ctx) => {
    const { id } = await ctx.params;
    const body = await req.json();
    const input = rejectOrderSchema.parse(body);
    const result = await rejectOrder(id, ctx.user.id, input);
    return ok(result);
  },
  { roles: ["BARISTA"] }
);