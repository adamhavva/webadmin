// ============================================================
// API: /api/orders/simulation/preview
// POST → preview simulation order calculation
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { z } from "zod";
import {
  computeCharges,
  computePaymentFee,
} from "@/modules/order/order.charge.service";

const previewSimulationSchema = z.object({
  baristaId: z.string().min(1, "Barista wajib dipilih"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Produk wajib dipilih"),
        quantity: z.number().int().positive("Quantity harus lebih dari 0"),
      })
    )
    .min(1, "Minimal 1 produk"),
  paymentMethodCode: z.string().min(1, "Metode pembayaran wajib dipilih"),
});

export const POST = handleAuth(
  async (req) => {
    const body = await req.json();
    const input = previewSimulationSchema.parse(body);

    // Validasi barista
    const barista = await prisma.user.findUnique({
      where: { id: input.baristaId },
      select: { id: true, name: true, role: true },
    });

    if (!barista || barista.role !== "BARISTA") {
      throw ApiError.notFound("Barista tidak ditemukan");
    }

    // Validasi produk
    const productIds = input.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sellingPrice: true, isActive: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validasi stok barista
    const baristaStocks = await prisma.baristaStock.findMany({
      where: {
        baristaId: input.baristaId,
        productId: { in: productIds },
      },
    });
    const stockMap = new Map(
      baristaStocks.map((s) => [s.productId, s.quantity])
    );

    let subtotal = 0;
    const items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      availableStock: number;
    }> = [];

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw ApiError.unprocessable(`Produk tidak ditemukan`);
      }
      if (!product.isActive) {
        throw ApiError.unprocessable(
          `Produk "${product.name}" sedang tidak aktif`
        );
      }

      const availableStock = stockMap.get(item.productId) ?? 0;
      if (availableStock < item.quantity) {
        throw ApiError.unprocessable(
          `Stok "${product.name}" tidak cukup. Tersedia: ${availableStock}, diminta: ${item.quantity}`
        );
      }

      const unitPrice = Number(product.sellingPrice);
      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      items.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        subtotal: itemSubtotal,
        availableStock,
      });
    }

    // Hitung charges & payment fee
    const { charges, chargesTotal } = await computeCharges(subtotal);
    const payment = await computePaymentFee(input.paymentMethodCode, subtotal);

    const deliveryFee = 0;
    const total = subtotal + chargesTotal + payment.feeAmount + deliveryFee;

    return ok({
      baristaName: barista.name,
      items,
      subtotal,
      charges,
      chargesTotal,
      paymentMethod: {
        code: payment.method.code,
        name: payment.method.name,
        provider: payment.method.provider,
      },
      paymentFeeAmount: payment.feeAmount,
      deliveryFee,
      total,
      paymentProvider: payment.method.provider,
      paymentChannel:
        payment.method.provider === "CASH" ? "COD" : "PREPAID",
    });
  },
  { roles: ["ADMIN"] }
);
