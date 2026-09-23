// ============================================================
// API: /api/users/[id]/password
// POST → reset password user (ADMIN)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { resetUserPasswordSchema } from "@/modules/user/user.validator";
import { resetUserPassword } from "@/modules/user/user.service";

export const POST = handleAuth(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const input = resetUserPasswordSchema.parse(body);

  const result = await resetUserPassword(id, input);
  return ok(result);
});