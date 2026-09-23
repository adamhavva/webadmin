import { handleAuth, ok } from "@/lib/api-response";
import { reportFilterSchema } from "@/modules/report/report.validator";
import { getProductionsReport } from "@/modules/report/report.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const filter = reportFilterSchema.parse({
    productId: url.searchParams.get("productId") ?? undefined,
    isActive: url.searchParams.get("isActive") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
  });
  const result = await getProductionsReport(filter);
  return ok(result);
});