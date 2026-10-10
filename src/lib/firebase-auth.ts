import { getAdminAuth } from "@/lib/firebases/firebase-admin";
import { prisma } from "@/lib/db";
import type { SessionUser } from "./auth";

export async function verifyFirebaseToken(
  req: Request
): Promise<SessionUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const idToken = authHeader.slice(7);
  if (!idToken) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);

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

    if (!user || user.status !== "ACTIVE") return null;

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
    };
  } catch {
    return null;
  }
}
