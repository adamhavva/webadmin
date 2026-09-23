// ============================================================
// API: /api/settings
// GET  → list settings
// POST → create setting
// ============================================================

import { handleAuth, ok, created } from "@/lib/api-response";
import {
  createSettingSchema,
  listSettingQuerySchema,
} from "@/modules/setting/setting.validator";
import {
  createSetting,
  listSettings,
} from "@/modules/setting/setting.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const query = listSettingQuerySchema.parse({
    search: url.searchParams.get("search") ?? undefined,
    isActive: url.searchParams.get("isActive") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
  });

  const result = await listSettings(query);
  return ok(result);
});

export const POST = handleAuth(async (req) => {
  const body = await req.json();
  const input = createSettingSchema.parse(body);
  const result = await createSetting(input);
  return created(result);
});