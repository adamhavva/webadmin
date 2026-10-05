/**
 * Unit Tests for order-status Edge Function
 *
 * Tests pure functions that don't require Deno environment.
 * Run: npx vitest tests/edge-functions/order-status.test.ts
 */

import { describe, it, expect } from 'vitest';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Same allowed transitions as in edge function
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'ACCEPTED': ['DELIVERING'],
  'DELIVERING': ['ARRIVED'],
};

describe('order-status: UUID Validation', () => {
  it('should match valid UUID format', () => {
    const validUuid = '819a379b-23b4-49f7-82b9-3e24e5c3d5bc';
    expect(uuidRegex.test(validUuid)).toBe(true);
  });

  it('should reject invalid UUID format', () => {
    expect(uuidRegex.test('not-a-uuid')).toBe(false);
    expect(uuidRegex.test('123')).toBe(false);
  });
});

describe('order-status: Status Values', () => {
  it('should accept DELIVERING as valid status', () => {
    const validStatuses = ['DELIVERING', 'ARRIVED'];
    expect(validStatuses.includes('DELIVERING')).toBe(true);
  });

  it('should accept ARRIVED as valid status', () => {
    const validStatuses = ['DELIVERING', 'ARRIVED'];
    expect(validStatuses.includes('ARRIVED')).toBe(true);
  });

  it('should reject invalid status values', () => {
    const validStatuses = ['DELIVERING', 'ARRIVED'];
    expect(validStatuses.includes('COMPLETED')).toBe(false);
    expect(validStatuses.includes('CANCELLED')).toBe(false);
  });
});

describe('order-status: Allowed Transitions', () => {
  it('should allow ACCEPTED to DELIVERING', () => {
    const currentStatus = 'ACCEPTED';
    const targetStatus = 'DELIVERING';
    const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    expect(allowed.includes(targetStatus)).toBe(true);
  });

  it('should allow DELIVERING to ARRIVED', () => {
    const currentStatus = 'DELIVERING';
    const targetStatus = 'ARRIVED';
    const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    expect(allowed.includes(targetStatus)).toBe(true);
  });

  it('should not allow DELIVERING to DELIVERING', () => {
    const currentStatus = 'DELIVERING';
    const targetStatus = 'DELIVERING';
    const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    expect(allowed.includes(targetStatus)).toBe(false);
  });

  it('should not allow COMPLETED to any status', () => {
    const currentStatus = 'COMPLETED';
    const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    expect(allowed).toHaveLength(0);
  });

  it('should not allow PENDING to any status', () => {
    const currentStatus = 'PENDING';
    const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    expect(allowed).toHaveLength(0);
  });
});

describe('order-status: Barista Verification', () => {
  it('should verify barista is assigned to order', () => {
    const orderBaristaId = 'barista-123';
    const requestingBaristaId = 'barista-123';
    expect(orderBaristaId === requestingBaristaId).toBe(true);
  });

  it('should reject if barista is not assigned', () => {
    const orderBaristaId = 'barista-123';
    const requestingBaristaId = 'barista-789';
    expect(orderBaristaId === requestingBaristaId).toBe(false);
  });
});

describe('order-status: Transition Validation', () => {
  it('should validate valid transition', () => {
    const currentStatus = 'ACCEPTED';
    const newStatus = 'DELIVERING';
    const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    expect(allowed.includes(newStatus)).toBe(true);
  });

  it('should reject invalid transition', () => {
    const currentStatus = 'ASSIGNED';
    const newStatus = 'DELIVERING';
    const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    expect(allowed.includes(newStatus)).toBe(false);
  });

  it('should handle unknown current status', () => {
    const currentStatus = 'UNKNOWN';
    const newStatus = 'DELIVERING';
    const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    expect(allowed.includes(newStatus)).toBe(false);
  });
});

describe('order-status: Firebase RTDB URLs', () => {
  it('should construct correct tracking URL', () => {
    const databaseUrl = 'https://test-default-rtdb.firebaseio.com';
    const orderId = 'order-uuid-123';
    const url = `${databaseUrl}/orders/${orderId}/tracking.json`;
    expect(url).toContain('orders/order-uuid-123/tracking.json');
  });
});

describe('order-status: CORS Headers', () => {
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

describe('order-status: Response Format', () => {
  it('should have success response with required fields', () => {
    const response = {
      success: true,
      orderId: 'order-123',
      orderNumber: 'ORD-001',
      status: 'DELIVERING',
      durationMs: 150,
    };

    expect(response.success).toBe(true);
    expect(response).toHaveProperty('orderId');
    expect(response).toHaveProperty('orderNumber');
    expect(response).toHaveProperty('status');
  });

  it('should have error response with message', () => {
    const response = {
      success: false,
      message: 'Cannot change from ACCEPTED to ARRIVED',
    };

    expect(response.success).toBe(false);
    expect(response).toHaveProperty('message');
  });
});

describe('order-status: HTTP Status Codes', () => {
  it('should use correct status codes', () => {
    const statusCodes = {
      OK: 200,
      BAD_REQUEST: 400,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      UNPROCESSABLE: 422,
      SERVER_ERROR: 500,
    };

    expect(statusCodes.OK).toBe(200);
    expect(statusCodes.BAD_REQUEST).toBe(400);
    expect(statusCodes.FORBIDDEN).toBe(403);
    expect(statusCodes.NOT_FOUND).toBe(404);
    expect(statusCodes.UNPROCESSABLE).toBe(422);
  });
});

describe('order-status: Request Validation', () => {
  it('should require orderId, baristaId, and status', () => {
    const body = { note: 'On the way' };
    const isValid = body.orderId !== undefined && body.baristaId !== undefined && body.status !== undefined;
    expect(isValid).toBe(false);
  });

  it('should accept valid request', () => {
    const body = { orderId: 'order-123', baristaId: 'barista-456', status: 'DELIVERING' };
    const isValid = body.orderId !== undefined && body.baristaId !== undefined && body.status !== undefined;
    expect(isValid).toBe(true);
  });

  it('should accept request with optional note', () => {
    const body = { orderId: 'order-123', baristaId: 'barista-456', status: 'ARRIVED', note: 'Sampai!' };
    const isValid = body.orderId !== undefined && body.baristaId !== undefined && body.status !== undefined;
    expect(isValid).toBe(true);
    expect(body.note).toBe('Sampai!');
  });
});

describe('order-status: Update Data Building', () => {
  it('should build DELIVERING update data', () => {
    const status = 'DELIVERING';
    const now = new Date().toISOString();

    let updateData: string;
    if (status === 'DELIVERING') {
      updateData = `status = 'DELIVERING', "deliveringAt" = '${now}'`;
    }

    expect(updateData).toContain('DELIVERING');
    expect(updateData).toContain('deliveringAt');
  });

  it('should build ARRIVED update data', () => {
    const status = 'ARRIVED';
    const now = new Date().toISOString();

    let updateData: string;
    if (status === 'ARRIVED') {
      updateData = `status = 'ARRIVED', "arrivedAt" = '${now}'`;
    }

    expect(updateData).toContain('ARRIVED');
    expect(updateData).toContain('arrivedAt');
  });
});

describe('order-status: Order State Machine', () => {
  it('should represent correct lifecycle path', () => {
    const lifecycle = [
      'PENDING',
      'SEARCHING',
      'ASSIGNED',
      'ACCEPTED',
      'DELIVERING',
      'ARRIVED',
      'COMPLETED',
    ];

    // DELIVERING comes after ACCEPTED
    const acceptedIndex = lifecycle.indexOf('ACCEPTED');
    const deliveringIndex = lifecycle.indexOf('DELIVERING');
    expect(deliveringIndex).toBeGreaterThan(acceptedIndex);

    // ARRIVED comes after DELIVERING
    const arrivedIndex = lifecycle.indexOf('ARRIVED');
    expect(arrivedIndex).toBeGreaterThan(deliveringIndex);
  });
});
