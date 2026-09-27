// ============================================================
// API: /api/settings/payment-methods/[code]
// PATCH → update payment method config
// DELETE → delete payment method config
// ============================================================

import { handleAuth, ok, created } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { z } from "zod";
import type { PaymentFeeType } from "@/prisma/generated/enums";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  dokuChannelCode: z.string().nullable().optional(),
  feeType: z.enum(["NONE", "PERCENTAGE", "NOMINAL"]).optional(),
  feeValue: z.number().min(0).optional(),
  icon: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  displayGroup: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const PATCH = handleAuth(
  async (req, ctx) => {
    const { code } = await ctx.params;
    const body = await req.json();
    const input = updateSchema.parse(body);

    const existing = await prisma.paymentMethodConfig.findUnique({
      where: { code },
    });

    if (!existing) {
      throw ApiError.notFound("Payment method tidak ditemukan");
    }

    const updated = await prisma.paymentMethodConfig.update({
      where: { code },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.dokuChannelCode !== undefined && { dokuChannelCode: input.dokuChannelCode }),
        ...(input.feeType !== undefined && { feeType: input.feeType as PaymentFeeType }),
        ...(input.feeValue !== undefined && { feeValue: input.feeValue }),
        ...(input.icon !== undefined && { icon: input.icon }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.displayGroup !== undefined && { displayGroup: input.displayGroup }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      },
    });

    return ok({ item: updated });
  },
  { roles: ["ADMIN"] }
);

export const DELETE = handleAuth(
  async (_req, ctx) => {
    const { code } = await ctx.params;

    const existing = await prisma.paymentMethodConfig.findUnique({
      where: { code },
    });

    if (!existing) {
      throw ApiError.notFound("Payment method tidak ditemukan");
    }

    await prisma.paymentMethodConfig.delete({
      where: { code },
    });

    return ok({ success: true });
  },
  { roles: ["ADMIN"] }
);
