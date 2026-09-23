// ============================================================
// API: /api/orders
// GET  → list orders (ADMIN)
// POST → create order (ADMIN / CUSTOMER / BARISTA)
// ============================================================

import { handleAuth, ok, created } from "@/lib/api-response";
import {
  createOrderSchema,
  listOrderQuerySchema,
} from "@/modules/order/order.validator";
import {
  createOrder,
  listOrders,
} from "@/modules/order/order.service";

export const GET = handleAuth(
  async (req) => {
    const url = new URL(req.url);
    const query = listOrderQuerySchema.parse({
      customerId: url.searchParams.get("customerId") ?? undefined,
      baristaId: url.searchParams.get("baristaId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      channel: url.searchParams.get("channel") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    const result = await listOrders(query);
    return ok(result);
  },
  { roles: ["ADMIN"] }
);

export const POST = handleAuth(
  async (req, ctx) => {
    const body = await req.json();
    const input = createOrderSchema.parse(body);

    // Auto-set customerId untuk CUSTOMER online
    const customerId =
      input.channel === "ONLINE" && ctx.user.role === "CUSTOMER"
        ? ctx.user.id
        : input.customerId;

    const result = await createOrder({
      ...input,
      customerId,
    });
    return created(result);
  },
  { roles: ["ADMIN", "CUSTOMER", "BARISTA"] }
);