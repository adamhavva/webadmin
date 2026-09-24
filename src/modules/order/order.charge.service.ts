import { prisma } from "@/lib/db";
import type {
  PaymentFeeType,
  PaymentProvider,
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
    displayGroup: string | null;
    provider: PaymentProvider;
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
  methodCode: string,
  subtotal: number
): Promise<ComputedPaymentFee> {
  const method = await prisma.paymentMethodConfig.findUnique({
    where: { code: methodCode },
  });

  if (!method) {
    throw new Error(
      `Metode pembayaran "${methodCode}" tidak ditemukan`
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
      displayGroup: method.displayGroup,
      provider: method.provider as PaymentProvider,
      dokuChannelCode: method.dokuChannelCode,
    },
    feeAmount: Math.round(feeAmount),
  };
}

// ============================================================
// Generate order number
// ============================================================

export async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `ORD-${y}${m}${d}`;

  const todayCount = await prisma.order.count({
    where: {
      orderNumber: { startsWith: prefix },
    },
  });

  const seq = String(todayCount + 1).padStart(4, "0");
  return `${prefix}-${seq}`;
}