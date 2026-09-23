import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getServerSession } from "next-auth";
import { ApiError } from "./api-error";
import { authOptions, type SessionUser } from "./auth";
import type { UserRole } from "../../prisma/generated/enums";

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function fail(error: ApiFailure["error"], status: number) {
  return NextResponse.json<ApiFailure>(
    { success: false, error },
    { status }
  );
}

function mapError(err: unknown): Response {
  if (err instanceof ZodError) {
    return fail(
      {
        code: "VALIDATION_ERROR",
        message: "Input tidak valid",
        details: err.flatten(),
      },
      422
    );
  }

  if (err instanceof ApiError) {
    return fail(
      { code: err.code, message: err.message, details: err.details },
      err.status
    );
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  ) {
    return fail(
      {
        code: "CONFLICT",
        message: "Data sudah ada (unique constraint)",
        details: (err as { meta?: unknown }).meta,
      },
      409
    );
  }

  console.error("[API ERROR]", err);
  return fail(
    { code: "INTERNAL_ERROR", message: "Terjadi kesalahan pada server" },
    500
  );
}

type RouteCtx = { params: Promise<Record<string, string>> };
type AuthCtx = RouteCtx & { user: SessionUser };

export function handle(
  fn: (req: Request, ctx: RouteCtx) => Promise<Response>
) {
  return async (req: Request, ctx: RouteCtx): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      return mapError(err);
    }
  };
}

export function handleAuth(
  fn: (req: Request, ctx: AuthCtx) => Promise<Response>,
  options?: { roles?: UserRole[] }
) {
  return async (req: Request, ctx: RouteCtx): Promise<Response> => {
    try {
      const session = await getServerSession(authOptions);

      if (!session?.user) {
        throw ApiError.unauthorized("Sesi tidak valid. Silakan login ulang.");
      }

      if (session.user.status !== "ACTIVE") {
        throw ApiError.forbidden("Akun Anda tidak aktif");
      }

      const allowedRoles: UserRole[] = options?.roles ?? ["ADMIN"];
      if (!allowedRoles.includes(session.user.role)) {
        throw ApiError.forbidden(
          "Akses ditolak. WebAdmin hanya untuk administrator."
        );
      }

      const user: SessionUser = {
        id: session.user.id,
        firebaseUid: session.user.firebaseUid,
        email: session.user.email,
        role: session.user.role,
        status: session.user.status,
        name: session.user.name,
        phone: session.user.phone,
        address: session.user.address,
        idNumber: session.user.idNumber,
        birthDate: session.user.birthDate,
        joinDate: session.user.joinDate,
        addressKtp: session.user.addressKtp,
        createdAt: session.user.createdAt,
        updatedAt: session.user.updatedAt,
      };

      return await fn(req, { ...ctx, user });
    } catch (err) {
      return mapError(err);
    }
  };
}