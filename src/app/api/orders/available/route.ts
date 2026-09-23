// ============================================================
// API: /api/orders/available
// GET → order yang ditugaskan ke barista login
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { getAvailableOrdersForBarista } from "@/modules/order/order.service";

export const GET = handleAuth(
  async (_req, ctx) => {
    const result = await getAvailableOrdersForBarista(ctx.user.id);
    return ok(result);
  },
  { roles: ["BARISTA"] }
);