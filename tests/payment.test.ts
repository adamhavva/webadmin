/**
 * Payment Module Unit Tests
 * Tests for payment.validator.ts, payment.service.ts, registry.ts, and midtrans.service.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';

// ============================================================
// Import modules under test (these must be pure, no Prisma dependency)
// ============================================================

// Import Zod schemas from payment.validator
import {
  midtransNotificationSchema,
  MIDTRANS_STATUS_MAP,
  createPaymentSchema,
} from '../src/modules/payment/payment.validator';

// Import pure functions from payment.service (no Prisma mocking needed)
import {
  inferPaymentGroup,
  getMidtransMethodName,
} from '../src/modules/payment/payment.service';

// Import pure functions from midtrans.service
import {
  verifyMidtransSignature,
  getMidtransConfig,
} from '../src/modules/payment/midtrans.service';

// Import registry functions
import {
  getActivePaymentMethods,
  clearMethodCache,
} from '../src/modules/payment/providers/registry';

// ============================================================
// Environment setup
// ============================================================

const originalEnv = { ...process.env };
beforeEach(() => {
  process.env = {
    ...originalEnv,
    MIDTRANS_SERVER_KEY: 'test-server-key',
    MIDTRANS_IS_PRODUCTION: 'false',
    NEXTAUTH_URL: 'http://localhost:3000',
  };
  clearMethodCache();
});
afterEach(() => {
  process.env = originalEnv;
  vi.restoreAllMocks();
});

// ============================================================
// A) payment.validator.ts tests
// ============================================================

describe('A) payment.validator.ts', () => {
  describe('MIDTRANS_STATUS_MAP', () => {
    it('should cover all expected Midtrans transaction_status values', () => {
      const expectedStatuses = [
        'settlement',
        'capture',
        'pending',
        'deny',
        'cancel',
        'expire',
        'failure',
      ];

      expectedStatuses.forEach((status) => {
        expect(MIDTRANS_STATUS_MAP).toHaveProperty(status);
      });
    });

    it('should map settlement to PAID', () => {
      expect(MIDTRANS_STATUS_MAP['settlement']).toBe('PAID');
    });

    it('should map capture to PAID', () => {
      expect(MIDTRANS_STATUS_MAP['capture']).toBe('PAID');
    });

    it('should map pending to PENDING', () => {
      expect(MIDTRANS_STATUS_MAP['pending']).toBe('PENDING');
    });

    it('should map deny/cancel/failure to FAILED', () => {
      expect(MIDTRANS_STATUS_MAP['deny']).toBe('FAILED');
      expect(MIDTRANS_STATUS_MAP['cancel']).toBe('FAILED');
      expect(MIDTRANS_STATUS_MAP['failure']).toBe('FAILED');
    });

    it('should map expire to EXPIRED', () => {
      expect(MIDTRANS_STATUS_MAP['expire']).toBe('EXPIRED');
    });
  });

  describe('midtransNotificationSchema', () => {
    it('should parse valid notification payload', () => {
      const validPayload = {
        transaction_time: '2024-01-15 10:30:00',
        transaction_status: 'settlement',
        transaction_id: 'tx-123',
        status_message: 'Transaction is successful',
        status_code: '200',
        signature_key: 'abc123',
        payment_type: 'qris',
        order_id: 'order-456',
        merchant_id: 'M001',
        gross_amount: '50000.00',
      };

      const result = midtransNotificationSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept optional fraud_status', () => {
      const payload = {
        transaction_time: '2024-01-15 10:30:00',
        transaction_status: 'settlement',
        transaction_id: 'tx-123',
        status_message: 'Transaction is successful',
        status_code: '200',
        signature_key: 'abc123',
        payment_type: 'qris',
        order_id: 'order-456',
        merchant_id: 'M001',
        gross_amount: '50000.00',
        fraud_status: 'accept',
      };

      const result = midtransNotificationSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept VA numbers for bank_transfer', () => {
      const payload = {
        transaction_time: '2024-01-15 10:30:00',
        transaction_status: 'settlement',
        transaction_id: 'tx-123',
        status_message: 'Transaction is successful',
        status_code: '200',
        signature_key: 'abc123',
        payment_type: 'bank_transfer',
        order_id: 'order-456',
        merchant_id: 'M001',
        gross_amount: '50000.00',
        va_numbers: [{ bank: 'bca', va_number: '1234567890' }],
      };

      const result = midtransNotificationSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject invalid payload (missing required fields)', () => {
      const invalidPayload = {
        transaction_time: '2024-01-15 10:30:00',
        // missing required fields
      };

      const result = midtransNotificationSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('createPaymentSchema', () => {
    it('should accept valid payment creation input', () => {
      const validInput = {
        orderId: 'order-123',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
      };

      const result = createPaymentSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept empty string as optional email', () => {
      const input = {
        orderId: 'order-123',
        customerName: 'John Doe',
        customerEmail: '',
      };

      const result = createPaymentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject missing orderId', () => {
      const input = {
        customerName: 'John Doe',
      };

      const result = createPaymentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================
// B) payment.service.ts tests (pure functions only)
// ============================================================

describe('B) payment.service.ts', () => {
  describe('inferPaymentGroup()', () => {
    it('should return QRIS for qris payment type', () => {
      expect(inferPaymentGroup('qris')).toBe('QRIS');
      expect(inferPaymentGroup('QRIS')).toBe('QRIS');
    });

    it('should return CARD for credit_card', () => {
      expect(inferPaymentGroup('credit_card')).toBe('CARD');
    });

    it('should return VIRTUAL_ACCOUNT for bank_transfer', () => {
      expect(inferPaymentGroup('bank_transfer')).toBe('VIRTUAL_ACCOUNT');
    });

    it('should return VIRTUAL_ACCOUNT for _va suffix types', () => {
      expect(inferPaymentGroup('bca_va')).toBe('VIRTUAL_ACCOUNT');
      expect(inferPaymentGroup('bni_va')).toBe('VIRTUAL_ACCOUNT');
      expect(inferPaymentGroup('bri_va')).toBe('VIRTUAL_ACCOUNT');
      expect(inferPaymentGroup('mandiri_va')).toBe('VIRTUAL_ACCOUNT');
    });

    it('should return EWALLET for e-wallet types', () => {
      expect(inferPaymentGroup('gopay')).toBe('EWALLET');
      expect(inferPaymentGroup('shopeepay')).toBe('EWALLET');
      expect(inferPaymentGroup('dana')).toBe('EWALLET');
      expect(inferPaymentGroup('ovo')).toBe('EWALLET');
    });

    it('should return CSTORE for convenience store types', () => {
      expect(inferPaymentGroup('alfamart')).toBe('CSTORE');
      expect(inferPaymentGroup('indomaret')).toBe('CSTORE');
      expect(inferPaymentGroup('cstore')).toBe('CSTORE');
    });

    it('should return OTHER for unknown payment types', () => {
      expect(inferPaymentGroup('unknown_method')).toBe('OTHER');
      expect(inferPaymentGroup('custom_payment')).toBe('OTHER');
      expect(inferPaymentGroup('bitcoin')).toBe('OTHER');
    });
  });

  describe('getMidtransMethodName()', () => {
    it('should return readable names for known payment types', () => {
      expect(getMidtransMethodName('qris')).toBe('QRIS');
      expect(getMidtransMethodName('bank_transfer')).toBe('Virtual Account');
      expect(getMidtransMethodName('bca_va')).toBe('BCA Virtual Account');
      expect(getMidtransMethodName('gopay')).toBe('GoPay');
      expect(getMidtransMethodName('credit_card')).toBe('Credit Card');
    });

    it('should return original code for unknown types', () => {
      expect(getMidtransMethodName('unknown_method')).toBe('unknown_method');
      expect(getMidtransMethodName('custom_payment')).toBe('custom_payment');
    });
  });
});

// ============================================================
// C) registry.ts tests
// ============================================================

describe('C) registry.ts', () => {
  describe('getActivePaymentMethods()', () => {
    it('should return array of PaymentGroupOption', async () => {
      const result = await getActivePaymentMethods();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('code');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('methods');
      expect(Array.isArray(result[0].methods)).toBe(true);
    });

    it('should return fallback when no server key is configured', async () => {
      delete process.env.MIDTRANS_SERVER_KEY;
      clearMethodCache();

      const result = await getActivePaymentMethods();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].code).toBe('MIDTRANS_SNAP');
      expect(result[0].methods[0].code).toBe('MIDTRANS_SNAP');
    });
  });
});

// ============================================================
// D) midtrans.service.ts tests
// ============================================================

describe('D) midtrans.service.ts', () => {
  describe('verifyMidtransSignature()', () => {
    it('should generate correct SHA512 hash', () => {
      const orderId = 'order-123';
      const statusCode = '200';
      const grossAmount = '50000.00';
      const serverKey = 'test-server-key';

      const expectedInput = `${orderId}${statusCode}${grossAmount}${serverKey}`;
      const expectedHash = crypto
        .createHash('sha512')
        .update(expectedInput)
        .digest('hex');

      const result = verifyMidtransSignature(orderId, statusCode, grossAmount, serverKey);

      expect(result).toBe(expectedHash);
    });

    it('should produce different hash for different inputs', () => {
      const hash1 = verifyMidtransSignature('order-1', '200', '50000.00', 'key');
      const hash2 = verifyMidtransSignature('order-2', '200', '50000.00', 'key');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getMidtransConfig()', () => {
    it('should return config with server key', () => {
      const config = getMidtransConfig();

      expect(config.serverKey).toBe('test-server-key');
      expect(config.isProduction).toBe(false);
    });

    it('should throw error when server key is missing', () => {
      delete process.env.MIDTRANS_SERVER_KEY;

      expect(() => getMidtransConfig()).toThrow('MIDTRANS_SERVER_KEY environment variable is not set');
    });
  });
});

// ============================================================
// E) Webhook signature verification test
// ============================================================

describe('E) Webhook Signature Verification', () => {
  it('should verify SHA512 signature calculation matches expected format', () => {
    // Test that the signature is calculated as: SHA512(order_id + status_code + gross_amount + serverKey)
    const orderId = 'ORD-20240115-001';
    const statusCode = '200';
    const grossAmount = '75000.00';
    const serverKey = 'SB-Mid-server-key-abc123';

    const input = `${orderId}${statusCode}${grossAmount}${serverKey}`;
    const hash = crypto.createHash('sha512').update(input).digest('hex');

    const result = verifyMidtransSignature(orderId, statusCode, grossAmount, serverKey);

    expect(result).toBe(hash);
    expect(result.length).toBe(128); // SHA512 produces 128 hex characters
  });

  it('should handle various gross_amount formats', () => {
    const testCases = [
      '50000.00',
      '100000',
      '1234567.89',
    ];

    testCases.forEach((grossAmount) => {
      const hash = verifyMidtransSignature('order-1', '200', grossAmount, 'key');
      expect(hash.length).toBe(128);
    });
  });
});
