import { handle, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";

export const GET = handle(async (_req, ctx) => {
  const { baristaId, productId } = await ctx.params;

  const stock = await prisma.baristaStock.findUnique({
    where: {
      baristaId_productId: { baristaId, productId },
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
      barista: {
        select: { id: true, name: true },
      },
    },
  });

  if (!stock) throw ApiError.notFound("Stok tidak ditemukan");

  return ok({
    productId: stock.productId,
    productName: stock.product.name,
    productIsActive: stock.product.isActive,
    sellingPrice: Number(stock.product.sellingPrice),
    quantity: stock.quantity,
    minThreshold: stock.minThreshold,
    isLow: stock.quantity < stock.minThreshold,
    lastRestockAt: stock.lastRestockAt?.toISOString() ?? null,
    baristaId: stock.baristaId,
    baristaName: stock.barista.name,
  });
});
