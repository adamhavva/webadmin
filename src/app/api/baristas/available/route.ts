// ============================================================
// API: /api/baristas/available
// GET → daftar barista dengan stok produk tersedia (untuk POS/simulation)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";

export const GET = handleAuth(async () => {
  const { prisma } = await import("@/lib/db");

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
      baristaStocks: {
        where: {
          quantity: { gt: 0 },
          product: {
            isActive: true,
          },
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
    .filter((item) => item.productCount > 0);

  return ok({ items });
});
