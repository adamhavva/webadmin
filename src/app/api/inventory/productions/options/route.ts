// ============================================================
// API: /api/inventory/productions/options
// GET → product aktif yang punya recipe aktif + stock product jadi
// ============================================================

import { handle, ok } from "@/lib/api-response";
import { getProductionOptions } from "@/modules/production/production.service";

export const GET = handle(async () => {
  const options = await getProductionOptions();
  return ok(options);
});