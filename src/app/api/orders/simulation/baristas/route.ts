// ============================================================
// API: /api/orders/simulation/baristas
// GET → list baristas with their stock (for simulation)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";

export const GET = handleAuth(
  async () => {
    const baristas = await prisma.user.findMany({
      where: {
        role: "BARISTA",
        status: "ACTIVE",
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        baristaStocks: {
          where: {
            quantity: { gt: 0 },
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sellingPrice: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    const items = baristas
      .map((b) => {
        const products = b.baristaStocks
          .filter((s) => s.product.isActive)
          .map((s) => ({
            productId: s.productId,
            productName: s.product.name,
            sellingPrice: Number(s.product.sellingPrice),
            availableStock: s.quantity,
          }));

        return {
          baristaId: b.id,
          baristaName: b.name,
          baristaPhone: b.phone,
          productCount: products.length,
          products,
        };
      })
      .filter((b) => b.productCount > 0); // Only baristas with stock

    return ok({ items });
  },
  { roles: ["ADMIN"] }
);
