// ============================================================
// API: /api/orders/[id]/cancel
// POST → cancel order (ADMIN / CUSTOMER)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { cancelOrderSchema } from "@/modules/order/order.validator";
import { cancelOrder } from "@/modules/order/order.service";

export const POST = handleAuth(
  async (req, ctx) => {
    const { id } = await ctx.params;
    const body = await req.json();
    const input = cancelOrderSchema.parse(body);

    const result = await cancelOrder(
      id,
      input,
      ctx.user.id,
      ctx.user.role
    );
    return ok(result);
  },
  { roles: ["ADMIN", "CUSTOMER"] }
);