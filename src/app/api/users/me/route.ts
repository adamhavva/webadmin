import { handleAuth, ok } from "@/lib/api-response";
import { getUserProfile } from "@/modules/user/user.service";

export const GET = handleAuth(async (_req, ctx) => {
  const profile = await getUserProfile(ctx.user.id);
  return ok({
    ...profile,
    email: ctx.user.email,
  });
});
