// ============================================================
// API: /api/orders/preview
// POST → hitung harga (subtotal + charge) tanpa buat order
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { previewOrderSchema } from "@/modules/order/order.validator";
import { previewOrder } from "@/modules/order/order.service";

export const POST = handleAuth(
  async (req) => {
    const body = await req.json();
    const input = previewOrderSchema.parse(body);
    const result = await previewOrder(input);
    return ok(result);
  },
  { roles: ["ADMIN", "CUSTOMER", "BARISTA"] }
);