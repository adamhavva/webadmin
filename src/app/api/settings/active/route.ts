// ============================================================
// API: /api/settings/active
// GET → map semua setting aktif (dipakai FE order)
// Response: { tax: { name, type, value }, fee_barista: {...}, ... }
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { getActiveSettingsMap } from "@/modules/setting/setting.service";

export const GET = handleAuth(async () => {
  const result = await getActiveSettingsMap();
  return ok(result);
});