// ============================================================
// API: /api/users/[id]
// GET    → detail user (ADMIN)
// PATCH  → update user (ADMIN)
// DELETE → disable user (ADMIN)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { updateUserByAdminSchema } from "@/modules/user/user.validator";
import {
  disableUser,
  getUserById,
  updateUserByAdmin,
} from "@/modules/user/user.service";

export const GET = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const user = await getUserById(id);
  return ok(user);
});

export const PATCH = handleAuth(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const input = updateUserByAdminSchema.parse(body);

  const user = await updateUserByAdmin(id, input);
  return ok(user);
});

export const DELETE = handleAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const user = await disableUser(id);
  return ok(user);
});