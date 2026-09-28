// ============================================================
// Payment Provider Registry
// Maps method codes to provider adapters
// ============================================================

import { prisma } from '@/lib/db';
import { getDokuClient } from './doku-snap/client';
import { DokuQRISAdapter } from './doku-snap/qris';
import { DokuVAAdapter, VA_CHANNEL_CODES, type VAChannel } from './doku-snap/va';
import { DokuEWalletAdapter, EWALLET_CHANNEL_CODES, type EWalletChannel } from './doku-snap/ewallet';
import type { PaymentProviderAdapter, PaymentMethodConfig } from './types';

// ============================================================
// Provider Cache
// ============================================================

interface CachedProvider {
  adapter: PaymentProviderAdapter;
  config: PaymentMethodConfig;
  expiresAt: number;
}

const providerCache = new Map<string, CachedProvider>();
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
