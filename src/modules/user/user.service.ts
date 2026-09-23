import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import { adminAuth } from "@/lib/firebases/firebase-admin";
import type {
  UpdatePasswordInput,
  UpdateProfileInput,
} from "./user.validator";

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
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
    },
  });

  if (!user) {
    throw ApiError.notFound("User tidak ditemukan");
  }

  return user;
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
    select: {
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
    },
  });

  return {
    ...updated,
    birthDate: updated.birthDate ? updated.birthDate.toISOString() : null,
    joinDate: updated.joinDate ? updated.joinDate.toISOString() : null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
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