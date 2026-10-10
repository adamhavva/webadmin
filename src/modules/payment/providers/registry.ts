// ============================================================
// Payment Provider Registry
// Fetches available payment methods dynamically from Midtrans API
// ============================================================

<<<<<<< HEAD
import type { PaymentMethodOption, PaymentGroupOption } from './types';
=======
import { prisma } from '@/lib/db';
import { getDokuClient } from './doku-snap/client';
import { DokuQRISAdapter } from './doku-snap/qris';
import { DokuVAAdapter, VA_CHANNEL_CODES, type VAChannel } from './doku-snap/va';
import { DokuEWalletAdapter, EWALLET_CHANNEL_CODES, type EWalletChannel } from './doku-snap/ewallet';
import type { PaymentProviderAdapter, PaymentMethodConfig } from './types';
>>>>>>> 6bf28fd206c6a63fe65027db6b66dfedc5d270bd

// ============================================================
// Cache
// ============================================================

<<<<<<< HEAD
const methodCache = new Map<string, { data: PaymentGroupOption[]; expiresAt: number }>();
=======
interface CachedProvider {
  adapter: PaymentProviderAdapter;
  config: PaymentMethodConfig;
  expiresAt: number;
}

const providerCache = new Map<string, CachedProvider>();
>>>>>>> 6bf28fd206c6a63fe65027db6b66dfedc5d270bd
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

<<<<<<< HEAD
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
=======
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
// ============================================================

export async function getProviderAdapter(
  methodCode: string
): Promise<PaymentProviderAdapter> {
  clearExpiredCache();

  // Check cache first
  const cached = providerCache.get(methodCode);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.adapter;
  }

  // Get method config from database
  const methodConfig = await prisma.paymentMethodConfig.findUnique({
    where: { code: methodCode },
    include: { provider: true },
  });

  if (!methodConfig) {
    throw new Error(`Payment method not found: ${methodCode}`);
  }

  if (!methodConfig.provider.isActive) {
    throw new Error(`Payment provider is inactive: ${methodConfig.provider.code}`);
  }

  const channelType = detectChannelType(methodCode);

  let adapter: PaymentProviderAdapter;

  switch (channelType) {
    case 'QRIS':
      adapter = new DokuQRISAdapter(await getDokuClient());
      break;

    case 'VA': {
      const bankCode = methodCode.replace('VA_', '') as VAChannel;
      if (!VA_CHANNEL_CODES[bankCode]) {
        throw new Error(`Unknown VA bank: ${bankCode}`);
      }
      // PartnerServiceId should be configured per bank in the provider settings
      const partnerServiceId = methodConfig.provider.dokuClientId?.split('-')[1] ?? '00000';
      adapter = new DokuVAAdapter(
        await getDokuClient(),
        bankCode,
        partnerServiceId.padStart(8)
      );
      break;
    }

    case 'EWALLET': {
      const walletCode = methodCode as EWalletChannel;
      if (!EWALLET_CHANNEL_CODES[walletCode]) {
        throw new Error(`Unknown e-Wallet: ${methodCode}`);
      }
      adapter = new DokuEWalletAdapter(await getDokuClient(), walletCode);
      break;
    }

    default:
      throw new Error(`Unknown payment method: ${methodCode}`);
  }

  // Cache the provider
  providerCache.set(methodCode, {
    adapter,
    config: methodConfig as unknown as PaymentMethodConfig,
    expiresAt: Date.now() + CACHE_TTL,
  });

  return adapter;
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
  const whereClause = forCustomer
    ? { isActive: true, availableForCustomer: true }
    : { isActive: true, availableForAdmin: true };

  const methods = await prisma.paymentMethodConfig.findMany({
    where: whereClause,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { provider: true },
  });

  // Group by groupCode
  const groups = new Map<string, PaymentGroupOption>();

  for (const method of methods) {
    const groupCode = method.groupCode ?? 'OTHER';
    const groupName = method.groupName ?? 'Other';

    if (!groups.has(groupCode)) {
      groups.set(groupCode, {
        code: groupCode,
        name: groupName,
        methods: [],
      });
    }

    const feeLabel =
      method.feeType === 'NONE'
        ? undefined
        : method.feeType === 'PERCENTAGE'
          ? `+${method.feeValue}%`
          : `+Rp ${Number(method.feeValue).toLocaleString('id-ID')}`;

    groups.get(groupCode)!.methods.push({
      code: method.code,
      name: method.name,
      groupCode,
      groupName,
      icon: method.icon ?? undefined,
      feeLabel,
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    // Sort by predefined order (DOKU-based only, no CASH)
    const order = ['QRIS', 'VA', 'EWALLET'];
    const aIndex = order.indexOf(a.code);
    const bIndex = order.indexOf(b.code);
    // Unknown groups go to the end
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
>>>>>>> 6bf28fd206c6a63fe65027db6b66dfedc5d270bd
}

// ============================================================
// Cache Management
// ============================================================

export function clearMethodCache(_methodCode?: string): void {
  methodCache.clear();
}
