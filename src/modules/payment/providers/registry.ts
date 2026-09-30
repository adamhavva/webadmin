// ============================================================
// Payment Provider Registry
// Maps method codes to provider adapters
// ============================================================

import type { PaymentProviderAdapter } from './types';

// ============================================================
// Provider Cache
// ============================================================

const providerCache = new Map<string, { expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of providerCache.entries()) {
    if (value.expiresAt < now) {
      providerCache.delete(key);
    }
  }
}

// ============================================================
// Method Code Detection
// ============================================================

export function detectChannelType(
  methodCode: string
): 'QRIS' | 'VA' | 'EWALLET' | 'UNKNOWN' {
  if (methodCode === 'QRIS') return 'QRIS';
  if (methodCode.startsWith('VA_')) return 'VA';
  if (methodCode.startsWith('EWALLET_')) return 'EWALLET';
  return 'UNKNOWN';
}

// ============================================================
// Provider Factory
// NOTE: Midtrans uses a unified Snap flow — no per-method adapters needed.
// ============================================================

export async function getProviderAdapter(
  _methodCode: string
): Promise<PaymentProviderAdapter> {
  throw new Error(
    `getProviderAdapter is not used for Midtrans Snap. Use createSnapToken() directly from midtrans.service.ts.`
  );
}

// ============================================================
// Payment Methods API
// ============================================================

export interface PaymentMethodOption {
  code: string;
  name: string;
  groupCode: string;
  groupName: string;
  icon?: string;
  feeLabel?: string;
}

export interface PaymentGroupOption {
  code: string;
  name: string;
  methods: PaymentMethodOption[];
}

export async function getActivePaymentMethods(
  forCustomer: boolean = true
): Promise<PaymentGroupOption[]> {
  return [
    {
      code: 'QRIS',
      name: 'QRIS',
      methods: [
        { code: 'QRIS', name: 'QRIS', groupCode: 'QRIS', groupName: 'QRIS', icon: '🔲' },
      ],
    },
    {
      code: 'VA',
      name: 'Virtual Account',
      methods: [
        { code: 'VA_BCA', name: 'BCA Virtual Account', groupCode: 'VA', groupName: 'Virtual Account', icon: '🏦' },
        { code: 'VA_MANDIRI', name: 'Mandiri Virtual Account', groupCode: 'VA', groupName: 'Virtual Account', icon: '🏦' },
        { code: 'VA_BNI', name: 'BNI Virtual Account', groupCode: 'VA', groupName: 'Virtual Account', icon: '🏦' },
      ],
    },
    {
      code: 'EWALLET',
      name: 'E-Wallet',
      methods: [
        { code: 'EWALLET_OVO', name: 'OVO', groupCode: 'EWALLET', groupName: 'E-Wallet', icon: '💜' },
        { code: 'EWALLET_DANA', name: 'DANA', groupCode: 'EWALLET', groupName: 'E-Wallet', icon: '💙' },
        { code: 'EWALLET_SHOPEEPAY', name: 'ShopeePay', groupCode: 'EWALLET', groupName: 'E-Wallet', icon: '🧡' },
      ],
    },
  ];
}

// ============================================================
// Cache Management
// ============================================================

export function clearProviderCache(): void {
  providerCache.clear();
}

export function clearMethodCache(methodCode?: string): void {
  if (methodCode) {
    providerCache.delete(methodCode);
  } else {
    clearProviderCache();
  }
}
