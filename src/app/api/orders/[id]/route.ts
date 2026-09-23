// ============================================================
// API: /api/orders/[id]
// GET → detail order
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { getOrderById } from "@/modules/order/order.service";

export const GET = handleAuth(
  async (_req, ctx) => {
    const { id } = await ctx.params;
    const result = await getOrderById(id);
    return ok(result);
  },
  { roles: ["ADMIN", "CUSTOMER", "BARISTA"] }
);