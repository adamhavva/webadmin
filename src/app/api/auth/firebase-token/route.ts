// ============================================================
// API: /api/auth/firebase-token
// POST → generate Firebase custom token untuk user NextAuth
//
// Client pakai untuk signInWithCustomToken → Firebase client
// ter-authenticate → bisa akses RTDB langsung.
// ============================================================

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adminAuth } from "@/lib/firebases/firebase-admin";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.firebaseUid) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const customToken = await adminAuth.createCustomToken(
      session.user.firebaseUid
    );

    return NextResponse.json({
      success: true,
      data: { customToken },
    });
  } catch (err) {
    console.error("[firebase-token]", err);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}