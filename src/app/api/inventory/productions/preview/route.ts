// ============================================================
// API: /api/inventory/productions/preview
// POST → simulasi production (hitung kebutuhan + FIFO, TANPA mutasi)
// ============================================================

import { handle, ok } from "@/lib/api-response";
import { previewProductionSchema } from "@/modules/production/production.validator";
import { previewProduction } from "@/modules/production/production.service";

export const POST = handle(async (req) => {
  const body = await req.json();
  const input = previewProductionSchema.parse(body);

  const result = await previewProduction(input);
  return ok(result);
});