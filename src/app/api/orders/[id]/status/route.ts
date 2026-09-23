// ============================================================
// API: /api/orders/[id]/status
// POST → barista update status (DELIVERING, ARRIVED)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { updateOrderStatusSchema } from "@/modules/order/order.validator";
import { updateOrderStatus } from "@/modules/order/order.service";

export const POST = handleAuth(
  async (req, ctx) => {
    const { id } = await ctx.params;
    const body = await req.json();
    const input = updateOrderStatusSchema.parse(body);
    const result = await updateOrderStatus(id, ctx.user.id, input);
    return ok(result);
  },
  { roles: ["BARISTA"] }
);