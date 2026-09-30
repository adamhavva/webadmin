// ============================================================
// Payment Provider Registry
// Fetches available payment methods dynamically from Midtrans API
// ============================================================

import type { PaymentMethodOption, PaymentGroupOption } from './types';

// ============================================================
// Cache
// ============================================================

const methodCache = new Map<string, { data: PaymentGroupOption[]; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of methodCache.entries()) {
    if (value.expiresAt < now) methodCache.delete(key);
  }
}

function getCached(key: string): PaymentGroupOption[] | null {
  clearExpiredCache();
  const cached = methodCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  return null;
}

function setCache(key: string, data: PaymentGroupOption[]): void {
  methodCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

// ============================================================
// Fetch Available Payment Methods from Midtrans API
// ============================================================

/**
 * Fetch enabled payment methods from Midtrans API.
 * Returns methods grouped by type: QRIS, Virtual Account, E-Wallet, etc.
 * Falls back to generic SNAP entry point if API is unavailable.
 */
export async function getActivePaymentMethods(
  _forCustomer: boolean = true
): Promise<PaymentGroupOption[]> {
  const cacheKey = 'payment-methods';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

  if (!serverKey) {
    // No server key configured — return generic SNAP entry point
    return [
      {
        code: 'MIDTRANS_SNAP',
        name: 'Midtrans Snap',
        methods: [
          {
            code: 'MIDTRANS_SNAP',
            name: 'Bayar dengan Midtrans',
            groupCode: 'SNAP',
            groupName: 'Midtrans Snap',
          },
        ],
      },
    ];
  }

  const baseUrl = isProduction
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com';

  try {
    const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
    // Use a minimal gross_amount to get all enabled payment options
    const response = await fetch(`${baseUrl}/v1/payment-options?gross_amount=10000`, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Midtrans API error: ${response.status}`);
    }

    const data = (await response.json()) as Array<{
      payment_type: string;
      name: string;
      icon_url?: string;
      status: string;
    }>;

    // Filter only active payment types
    const activeMethods = data.filter(
      (m) => m.status === 'active' && m.payment_type !== undefined
    );

    if (activeMethods.length === 0) {
      return [
        {
          code: 'MIDTRANS_SNAP',
          name: 'Midtrans Snap',
          methods: [
            {
              code: 'MIDTRANS_SNAP',
              name: 'Bayar dengan Midtrans',
              groupCode: 'SNAP',
              groupName: 'Midtrans Snap',
            },
          ],
        },
      ];
    }

    // Group by payment type
    const groups = new Map<string, PaymentGroupOption>();

    for (const method of activeMethods) {
      const code = method.payment_type;
      const name = method.name || code;
      const icon = method.icon_url;
      const group = inferGroup(code);

      if (!groups.has(group.code)) {
        groups.set(group.code, { code: group.code, name: group.name, methods: [] });
      }

      const groupOption: PaymentMethodOption = {
        code,
        name,
        groupCode: group.code,
        groupName: group.name,
        ...(icon ? { icon } : {}),
      };

      groups.get(group.code)!.methods.push(groupOption);
    }

    const result = Array.from(groups.values());
    setCache(cacheKey, result);
    return result;
  } catch {
    // Fallback: return generic SNAP entry point
    return [
      {
        code: 'MIDTRANS_SNAP',
        name: 'Midtrans Snap',
        methods: [
          {
            code: 'MIDTRANS_SNAP',
            name: 'Bayar dengan Midtrans',
            groupCode: 'SNAP',
            groupName: 'Midtrans Snap',
          },
        ],
      },
    ];
  }
}

// ============================================================
// Helper: Infer group from payment type code
// ============================================================

function inferGroup(code: string): { code: string; name: string } {
  const c = code.toLowerCase();

  if (c === 'qris') return { code: 'QRIS', name: 'QRIS' };
  if (
    c.startsWith('bank_transfer') ||
    c === 'bca_va' ||
    c === 'bni_va' ||
    c === 'bri_va' ||
    c === 'mandiri_va'
  )
    return { code: 'VA', name: 'Virtual Account' };
  if (c.startsWith('echannel') || c === 'permata_va')
    return { code: 'VA', name: 'Virtual Account' };
  if (c === 'gopay' || c === 'shopeepay' || c === 'dana' || c === 'ovo' || c === 'link_aja')
    return { code: 'EWALLET', name: 'E-Wallet' };
  if (c === 'credit_card') return { code: 'CARD', name: 'Kartu Kredit/Debit' };
  if (c === 'cstore') return { code: 'CSTORE', name: 'Convenience Store' };
  if (c === 'akulaku' || c === 'kredivo') return { code: 'INSTALLMENT', name: 'Cicilan' };

  return { code: 'OTHER', name: code };
}

// ============================================================
// Cache Management
// ============================================================

export function clearMethodCache(_methodCode?: string): void {
  methodCache.clear();
}
