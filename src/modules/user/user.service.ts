import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import { adminAuth } from "@/lib/firebases/firebase-admin";
import type { Prisma } from "@/prisma/generated/client";
import type {
  CreateUserInput,
  ListUsersQuery,
  ResetUserPasswordInput,
  UpdatePasswordInput,
  UpdateProfileInput,
  UpdateUserByAdminInput,
} from "./user.validator";

const userSelect = {
  id: true,
  firebaseUid: true,
  role: true,
  status: true,
  name: true,
  phone: true,
  address: true,
  avatarUrl: true,
  idNumber: true,
  birthDate: true,
  joinDate: true,
  addressKtp: true,
  createdAt: true,
  updatedAt: true,
} as const;

function serializeUser<
  T extends {
    birthDate: Date | null;
    joinDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }
>(user: T) {
  return {
    ...user,
    birthDate: user.birthDate ? user.birthDate.toISOString() : null,
    joinDate: user.joinDate ? user.joinDate.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

// ============================================================
// SELF
// ============================================================

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user) {
    throw ApiError.notFound("User tidak ditemukan");
  }

  return serializeUser(user);
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput
) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!existing) {
    throw ApiError.notFound("User tidak ditemukan");
  }

  const data: Record<string, unknown> = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.address !== undefined) data.address = input.address;
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;
  if (input.idNumber !== undefined) data.idNumber = input.idNumber;
  if (input.birthDate !== undefined)
    data.birthDate = input.birthDate ? new Date(input.birthDate) : null;
  if (input.joinDate !== undefined)
    data.joinDate = input.joinDate ? new Date(input.joinDate) : null;
  if (input.addressKtp !== undefined) data.addressKtp = input.addressKtp;

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: userSelect,
  });

  return serializeUser(updated);
}

export async function updateUserPassword(
  firebaseUid: string,
  input: UpdatePasswordInput
) {
  try {
    await adminAuth.updateUser(firebaseUid, {
      password: input.newPassword,
    });
  } catch (err) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? (err as { code: string }).code
        : "";

    if (code === "auth/user-not-found") {
      throw ApiError.notFound("User tidak ditemukan di Firebase");
    }
    if (code === "auth/invalid-password") {
      throw ApiError.unprocessable(
        "Password tidak memenuhi syarat Firebase"
      );
    }
    throw ApiError.internal("Gagal mengganti password");
  }

  return { success: true };
}

// ============================================================
// ADMIN
// ============================================================

export async function listUsers(query: ListUsersQuery) {
  const where: Prisma.UserWhereInput = {};

  if (query.role) {
    where.role = query.role;
  } else if (query.roleGroup === "managed") {
    where.role = { in: ["BARISTA", "CUSTOMER"] };
  } else if (query.roleGroup === "admin") {
    where.role = "ADMIN";
  }
  // roleGroup === "all" → tidak filter role

  if (query.status) where.status = query.status;

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search, mode: "insensitive" } },
      { idNumber: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
      select: userSelect,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: items.map(serializeUser),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
  };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });

  if (!user) {
    throw ApiError.notFound("User tidak ditemukan");
  }

  let email = "";
  try {
    const fbUser = await adminAuth.getUser(user.firebaseUid);
    email = fbUser.email ?? "";
  } catch {
    // ignore
  }

  return { ...serializeUser(user), email };
}

export async function createUser(input: CreateUserInput) {
  // Cek duplikat Firebase
  let existingFirebase;
  try {
    existingFirebase = await adminAuth.getUserByEmail(input.email);
  } catch {
    existingFirebase = null;
  }

  if (existingFirebase) {
    throw ApiError.conflict(
      `Email "${input.email}" sudah terdaftar di Firebase`
    );
  }

  // 1. Buat user di Firebase
  let firebaseUser;
  try {
    firebaseUser = await adminAuth.createUser({
      email: input.email,
      password: input.password,
      emailVerified: true,
    });
  } catch (err) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? (err as { code: string }).code
        : "";

    if (code === "auth/email-already-exists") {
      throw ApiError.conflict(`Email "${input.email}" sudah digunakan`);
    }
    if (code === "auth/invalid-password") {
      throw ApiError.unprocessable(
        "Password tidak memenuhi syarat Firebase"
      );
    }
    throw ApiError.internal("Gagal membuat user di Firebase");
  }

  // 2. Buat row di DB
  try {
    const user = await prisma.user.create({
      data: {
        firebaseUid: firebaseUser.uid,
        role: input.role,
        status: "ACTIVE",
        name: input.name,
        phone: input.phone ?? null,
        address: input.address ?? null,
        idNumber: input.idNumber ?? null,
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
        joinDate: input.joinDate ? new Date(input.joinDate) : null,
        addressKtp: input.addressKtp ?? null,
      },
      select: userSelect,
    });

    return serializeUser(user);
  } catch (err) {
    await adminAuth.deleteUser(firebaseUser.uid).catch(() => {});
    throw err;
  }
}

export async function updateUserByAdmin(
  id: string,
  input: UpdateUserByAdminInput
) {
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!existing) {
    throw ApiError.notFound("User tidak ditemukan");
  }

  // Kalau mengubah role dari ADMIN → non-ADMIN, cek minimal masih ada 1 ADMIN aktif
  if (
    existing.role === "ADMIN" &&
    input.role !== undefined &&
    input.role !== "ADMIN"
  ) {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", status: "ACTIVE" },
    });
    if (adminCount <= 1) {
      throw ApiError.unprocessable(
        "Tidak dapat mengubah role administrator terakhir"
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.address !== undefined) data.address = input.address;
  if (input.role !== undefined) data.role = input.role;
  if (input.status !== undefined) data.status = input.status;
  if (input.idNumber !== undefined) data.idNumber = input.idNumber;
  if (input.birthDate !== undefined)
    data.birthDate = input.birthDate ? new Date(input.birthDate) : null;
  if (input.joinDate !== undefined)
    data.joinDate = input.joinDate ? new Date(input.joinDate) : null;
  if (input.addressKtp !== undefined) data.addressKtp = input.addressKtp;

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: userSelect,
  });

  return serializeUser(updated);
}

/**
 * Soft delete: set status = INACTIVE, disable user di Firebase.
 *
 * Safety:
 * - Tidak boleh menonaktifkan ADMIN terakhir yang masih aktif.
 * - Kalau menonaktifkan ADMIN, harus ada minimal 1 ADMIN aktif lain.
 */
export async function disableUser(id: string) {
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, firebaseUid: true },
  });

  if (!existing) {
    throw ApiError.notFound("User tidak ditemukan");
  }

  if (existing.role === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", status: "ACTIVE" },
    });
    if (adminCount <= 1) {
      throw ApiError.unprocessable(
        "Tidak dapat menonaktifkan administrator terakhir"
      );
    }
  }

  try {
    await adminAuth.updateUser(existing.firebaseUid, {
      disabled: true,
    });
  } catch {
    // continue
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status: "INACTIVE" },
    select: userSelect,
  });

  return serializeUser(updated);
}

export async function resetUserPassword(
  id: string,
  input: ResetUserPasswordInput
) {
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, firebaseUid: true },
  });

  if (!existing) {
    throw ApiError.notFound("User tidak ditemukan");
  }

  try {
    await adminAuth.updateUser(existing.firebaseUid, {
      password: input.newPassword,
    });
  } catch (err) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? (err as { code: string }).code
        : "";
    if (code === "auth/invalid-password") {
      throw ApiError.unprocessable(
        "Password tidak memenuhi syarat Firebase"
      );
    }
    throw ApiError.internal("Gagal mereset password");
  }

  return { success: true };
}