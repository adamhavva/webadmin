// ============================================================
// API: /api/reports/orders
// GET → laporan order lengkap
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { orderReportQuerySchema } from "@/modules/report/order-report.validator";
import { getOrderReport } from "@/modules/report/order-report.service";

export const GET = handleAuth(
  async (req) => {
    const url = new URL(req.url);
    const query = orderReportQuerySchema.parse({
      status: url.searchParams.get("status") ?? undefined,
      channel: url.searchParams.get("channel") ?? undefined,
      paymentMethodCode:
        url.searchParams.get("paymentMethodCode") ?? undefined,
      baristaId: url.searchParams.get("baristaId") ?? undefined,
      customerId: url.searchParams.get("customerId") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    const result = await getOrderReport(query);
    return ok(result);
  },
  { roles: ["ADMIN"] }
);