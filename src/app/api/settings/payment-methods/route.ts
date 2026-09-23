// ============================================================
// API: /api/settings/payment-methods
// GET → list payment method configs (untuk dropdown filter)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";

export const GET = handleAuth(
  async (req) => {
    const url = new URL(req.url);
    const isActive = url.searchParams.get("isActive") === "true";

    const items = await prisma.paymentMethodConfig.findMany({
      where: isActive ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        code: true,
        name: true,
        provider: true,
        displayGroup: true,
        icon: true,
        isActive: true,
      },
    });

    return ok({ items });
  },
  { roles: ["ADMIN", "BARISTA", "CUSTOMER"] }
);