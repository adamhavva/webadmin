import { handleAuth, ok } from "@/lib/api-response";
import { updateProfileSchema } from "@/modules/user/user.validator";
import {
  getUserProfile,
  updateUserProfile,
} from "@/modules/user/user.service";

export const GET = handleAuth(async (_req, ctx) => {
  const profile = await getUserProfile(ctx.user.id);
  return ok({
    ...profile,
    email: ctx.user.email,
  });
});

export const PATCH = handleAuth(async (req, ctx) => {
  const body = await req.json();
  const input = updateProfileSchema.parse(body);

  const updated = await updateUserProfile(ctx.user.id, input);
  return ok({
    ...updated,
    email: ctx.user.email,
  });
});