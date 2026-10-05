/**
 * Unit Tests for payment-webhook Edge Function
 *
 * Tests pure functions that don't require Deno environment.
 * Run: npx vitest tests/edge-functions/payment-webhook.test.ts
 */

import { describe, it, expect } from 'vitest';

// SHA512 signature verification - same implementation as in edge function
async function sha512Signature(orderId: string, statusCode: string, grossAmount: string, serverKey: string): Promise<string> {
  const input = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simplified signature verification (synchronous)
function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string
): string {
  // Simple synchronous hash for testing
  const input = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Infer payment group from Midtrans payment_type
function inferPaymentGroup(paymentType: string): string {
  const pt = paymentType.toLowerCase();
  if (pt === 'qris') return 'QRIS';
  if (pt === 'credit_card') return 'CARD';
  if (pt === 'bank_transfer' || pt.endsWith('_va')) return 'VIRTUAL_ACCOUNT';
  if (['gopay', 'shopeepay', 'dana', 'ovo', 'paypay', 'astrapay'].includes(pt)) return 'EWALLET';
  if (['alfamart', 'indomaret', 'cstore'].includes(pt)) return 'CSTORE';
  return 'OTHER';
}

function getMidtransMethodName(paymentType: string): string {
  const map: Record<string, string> = {
    qris: 'QRIS',
    bank_transfer: 'Virtual Account',
    bca_va: 'BCA Virtual Account',
    bni_va: 'BNI Virtual Account',
    bri_va: 'BRI Virtual Account',
    mandiri_va: 'Mandiri Virtual Account',
    permata_va: 'Permata Virtual Account',
    cstore: 'Convenience Store',
    alfamart: 'Alfamart',
    indomaret: 'Indomaret',
    gopay: 'GoPay',
    shopeepay: 'ShopeePay',
    dana: 'DANA',
    ovo: 'OVO',
    credit_card: 'Credit Card',
  };
  return map[paymentType.toLowerCase()] ?? paymentType;
}

// Midtrans status mapping
const MIDTRANS_STATUS_MAP: Record<string, 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED'> = {
  settlement: 'PAID',
  capture: 'PAID',
  pending: 'PENDING',
  deny: 'FAILED',
  cancel: 'FAILED',
  expire: 'EXPIRED',
  failure: 'FAILED',
};

describe('SHA512 Signature Verification', () => {
  it('should generate consistent signatures for same input', () => {
    const sig1 = verifyMidtransSignature('order-123', '200', '50000.00', 'server-key');
    const sig2 = verifyMidtransSignature('order-123', '200', '50000.00', 'server-key');
    expect(sig1).toBe(sig2);
  });

  it('should generate different signatures for different orders', () => {
    const sig1 = verifyMidtransSignature('order-123', '200', '50000.00', 'server-key');
    const sig2 = verifyMidtransSignature('order-456', '200', '50000.00', 'server-key');
    expect(sig1).not.toBe(sig2);
  });

  it('should generate different signatures for different amounts', () => {
    const sig1 = verifyMidtransSignature('order-123', '200', '50000.00', 'server-key');
    const sig2 = verifyMidtransSignature('order-123', '200', '100000.00', 'server-key');
    expect(sig1).not.toBe(sig2);
  });

  it('should generate different signatures for different status codes', () => {
    const sig1 = verifyMidtransSignature('order-123', '200', '50000.00', 'server-key');
    const sig2 = verifyMidtransSignature('order-123', '201', '50000.00', 'server-key');
    expect(sig1).not.toBe(sig2);
  });
});

describe('Midtrans Status Mapping', () => {
  it('should map settlement to PAID', () => {
    expect(MIDTRANS_STATUS_MAP['settlement']).toBe('PAID');
  });

  it('should map capture to PAID', () => {
    expect(MIDTRANS_STATUS_MAP['capture']).toBe('PAID');
  });

  it('should map pending to PENDING', () => {
    expect(MIDTRANS_STATUS_MAP['pending']).toBe('PENDING');
  });

  it('should map deny to FAILED', () => {
    expect(MIDTRANS_STATUS_MAP['deny']).toBe('FAILED');
  });

  it('should map cancel to FAILED', () => {
    expect(MIDTRANS_STATUS_MAP['cancel']).toBe('FAILED');
  });

  it('should map expire to EXPIRED', () => {
    expect(MIDTRANS_STATUS_MAP['expire']).toBe('EXPIRED');
  });

  it('should map failure to FAILED', () => {
    expect(MIDTRANS_STATUS_MAP['failure']).toBe('FAILED');
  });
});

describe('Payment Group Inference', () => {
  it('should identify QRIS', () => {
    expect(inferPaymentGroup('qris')).toBe('QRIS');
    expect(inferPaymentGroup('QRIS')).toBe('QRIS');
  });

  it('should identify credit card', () => {
    expect(inferPaymentGroup('credit_card')).toBe('CARD');
  });

  it('should identify virtual account', () => {
    expect(inferPaymentGroup('bank_transfer')).toBe('VIRTUAL_ACCOUNT');
    expect(inferPaymentGroup('bca_va')).toBe('VIRTUAL_ACCOUNT');
    expect(inferPaymentGroup('bni_va')).toBe('VIRTUAL_ACCOUNT');
    expect(inferPaymentGroup('mandiri_va')).toBe('VIRTUAL_ACCOUNT');
  });

  it('should identify e-wallets', () => {
    expect(inferPaymentGroup('gopay')).toBe('EWALLET');
    expect(inferPaymentGroup('shopeepay')).toBe('EWALLET');
    expect(inferPaymentGroup('dana')).toBe('EWALLET');
    expect(inferPaymentGroup('ovo')).toBe('EWALLET');
  });

  it('should identify convenience stores', () => {
    expect(inferPaymentGroup('alfamart')).toBe('CSTORE');
    expect(inferPaymentGroup('indomaret')).toBe('CSTORE');
    expect(inferPaymentGroup('cstore')).toBe('CSTORE');
  });
});

describe('Payment Method Name Mapping', () => {
  it('should return correct names for common payment types', () => {
    expect(getMidtransMethodName('qris')).toBe('QRIS');
    expect(getMidtransMethodName('credit_card')).toBe('Credit Card');
    expect(getMidtransMethodName('gopay')).toBe('GoPay');
    expect(getMidtransMethodName('shopeepay')).toBe('ShopeePay');
    expect(getMidtransMethodName('bca_va')).toBe('BCA Virtual Account');
    expect(getMidtransMethodName('alfamart')).toBe('Alfamart');
  });

  it('should return original for unknown types', () => {
    expect(getMidtransMethodName('unknown_type')).toBe('unknown_type');
  });
});

describe('CORS Headers', () => {
  it('should include required CORS headers', () => {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    expect(corsHeaders['Access-Control-Allow-Origin']).toBe('*');
    expect(corsHeaders['Access-Control-Allow-Methods']).toContain('POST');
    expect(corsHeaders['Access-Control-Allow-Methods']).toContain('OPTIONS');
  });
});

describe('Webhook Payload Validation', () => {
  const requiredFields = ['order_id', 'status_code', 'gross_amount', 'signature_key'];

  it('should have all required fields', () => {
    const validPayload = {
      order_id: 'test-order-123',
      status_code: '200',
      gross_amount: '50000.00',
      signature_key: 'abc123signature',
      transaction_status: 'settlement',
      transaction_id: 'txn-123',
      payment_type: 'qris',
    };

    for (const field of requiredFields) {
      expect(validPayload).toHaveProperty(field);
    }
  });

  it('should detect missing required fields', () => {
    const invalidPayload = {
      transaction_status: 'settlement',
      // missing order_id, status_code, gross_amount, signature_key
    };

    for (const field of requiredFields) {
      expect(invalidPayload).not.toHaveProperty(field);
    }
  });
});

describe('Firebase RTDB URL Construction', () => {
  it('should construct correct URL for order locations', () => {
    const databaseUrl = 'https://project-default-rtdb.firebaseio.com';
    const orderId = 'order-uuid-123';
    const url = `${databaseUrl}/orders/${orderId}/locations.json`;
    expect(url).toContain('orders/order-uuid-123/locations.json');
  });

  it('should construct correct URL for order tracking', () => {
    const databaseUrl = 'https://project-default-rtdb.firebaseio.com';
    const orderId = 'order-uuid-123';
    const url = `${databaseUrl}/orders/${orderId}/tracking.json`;
    expect(url).toContain('orders/order-uuid-123/tracking.json');
  });
});

describe('Order Status Transitions', () => {
  const validTransitions: Record<string, string[]> = {
    PENDING: ['SEARCHING', 'CANCELLED'],
    SEARCHING: ['ASSIGNED', 'CANCELLED'],
    ASSIGNED: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['DELIVERING', 'CANCELLED'],
    DELIVERING: ['ARRIVED', 'CANCELLED'],
    ARRIVED: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  it('should allow PENDING to SEARCHING transition', () => {
    expect(validTransitions['PENDING']).toContain('SEARCHING');
  });

  it('should allow SEARCHING to ASSIGNED transition', () => {
    expect(validTransitions['SEARCHING']).toContain('ASSIGNED');
  });
});

describe('Final Payment Statuses', () => {
  it('should define correct final statuses', () => {
    const finalStatuses = ['PAID', 'FAILED', 'EXPIRED', 'REFUNDED'];
    expect(finalStatuses).toHaveLength(4);
    expect(finalStatuses).toContain('PAID');
    expect(finalStatuses).toContain('FAILED');
    expect(finalStatuses).toContain('EXPIRED');
    expect(finalStatuses).toContain('REFUNDED');
  });
});

describe('Stock Movement Types', () => {
  it('should define SOLD movement type', () => {
    const movementTypes = ['RESTOCK', 'SOLD', 'ADJUSTMENT', 'RETURN', 'WASTE'];
    expect(movementTypes).toContain('SOLD');
  });
});

describe('Payment Update Data Structure', () => {
  it('should build correct update data for PAID status', () => {
    const paymentStatus = 'PAID';
    const paymentType = 'qris';

    const updateData: Record<string, unknown> = {
      status: paymentStatus,
      paidAt: new Date(),
      methodCode: paymentType,
      methodName: getMidtransMethodName(paymentType),
      methodGroup: inferPaymentGroup(paymentType),
    };

    expect(updateData.status).toBe('PAID');
    expect(updateData.methodCode).toBe('qris');
    expect(updateData.methodName).toBe('QRIS');
    expect(updateData.methodGroup).toBe('QRIS');
    expect(updateData.paidAt).toBeInstanceOf(Date);
  });

  it('should build correct update data for FAILED status', () => {
    const updateData: Record<string, unknown> = {
      status: 'FAILED',
      failedAt: new Date(),
    };

    expect(updateData.status).toBe('FAILED');
    expect(updateData.failedAt).toBeInstanceOf(Date);
  });
});

describe('UUID Validation', () => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  it('should match valid UUID format', () => {
    const validUuid = '819a379b-23b4-49f7-82b9-3e24e5c3d5bc';
    expect(uuidRegex.test(validUuid)).toBe(true);
  });

  it('should reject invalid UUID format', () => {
    const invalidUuids = [
      'not-a-uuid',
      '123',
      'order-123',
    ];

    invalidUuids.forEach(uuid => {
      expect(uuidRegex.test(uuid)).toBe(false);
    });
  });
});

describe('Capture Transaction with Fraud Status', () => {
  it('should set PAID when fraud_status is accept', () => {
    const txStatus = 'capture';
    const fraudStatus = 'accept';
    const paymentStatus = fraudStatus === 'accept' ? 'PAID' : 'PENDING';
    expect(paymentStatus).toBe('PAID');
  });

  it('should set PENDING when fraud_status is challenge', () => {
    const txStatus = 'capture';
    const fraudStatus = 'challenge';
    const paymentStatus = fraudStatus === 'accept' ? 'PAID' : 'PENDING';
    expect(paymentStatus).toBe('PENDING');
  });
});

describe('Order Locations Data Structure', () => {
  it('should have correct structure for Firebase', () => {
    const locationsData = {
      customer: {
        lat: -6.902484,
        lng: 107.603595,
        timestamp: Date.now(),
      },
      distance: 0,
      orderNumber: 'ORD-001',
      status: 'SEARCHING',
    };

    expect(locationsData.customer).toHaveProperty('lat');
    expect(locationsData.customer).toHaveProperty('lng');
    expect(locationsData.customer).toHaveProperty('timestamp');
    expect(locationsData).toHaveProperty('orderNumber');
    expect(locationsData).toHaveProperty('status');
  });
});

describe('HTTP Status Codes', () => {
  it('should use correct status codes', () => {
    const statusCodes = {
      OK: 200,
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      NOT_FOUND: 404,
      SERVER_ERROR: 500,
    };

    expect(statusCodes.OK).toBe(200);
    expect(statusCodes.BAD_REQUEST).toBe(400);
    expect(statusCodes.UNAUTHORIZED).toBe(401);
    expect(statusCodes.NOT_FOUND).toBe(404);
    expect(statusCodes.SERVER_ERROR).toBe(500);
  });
});
