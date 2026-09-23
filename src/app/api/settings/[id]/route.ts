// ============================================================
// API: /api/settings/[id]
// GET    → detail
// PATCH  → update
// DELETE → hapus
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { updateSettingSchema } from "@/modules/setting/setting.validator";
import {
  deleteSetting,
  getSettingById,
  updateSetting,
} from "@/modules/setting/setting.service";

export const GET = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const result = await getSettingById(id);
  return ok(result);
});

export const PATCH = handleAuth(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const input = updateSettingSchema.parse(body);
  const result = await updateSetting(id, input);
  return ok(result);
});

export const DELETE = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const result = await deleteSetting(id);
  return ok(result);
});