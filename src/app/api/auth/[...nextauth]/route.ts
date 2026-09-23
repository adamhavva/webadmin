// ============================================================
// NEXTAUTH ROUTE HANDLER (next-auth v4)
//
// Menangani: /api/auth/signin, /api/auth/signout,
//            /api/auth/session, /api/auth/callback, dll.
// ============================================================

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };