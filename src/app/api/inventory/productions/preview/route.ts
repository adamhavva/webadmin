// ============================================================
// API: /api/inventory/productions/preview
// POST → simulasi produksi (dry-run, tanpa mutasi)
//
// Body:
//   { productId: "...", outputQuantity: 10 }
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { previewProductionSchema } from "@/modules/production/production.validator";
import { previewProduction } from "@/modules/production/production.service";

export const POST = handleAuth(async (req) => {
  const body = await req.json();
  const input = previewProductionSchema.parse(body);
  const result = await previewProduction(input);
  return ok(result);
});