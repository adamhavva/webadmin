import type { DefaultSession, DefaultUser } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { UserRole, UserStatus } from "../../prisma/generated/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      firebaseUid: string;
      email: string;
      role: UserRole;
      status: UserStatus;
      name: string;
      phone: string | null;
      address: string | null;
      idNumber: string | null;
      birthDate: string | null;
      joinDate: string | null;
      addressKtp: string | null;
      createdAt: string;
      updatedAt: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    firebaseUid: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    name: string;
    phone: string | null;
    address: string | null;
    idNumber: string | null;
    birthDate: string | null;
    joinDate: string | null;
    addressKtp: string | null;
    createdAt: string;
    updatedAt: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    firebaseUid: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    name: string;
    phone: string | null;
    address: string | null;
    idNumber: string | null;
    birthDate: string | null;
    joinDate: string | null;
    addressKtp: string | null;
    createdAt: string;
    updatedAt: string;
  }
}