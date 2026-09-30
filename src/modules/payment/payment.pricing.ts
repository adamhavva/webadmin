// ============================================================
// Payment Pricing - Fee Calculation
// ============================================================

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

export function getMethodFee(
  _methodCode: string
): {
  feeType: 'NONE' | 'PERCENTAGE' | 'NOMINAL';
  feeValue: number;
  feeLabel: string;
} {
  // Payment method config removed from DB; no fees applied
  return { feeType: 'NONE', feeValue: 0, feeLabel: 'Tanpa biaya admin' };
}

// ============================================================
// Calculate Total with Fee
// ============================================================

export function calculateTotalWithFee(
  subtotal: number,
  methodCode: string
): FeeBreakdown {
  // Payment method config removed from DB; no fees applied
  const calculation = calculateFee(subtotal, 'NONE', 0);
  return {
    methodCode,
    methodName: methodCode,
    subtotal: calculation.subtotal,
    fee: {
      type: 'NONE',
      value: 0,
      amount: 0,
      label: 'Tanpa biaya admin',
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
