import { prisma } from "@/lib/db";
import type {
  PaymentFeeType,
  SettingType,
} from "@/prisma/generated/enums";

// ============================================================
// Types
// ============================================================

export type ComputedCharge = {
  settingKey: string;
  settingName: string;
  type: SettingType;
  rateValue: number;
  amount: number;
  sortOrder: number;
};

export type ComputedCharges = {
  charges: ComputedCharge[];
  chargesTotal: number;
};

export type ComputedPaymentFee = {
  method: {
    code: string;
    name: string;
    groupCode: string | null;
    groupName: string | null;
    providerId: string;
    providerCode: string;
    dokuChannelCode: string | null;
  };
  feeAmount: number;
};

// ============================================================
// Hitung semua charge aktif (dari Setting) berdasarkan subtotal
// ============================================================

export async function computeCharges(
  subtotal: number
): Promise<ComputedCharges> {
  const settings = await prisma.setting.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const charges: ComputedCharge[] = settings.map((s) => {
    const type = s.type as SettingType;
    const rateValue = Number(s.value);

    let amount = 0;
    if (type === "PERCENTAGE") {
      amount = (subtotal * rateValue) / 100;
    } else {
      amount = rateValue;
    }

    return {
      settingKey: s.key,
      settingName: s.name,
      type,
      rateValue,
      amount: Math.round(amount),
      sortOrder: s.sortOrder,
    };
  });

  const chargesTotal = charges.reduce((sum, c) => sum + c.amount, 0);

  return { charges, chargesTotal };
}

// ============================================================
// Hitung payment fee dari PaymentMethodConfig
// ============================================================

export async function computePaymentFee(
  methodCode: string | undefined,
  subtotal: number
): Promise<ComputedPaymentFee> {
  // Default ke QRIS jika tidak ada methodCode
  const code = methodCode || 'QRIS';

  const method = await prisma.paymentMethodConfig.findUnique({
    where: { code: code },
    include: { provider: true },
  });

  if (!method) {
    throw new Error(
      `Metode pembayaran "${code}" tidak ditemukan`
    );
  }

  if (!method.isActive) {
    throw new Error(
      `Metode pembayaran "${method.name}" sedang tidak aktif`
    );
  }

  const feeType = method.feeType as PaymentFeeType;
  const feeValue = Number(method.feeValue);
  let feeAmount = 0;

  if (feeType === "PERCENTAGE") {
    feeAmount = (subtotal * feeValue) / 100;
  } else if (feeType === "NOMINAL") {
    feeAmount = feeValue;
  }

  return {
    method: {
      code: method.code,
      name: method.name,
      groupCode: method.groupCode,
      groupName: method.groupName,
      providerId: method.provider.id,
      providerCode: method.provider.code,
      dokuChannelCode: method.dokuChannelCode,
    },
    feeAmount: Math.round(feeAmount),
  };
}

// ============================================================
// Generate order number with retry logic
// Handles race conditions when multiple orders are created simultaneously
// ============================================================

export async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `ORD-${y}${m}${d}`;

  // Retry logic to handle race conditions
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Count existing orders with this prefix
    const count = await prisma.order.count({
      where: { orderNumber: { startsWith: prefix } },
    });
    const seq = count + 1;
    const orderNumber = `${prefix}-${String(seq).padStart(4, "0")}`;

    // Check if this order number already exists (race condition protection)
    const existing = await prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true },
    });

    if (!existing) {
      // This order number is unique, return it
      return orderNumber;
    }

    // Order number already exists, retry with a delay
    console.warn(`[generateOrderNumber] Collision detected for ${orderNumber}, retrying...`);
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 30));
    }
  }

  // Final fallback with microtimestamp to ensure uniqueness
  const timestamp = Date.now();
  const micro = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp.toString().slice(-4)}-${micro.toString().padStart(3, "0")}`;
}
