// ============================================================
// Payment Pricing - Fee Calculation
// ============================================================

import { prisma } from '@/lib/db';

// ============================================================
// Types
// ============================================================

export interface FeeCalculation {
  subtotal: number;
  feeType: 'NONE' | 'PERCENTAGE' | 'NOMINAL';
  feeValue: number;
  feeAmount: number;
  total: number;
}

export interface FeeBreakdown {
  methodCode: string;
  methodName: string;
  subtotal: number;
  fee: {
    type: 'NONE' | 'PERCENTAGE' | 'NOMINAL';
    value: number;
    amount: number;
    label: string;
  };
  total: number;
}

// ============================================================
// Fee Calculation
// ============================================================

export function calculateFee(
  subtotal: number,
  feeType: 'NONE' | 'PERCENTAGE' | 'NOMINAL',
  feeValue: number
): FeeCalculation {
  const feeAmount =
    feeType === 'PERCENTAGE'
      ? (subtotal * feeValue) / 100
      : feeType === 'NOMINAL'
        ? feeValue
        : 0;

  return {
    subtotal,
    feeType,
    feeValue,
    feeAmount,
    total: subtotal + feeAmount,
  };
}

// ============================================================
// Get Fee for Payment Method
// ============================================================

export async function getMethodFee(
  methodCode: string
): Promise<{
  feeType: 'NONE' | 'PERCENTAGE' | 'NOMINAL';
  feeValue: number;
  feeLabel: string;
}> {
  const method = await prisma.paymentMethodConfig.findUnique({
    where: { code: methodCode, isActive: true },
  });

  if (!method) {
    throw new Error(`Payment method not found: ${methodCode}`);
  }

  let feeLabel = '';
  if (method.feeType === 'NONE') {
    feeLabel = 'Tanpa biaya admin';
  } else if (method.feeType === 'PERCENTAGE') {
    feeLabel = `Admin ${Number(method.feeValue)}%`;
  } else {
    feeLabel = `Admin Rp ${Number(method.feeValue).toLocaleString('id-ID')}`;
  }

  return {
    feeType: method.feeType as 'NONE' | 'PERCENTAGE' | 'NOMINAL',
    feeValue: Number(method.feeValue),
    feeLabel,
  };
}

// ============================================================
// Calculate Total with Fee
// ============================================================

export async function calculateTotalWithFee(
  subtotal: number,
  methodCode: string
): Promise<FeeBreakdown> {
  const method = await prisma.paymentMethodConfig.findUnique({
    where: { code: methodCode, isActive: true },
  });

  if (!method) {
    throw new Error(`Payment method not found: ${methodCode}`);
  }

  const calculation = calculateFee(
    subtotal,
    method.feeType as 'NONE' | 'PERCENTAGE' | 'NOMINAL',
    Number(method.feeValue)
  );

  let feeLabel = '';
  if (calculation.feeType === 'NONE') {
    feeLabel = 'Tanpa biaya admin';
  } else if (calculation.feeType === 'PERCENTAGE') {
    feeLabel = `${calculation.feeValue}% dari subtotal`;
  } else {
    feeLabel = `Rp ${calculation.feeValue.toLocaleString('id-ID')}`;
  }

  return {
    methodCode: method.code,
    methodName: method.name,
    subtotal: calculation.subtotal,
    fee: {
      type: calculation.feeType,
      value: calculation.feeValue,
      amount: calculation.feeAmount,
      label: feeLabel,
    },
    total: calculation.total,
  };
}

// ============================================================
// Format Currency
// ============================================================

export function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}
