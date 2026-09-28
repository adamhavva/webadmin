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

  // Payment-related API routes that don't need auth
  const publicApiPaths = [
    "/api/payment/notification",
    "/api/auth/",
  ];

  const isPublicApi = publicApiPaths.some((p) => pathname.startsWith(p));

  // API routes - public ones bypass auth, others handled by handleAuth
  if (isApiRoute) {
    if (isPublicApi) {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  // Public pages (no auth required)
  const publicPages = [
    "/orders/simulation",
    "/orders/payment",
    "/orders/payment/success",
  ];

  const isPublicPage = publicPages.some((p) => pathname.includes(p));

  if (isPublicPage) {
    return NextResponse.next();
  }

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
