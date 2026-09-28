// ============================================================
// API: /api/settings/payment-methods
// GET  → list payment method configs
// POST → create payment method config
// ============================================================

import { handleAuth, ok, created } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { z } from "zod";
import type { PaymentFeeType } from "@/prisma/generated/enums";

const createSchema = z.object({
  code: z.string().min(1, "Code wajib diisi").max(50),
  name: z.string().min(1, "Nama wajib diisi").max(100),
  providerCode: z.string().min(1, "Provider code wajib diisi"), // e.g., "DOKU"
  dokuChannelCode: z.string().nullable().optional(),
  groupCode: z.string().nullable().optional(),
  groupName: z.string().nullable().optional(),
  feeType: z.enum(["NONE", "PERCENTAGE", "NOMINAL"]),
  feeValue: z.number().min(0),
  icon: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  availableForCustomer: z.boolean().default(true),
  availableForAdmin: z.boolean().default(true),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  dokuChannelCode: z.string().nullable().optional(),
  groupCode: z.string().nullable().optional(),
  groupName: z.string().nullable().optional(),
  feeType: z.enum(["NONE", "PERCENTAGE", "NOMINAL"]).optional(),
  feeValue: z.number().min(0).optional(),
  icon: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  availableForCustomer: z.boolean().optional(),
  availableForAdmin: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const GET = handleAuth(
  async (req) => {
    const url = new URL(req.url);
    const isActive = url.searchParams.get("isActive") === "true";
    const providerCode = url.searchParams.get("provider");

    const where: Record<string, unknown> = {};
    if (isActive) where.isActive = true;
    if (providerCode) {
      where.provider = { code: providerCode };
    }

    const items = await prisma.paymentMethodConfig.findMany({
      where,
      include: { provider: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return ok({ items });
  },
  { roles: ["ADMIN"] }
);

export const POST = handleAuth(
  async (req) => {
    const body = await req.json();
    const input = createSchema.parse(body);

    // Check duplicate code
    const existing = await prisma.paymentMethodConfig.findUnique({
      where: { code: input.code },
    });

    if (existing) {
      throw ApiError.conflict(
        `Payment method dengan code "${input.code}" sudah ada`
      );
    }

    // Get provider
    const provider = await prisma.paymentProviderConfig.findUnique({
      where: { code: input.providerCode },
    });

    if (!provider) {
      throw ApiError.notFound(
        `Payment provider "${input.providerCode}" tidak ditemukan`
      );
    }

    const item = await prisma.paymentMethodConfig.create({
      data: {
        code: input.code,
        name: input.name,
        providerId: provider.id,
        dokuChannelCode: input.dokuChannelCode,
        groupCode: input.groupCode,
        groupName: input.groupName,
        feeType: input.feeType,
        feeValue: input.feeValue,
        icon: input.icon,
        description: input.description,
        availableForCustomer: input.availableForCustomer,
        availableForAdmin: input.availableForAdmin,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      },
    });

    return created({ item });
  },
  { roles: ["ADMIN"] }
);
