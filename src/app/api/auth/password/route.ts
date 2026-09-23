// ============================================================
// API: /api/auth/me/password
// PATCH → ganti password Firebase user yang sedang login
//
// Verifikasi current password dilakukan di FE (reauthenticate).
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { updatePasswordSchema } from "@/modules/user/user.validator";
import { updateUserPassword } from "@/modules/user/user.service";

export const PATCH = handleAuth(async (req, ctx) => {
  const body = await req.json();
  const input = updatePasswordSchema.parse(body);

  const result = await updateUserPassword(ctx.user.firebaseUid, input);
  return ok(result);
});