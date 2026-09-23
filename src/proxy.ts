// ============================================================
// PROXY (Next.js 16+) — pengganti middleware.ts
//
// Proteksi halaman UI.
// API routes tetap diproteksi oleh handleAuth di masing-masing route.
//
// Proxy berjalan di Node.js runtime, jadi bisa baca session cookie
// NextAuth tanpa masalah Edge compatibility.
// ============================================================

import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  const isApiRoute = pathname.startsWith("/api");
  const isLoginPage = pathname.startsWith("/login");

  // API route → ditangani handleAuth di masing-masing route
  if (isApiRoute) return NextResponse.next();

  // Ambil session token dari cookie NextAuth
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  const isLoggedIn = !!token;
  const isAdmin = token?.role === "ADMIN";

  // Halaman login
  if (isLoginPage) {
    if (isLoggedIn && isAdmin) {
      return NextResponse.redirect(new URL("/inventory/items", url));
    }
    return NextResponse.next();
  }

  // Halaman lain → wajib login + ADMIN
  if (!isLoggedIn || !isAdmin) {
    return NextResponse.redirect(new URL("/login", url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};