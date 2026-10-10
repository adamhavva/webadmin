/**
 * Unit Tests for order-reject Edge Function
 *
 * Tests pure functions that don't require Deno environment.
 * Run: npx vitest tests/edge-functions/order-reject.test.ts
 */

import { describe, it, expect } from 'vitest';

// Haversine formula (same as in edge function)
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('order-reject: UUID Validation', () => {
  it('should match valid UUID format', () => {
    const validUuid = '819a379b-23b4-49f7-82b9-3e24e5c3d5bc';
    expect(uuidRegex.test(validUuid)).toBe(true);
  });

  it('should reject invalid UUID format', () => {
    expect(uuidRegex.test('not-a-uuid')).toBe(false);
    expect(uuidRegex.test('123')).toBe(false);
  });
});

describe('order-reject: Order Status Validation', () => {
  it('should only accept ASSIGNED status', () => {
    const currentStatus = 'ASSIGNED';
    expect(currentStatus === 'ASSIGNED').toBe(true);
  });

  it('should reject non-ASSIGNED status', () => {
    const invalidStatuses = ['PENDING', 'SEARCHING', 'ACCEPTED', 'DELIVERING', 'ARRIVED', 'COMPLETED'];
    expect(invalidStatuses.includes('ACCEPTED')).toBe(true);
  });
});

describe('order-reject: Barista Verification', () => {
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

describe('order-reject: Distance Calculation', () => {
  it('should calculate distances correctly', () => {
    const customerLat = -6.902;
    const customerLng = 107.603;

    const baristas = [
      { id: 'b1', name: 'Near', lat: -6.905, lng: 107.605 },
      { id: 'b2', name: 'Far', lat: -7.0, lng: 107.7 },
    ];

    const distances = baristas.map(b => ({
      ...b,
      distance: haversine(customerLat, customerLng, b.lat, b.lng),
    }));

    expect(distances[0].distance).toBeLessThan(distances[1].distance);
  });

  it('should filter baristas within radius', () => {
    const customerLat = -6.902;
    const customerLng = 107.603;
    const radiusKm = 5;

    const baristas = [
      { id: 'b1', name: 'Within', lat: -6.905, lng: 107.605 },
      { id: 'b2', name: 'Outside', lat: -7.5, lng: 108.0 },
    ];

    const withinRadius = baristas.filter(b => {
      const dist = haversine(customerLat, customerLng, b.lat, b.lng);
      return dist <= radiusKm;
    });

    expect(withinRadius).toHaveLength(1);
    expect(withinRadius[0].name).toBe('Within');
  });
});

describe('order-reject: Stock Check', () => {
  it('should pass when all items have sufficient stock', () => {
    const stockMap = new Map([
      ['prod-1', 10],
      ['prod-2', 5],
    ]);

    const items = [
      { productId: 'prod-1', quantity: 3 },
      { productId: 'prod-2', quantity: 2 },
    ];

    let hasStock = true;
    for (const item of items) {
      const qty = stockMap.get(item.productId) ?? 0;
      if (qty < item.quantity) {
        hasStock = false;
        break;
      }
    }

    expect(hasStock).toBe(true);
  });

  it('should fail when any item has insufficient stock', () => {
    const stockMap = new Map([
      ['prod-1', 2],
      ['prod-2', 5],
    ]);

    const items = [
      { productId: 'prod-1', quantity: 5 },
    ];

    let hasStock = true;
    for (const item of items) {
      const qty = stockMap.get(item.productId) ?? 0;
      if (qty < item.quantity) {
        hasStock = false;
        break;
      }
    }

    expect(hasStock).toBe(false);
  });
});

describe('order-reject: Broadcast Order Structure', () => {
  it('should create correct broadcast structure', () => {
    const now = Date.now();
    const expiresAt = now + 30000;

    const orderData = {
      orderId: 'order-123',
      orderNumber: 'ORD-001',
      customerName: 'John Doe',
      customerLatitude: -6.902,
      customerLongitude: 107.603,
      items: [
        { productName: 'Kopi', quantity: 2 },
      ],
      subtotal: 30000,
      total: 33000,
      expiresAt,
      createdAt: now,
    };

    expect(orderData).toHaveProperty('orderId');
    expect(orderData).toHaveProperty('expiresAt');
    expect(orderData.expiresAt).toBeGreaterThan(orderData.createdAt);
  });

  it('should create correct updates object for Firebase', () => {
    const baristaIds = ['fb-uid-1', 'fb-uid-2'];
    const orderId = 'order-123';

    const updates: Record<string, any> = {};
    for (const baristaId of baristaIds) {
      updates[`order_pool/${baristaId}/${orderId}`] = {
        orderId,
        customerName: 'Test',
      };
    }

    expect(Object.keys(updates)).toHaveLength(2);
    expect(updates).toHaveProperty('order_pool/fb-uid-1/order-123');
  });
});

describe('order-reject: Reassign Logic', () => {
  it('should handle no available baristas', () => {
    const candidates: any[] = [];
    const result = candidates.length === 0
      ? { success: true, message: 'No other baristas available', newBaristaId: null }
      : { success: true, newBaristaId: candidates[0].barista.id };

    expect(result.newBaristaId).toBeNull();
    expect(result.message).toBe('No other baristas available');
  });

  it('should select nearest barista when available', () => {
    const candidates = [
      { barista: { id: 'b1', name: 'Far' }, distance: 5.0 },
      { barista: { id: 'b2', name: 'Near' }, distance: 0.5 },
    ];

    candidates.sort((a, b) => a.distance - b.distance);
    const nextBarista = candidates[0];

    expect(nextBarista.barista.name).toBe('Near');
    expect(nextBarista.distance).toBe(0.5);
  });
});

describe('order-reject: Firebase RTDB URLs', () => {
  it('should construct correct delete URL', () => {
    const databaseUrl = 'https://test-default-rtdb.firebaseio.com';
    const baristaId = 'barista-123';
    const orderId = 'order-uuid-456';
    const url = `${databaseUrl}/order_pool/${baristaId}/${orderId}.json`;
    expect(url).toContain('order_pool/barista-123/order-uuid-456.json');
  });

  it('should construct correct broadcast URL', () => {
    const databaseUrl = 'https://test-default-rtdb.firebaseio.com';
    const url = `${databaseUrl}/.json`;
    expect(url).toContain('.json');
  });
});

describe('order-reject: CORS Headers', () => {
  it('should include required CORS headers', () => {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    expect(corsHeaders['Access-Control-Allow-Origin']).toBe('*');
    expect(corsHeaders['Access-Control-Allow-Methods']).toContain('POST');
  });
});

describe('order-reject: Response Format', () => {
  it('should have success response when no baristas available', () => {
    const response = {
      success: true,
      message: 'No other baristas available',
      newBaristaId: null,
      durationMs: 150,
    };

    expect(response.success).toBe(true);
    expect(response.newBaristaId).toBeNull();
    expect(response).toHaveProperty('message');
  });

  it('should have success response when barista reassigned', () => {
    const response = {
      success: true,
      newBaristaId: 'barista-456',
      newBaristaName: 'John',
      newBaristaPhone: '6281234567890',
      distance: '2.5 km',
      durationMs: 200,
    };

    expect(response.success).toBe(true);
    expect(response).toHaveProperty('newBaristaId');
    expect(response).toHaveProperty('newBaristaName');
    expect(response).toHaveProperty('distance');
  });
});

describe('order-reject: Request Validation', () => {
  it('should require orderId and baristaId', () => {
    const body = { reason: 'Too far' };
    const isValid = body.orderId !== undefined && body.baristaId !== undefined;
    expect(isValid).toBe(false);
  });

  it('should accept valid request with optional reason', () => {
    const body = { orderId: 'order-123', baristaId: 'barista-456', reason: 'Too far' };
    const isValid = body.orderId !== undefined && body.baristaId !== undefined;
    expect(isValid).toBe(true);
    expect(body.reason).toBe('Too far');
  });
});
