// ============================================================
// NEXTAUTH CONFIG (next-auth v4)
//
// Firebase Auth (email/password) sebagai identity provider.
//
// CATATAN: avatarUrl IKUT dimasukkan ke JWT agar tersedia di
// session (dipakai nav-user.tsx). Kalau cookie jadi terlalu besar,
// pertimbangkan pindah ke /api/auth/me.
// ============================================================

import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { adminAuth } from "@/lib/firebases/firebase-admin";
import { prisma } from "@/lib/db";
import type { UserRole, UserStatus } from "@/prisma/generated/enums";

export type SessionUser = {
  id: string;
  firebaseUid: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  name: string
  phone: string | null;
  address: string | null;
  avatarUrl: string | null;
  idNumber: string | null;
  birthDate: string | null;
  joinDate: string | null;
  addressKtp: string | null;
  createdAt: string;
  updatedAt: string;
};

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Firebase",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials) {
        const idToken = credentials?.idToken;
        if (typeof idToken !== "string" || idToken.length === 0) {
          return null;
        }

        let decoded;
        try {
          decoded = await adminAuth.verifyIdToken(idToken);
        } catch {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { firebaseUid: decoded.uid },
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

        if (!user) return null;
        if (user.status !== "ACTIVE") return null;
        if (user.role !== "ADMIN") return null;

        return {
          id: user.id,
          firebaseUid: user.firebaseUid,
          email: decoded.email ?? "",
          role: user.role,
          status: user.status,
          name: user.name,
          phone: user.phone,
          address: user.address,
          avatarUrl: user.avatarUrl,
          idNumber: user.idNumber,
          birthDate: user.birthDate ? user.birthDate.toISOString() : null,
          joinDate: user.joinDate ? user.joinDate.toISOString() : null,
          addressKtp: user.addressKtp,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        } as SessionUser & { id: string };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as SessionUser;
        token.id = u.id;
        token.firebaseUid = u.firebaseUid;
        token.email = u.email;
        token.role = u.role;
        token.status = u.status;
        token.name = u.name;
        token.phone = u.phone;
        token.address = u.address;
        token.avatarUrl = u.avatarUrl;
        token.idNumber = u.idNumber;
        token.birthDate = u.birthDate;
        token.joinDate = u.joinDate;
        token.addressKtp = u.addressKtp;
        token.createdAt = u.createdAt;
        token.updatedAt = u.updatedAt;
      }

      if (!token.email && token.firebaseUid) {
        try {
          const fbUser = await adminAuth.getUser(
            token.firebaseUid as string
          );
          token.email = fbUser.email ?? "";
        } catch {
          // biarkan kosong
        }
      }

      if (trigger === "update" && session) {
        if (typeof session.name === "string") token.name = session.name;
        if (typeof session.phone === "string" || session.phone === null)
          token.phone = session.phone;
        if (typeof session.address === "string" || session.address === null)
          token.address = session.address;
        if (
          typeof session.avatarUrl === "string" ||
          session.avatarUrl === null
        )
          token.avatarUrl = session.avatarUrl;
        if (
          typeof session.idNumber === "string" ||
          session.idNumber === null
        )
          token.idNumber = session.idNumber;
        if (
          typeof session.birthDate === "string" ||
          session.birthDate === null
        )
          token.birthDate = session.birthDate;
        if (
          typeof session.joinDate === "string" ||
          session.joinDate === null
        )
          token.joinDate = session.joinDate;
        if (
          typeof session.addressKtp === "string" ||
          session.addressKtp === null
        )
          token.addressKtp = session.addressKtp;
        if (typeof session.updatedAt === "string")
          token.updatedAt = session.updatedAt;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.firebaseUid = token.firebaseUid as string;
        session.user.email = (token.email as string) ?? "";
        session.user.role = token.role as UserRole;
        session.user.status = token.status as UserStatus;
        session.user.name = (token.name as string) ?? "";
        session.user.phone = (token.phone as string | null) ?? null;
        session.user.address = (token.address as string | null) ?? null;
        session.user.avatarUrl =
          (token.avatarUrl as string | null) ?? null;
        session.user.idNumber =
          (token.idNumber as string | null) ?? null;
        session.user.birthDate =
          (token.birthDate as string | null) ?? null;
        session.user.joinDate =
          (token.joinDate as string | null) ?? null;
        session.user.addressKtp =
          (token.addressKtp as string | null) ?? null;
        session.user.createdAt = (token.createdAt as string) ?? "";
        session.user.updatedAt = (token.updatedAt as string) ?? "";
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};