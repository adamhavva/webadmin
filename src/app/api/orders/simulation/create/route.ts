// ============================================================
// API: /api/orders/simulation/create
// POST → create simulation order (offline/cash flow)
// ============================================================

import { handleAuth, created, fail } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { z } from "zod";
import {
  computeCharges,
  computePaymentFee,
  generateOrderNumber,
} from "@/modules/order/order.charge.service";

const createSimulationSchema = z.object({
  baristaId: z.string().min(1, "Barista wajib dipilih"),
  customerName: z.string().min(1, "Nama customer wajib diisi"),
  customerPhone: z.string().optional(),
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
    const input = createSimulationSchema.parse(body);

    // 1. Validasi: pastikan barista punya stok cukup
    const baristaStocks = await prisma.baristaStock.findMany({
      where: {
        baristaId: input.baristaId,
        productId: { in: input.items.map((i) => i.productId) },
      },
    });

    const stockMap = new Map(
      baristaStocks.map((s) => [s.productId, s.quantity])
    );

    // 2. Cek produk & harga
    const productIds = input.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sellingPrice: true, isActive: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const computedItems: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }> = [];

    let subtotal = 0;

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

      computedItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        subtotal: itemSubtotal,
      });
    }

    // 3. Hitung charges dari Setting (pajak, dll)
    const { charges, chargesTotal } = await computeCharges(subtotal);

    // 4. Hitung payment fee dari PaymentMethodConfig
    const payment = await computePaymentFee(input.paymentMethodCode, subtotal);
    const isCOD = payment.method.provider === "CASH";

    const deliveryFee = 0;
    const total = subtotal + chargesTotal + payment.feeAmount + deliveryFee;

    const orderNumber = await generateOrderNumber();

    // 5. Transaction — buat order, kurangi stock, log movement
    const order = await prisma.$transaction(
      async (tx) => {
        // Create order
        const o = await tx.order.create({
          data: {
            orderNumber,
            channel: "OFFLINE",
            customerName: input.customerName,
            customerPhone: input.customerPhone ?? null,
            status: "COMPLETED",
            subtotal,
            chargesTotal,
            deliveryFee,
            total,
            paymentStatus: "PAID",
            paymentProvider: payment.method.provider,
            paymentChannel: isCOD ? "COD" : "PREPAID",
            paymentMethodCode: payment.method.code,
            paymentMethodName: payment.method.name,
            paymentMethodGroup: payment.method.displayGroup,
            paymentFeeAmount: payment.feeAmount,
            dokuPaymentMethod: payment.method.dokuChannelCode,
            completedAt: new Date(),
            actualDeliveryAt: new Date(),
            paidAt: new Date(),
          },
        });

        // Create order items
        await tx.orderItem.createMany({
          data: computedItems.map((it) => ({
            orderId: o.id,
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            subtotal: it.subtotal,
          })),
        });

        // Create charges snapshot
        if (charges.length > 0) {
          await tx.orderCharge.createMany({
            data: charges.map((c) => ({
              orderId: o.id,
              settingKey: c.settingKey,
              settingName: c.settingName,
              type: c.type,
              rateValue: c.rateValue,
              amount: c.amount,
              sortOrder: c.sortOrder,
            })),
          });
        }

        // Status history
        await tx.orderStatusHistory.create({
          data: {
            orderId: o.id,
            status: "COMPLETED",
            note: "Simulasi order selesai",
          },
        });

        // Payment log
        await tx.payment.create({
          data: {
            orderId: o.id,
            amount: total,
            provider: payment.method.provider,
            methodCode: payment.method.code,
            methodName: payment.method.name,
            methodGroup: payment.method.displayGroup,
            methodFeeAmount: payment.feeAmount,
            status: "PAID",
            paidAt: new Date(),
            dokuChannelCode: payment.method.dokuChannelCode,
          },
        });

        // Kurangi stock barista & log movement
        for (const item of computedItems) {
          const stock = await tx.baristaStock.findUnique({
            where: {
              baristaId_productId: {
                baristaId: input.baristaId,
                productId: item.productId,
              },
            },
          });

          if (stock) {
            const newQty = stock.quantity - item.quantity;
            await tx.baristaStock.update({
              where: { id: stock.id },
              data: { quantity: newQty },
            });

            await tx.baristaStockMovement.create({
              data: {
                baristaId: input.baristaId,
                productId: item.productId,
                type: "SOLD",
                quantity: -item.quantity,
                balanceAfter: newQty,
                orderId: o.id,
                note: `Simulasi order ${orderNumber}`,
              },
            });
          }
        }

        return o;
      },
      { timeout: 30000 }
    );

    return created({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentChannel: order.paymentChannel,
      paymentMethod: {
        code: payment.method.code,
        name: payment.method.name,
        provider: payment.method.provider,
      },
      subtotal,
      chargesTotal,
      paymentFeeAmount: payment.feeAmount,
      deliveryFee,
      total,
    });
  },
  { roles: ["ADMIN"] }
);
