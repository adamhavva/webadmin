// ============================================================
// API: /api/orders/simulation/pay
// POST → Mark DOKU payment as paid (for simulation only)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { z } from "zod";

const payOrderSchema = z.object({
  orderId: z.string().min(1, "Order ID wajib diisi"),
});

// Mark DOKU payment as PAID (simulation)
export const POST = handleAuth(
  async (req) => {
    const body = await req.json();
    const input = payOrderSchema.parse(body);

    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: { payment: true },
    });

    if (!order) {
      throw ApiError.notFound("Order tidak ditemukan");
    }

    if (order.paymentStatus === "PAID") {
      throw ApiError.badRequest("Order sudah lunas");
    }

    if (order.paymentProvider !== "DOKU") {
      throw ApiError.badRequest("Hanya order DOKU yang bisa disimulasikan");
    }

    // Determine new status
    const newStatus = order.status === "PENDING" ? "SEARCHING" : order.status;

    // Update order payment status
    await prisma.$transaction(async (tx) => {
      // Update order
      await tx.order.update({
        where: { id: input.orderId },
        data: {
          paymentStatus: "PAID",
          paidAt: new Date(),
          status: newStatus,
        },
      });

      // Update payment log
      await tx.payment.update({
        where: { orderId: input.orderId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          dokuInvoiceNumber: `DOKU-SIM-${Date.now()}`,
        },
      });

      // Add status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: input.orderId,
          status: newStatus,
          note: "Simulasi pembayaran DOKU berhasil",
          actorRole: "ADMIN",
        },
      });
    });

    return ok({ success: true, orderId: input.orderId, paymentStatus: "PAID" });
  },
  { roles: ["ADMIN"] }
);
