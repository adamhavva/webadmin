import { handleAuth, ok, created } from "@/lib/api-response";
import {
  createUserSchema,
  listUsersQuerySchema,
} from "@/modules/user/user.validator";
import { createUser, listUsers } from "@/modules/user/user.service";

export const GET = handleAuth(async (req) => {
  const url = new URL(req.url);
  const query = listUsersQuerySchema.parse({
    search: url.searchParams.get("search") ?? undefined,
    roleGroup: url.searchParams.get("roleGroup") ?? undefined,
    role: url.searchParams.get("role") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const result = await listUsers(query);
  return ok(result);
});

export const POST = handleAuth(async (req) => {
  const body = await req.json();
  const input = createUserSchema.parse(body);

  const user = await createUser(input);
  return created(user);
});