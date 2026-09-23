// ============================================================
// API: /api/orders/[id]/accept
// POST → barista accept order
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { acceptOrder } from "@/modules/order/order.service";

export const POST = handleAuth(
  async (_req, ctx) => {
    const { id } = await ctx.params;
    const result = await acceptOrder(id, ctx.user.id);
    return ok(result);
  },
  { roles: ["BARISTA"] }
);