// ============================================================
// Payment Method Mapping
// Maps internal method codes to DOKU channel codes
// ============================================================

/**
 * DOKU Checkout channel codes
 * Reference: https://developers.doku.com/accept-payments/doku-checkout
 */
export const DOKU_CHECKOUT_CHANNELS = {
  // QRIS
  QRIS: 'QRIS',

  // Virtual Account
  VA_BCA: 'VIRTUAL_ACCOUNT_BCA',
  VA_MANDIRI: 'VIRTUAL_ACCOUNT_MANDIRI',
  VA_BNI: 'VIRTUAL_ACCOUNT_BNI',
  VA_BRI: 'VIRTUAL_ACCOUNT_BRI',
  VA_PERMATA: 'VIRTUAL_ACCOUNT_PERMATA',
  VA_SYARIAH: 'VIRTUAL_ACCOUNT_BSI',

  // e-Wallet
  EWALLET_OVO: 'EWALLET_OVO',
  EWALLET_DANA: 'EWALLET_DANA',
  EWALLET_SHOPEEPAY: 'EWALLET_SHOPEEPAY',
  EWALLET_LINKAJA: 'EWALLET_LINKAJA',

  // Credit/Debit Card
  CARD: 'ONLINE',
} as const;

export type DOKUChannelCode = typeof DOKU_CHECKOUT_CHANNELS[keyof typeof DOKU_CHECKOUT_CHANNELS];

/**
 * Map internal method code to DOKU channel code
 * Returns undefined if no mapping (let customer choose on DOKU page)
 */
export function mapToDOKUChannel(methodCode: string): string | undefined {
  const mapping: Record<string, string> = {
    // QRIS
    'QRIS': 'QRIS',

    // Virtual Account
    'VA_BCA': 'VIRTUAL_ACCOUNT_BCA',
    'VA_MANDIRI': 'VIRTUAL_ACCOUNT_MANDIRI',
    'VA_BNI': 'VIRTUAL_ACCOUNT_BNI',
    'VA_BRI': 'VIRTUAL_ACCOUNT_BRI',
    'VA_PERMATA': 'VIRTUAL_ACCOUNT_PERMATA',
    'VA_SYARIAH': 'VIRTUAL_ACCOUNT_BSI',
    'VA_BSI': 'VIRTUAL_ACCOUNT_BSI',

    // e-Wallet
    'EWALLET_OVO': 'EWALLET_OVO',
    'EWALLET_DANA': 'EWALLET_DANA',
    'EWALLET_SHOPEEPAY': 'EWALLET_SHOPEEPAY',
    'EWALLET_LINKAJA': 'EWALLET_LINKAJA',

    // Card
    'CARD': 'ONLINE',
    'CREDIT_CARD': 'ONLINE',
    'DEBIT_CARD': 'ONLINE',
  };

  return mapping[methodCode];
}

/**
 * Check if a method code is a DOKU-supported method
 */
export function isDOKUSupported(methodCode: string): boolean {
  return mapToDOKUChannel(methodCode) !== undefined;
}

/**
 * Get all supported DOKU channel codes
 */
export function getSupportedDOKUChannels(): string[] {
  return Object.values(DOKU_CHECKOUT_CHANNELS);
}
