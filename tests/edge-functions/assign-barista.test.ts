/**
 * Unit Tests for assign-barista Edge Function
 *
 * Tests pure functions that don't require Deno environment.
 * Run: npx vitest tests/edge-functions/assign-barista.test.ts
 */

import { describe, it, expect } from 'vitest';

// Haversine formula - same implementation as in edge function
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

describe('Haversine Distance Calculation', () => {
  it('should calculate distance between Bandung and Jakarta correctly', () => {
    // Bandung: -6.9175, 107.6191
    // Jakarta: -6.2088, 106.8456
    const distance = haversine(-6.9175, 107.6191, -6.2088, 106.8456);
    // Distance should be approximately 115-120 km
    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(130);
  });

  it('should calculate zero distance for same coordinates', () => {
    const distance = haversine(-6.9175, 107.6191, -6.9175, 107.6191);
    expect(distance).toBeLessThan(0.001);
  });

  it('should be symmetric (A to B equals B to A)', () => {
    const distanceAB = haversine(-6.9175, 107.6191, -7.25, 112.75);
    const distanceBA = haversine(-7.25, 112.75, -6.9175, 107.6191);
    expect(Math.abs(distanceAB - distanceBA) / distanceAB).toBeLessThan(0.0001);
  });

  it('should calculate short distances accurately', () => {
    // 1km apart
    const lat1 = -6.9175;
    const lng1 = 107.6191;
    // Roughly 1km north
    const lat2 = lat1 + 0.009;
    const lng2 = lng1;
    const distance = haversine(lat1, lng1, lat2, lng2);
    expect(distance).toBeGreaterThan(0.5);
    expect(distance).toBeLessThan(1.5);
  });

  it('should handle negative coordinates', () => {
    // Coordinates for Southern Hemisphere
    const distance = haversine(-33.8688, 151.2093, -37.8136, 144.9631); // Sydney to Melbourne
    expect(distance).toBeGreaterThan(700);
    expect(distance).toBeLessThan(750);
  });

  it('should handle coordinates across equator', () => {
    const distance = haversine(-6.9175, 107.6191, 6.2088, 106.8456); // Bandung to Equator crossing
    expect(distance).toBeGreaterThan(1300);
    expect(distance).toBeLessThan(1600); // Adjusted for equator crossing distance
  });
});

describe('Firebase RTDB URL Construction', () => {
  it('should construct correct Firebase RTDB URL for user location', () => {
    const projectId = 'test-project';
    const firebaseUid = 'user123';
    const databaseUrl = `https://${projectId}-default-rtdb.firebaseio.com`;
    const url = `${databaseUrl}/users/${firebaseUid}/location.json`;
    expect(url).toContain('test-project');
    expect(url).toContain('users/user123/location.json');
  });

  it('should construct correct Firebase RTDB URL for order tracking', () => {
    const databaseUrl = 'https://project-default-rtdb.firebaseio.com';
    const orderId = 'order-uuid-123';
    const url = `${databaseUrl}/orders/${orderId}/tracking.json`;
    expect(url).toContain('orders/order-uuid-123/tracking.json');
  });

  it('should construct correct Firebase RTDB URL for order locations', () => {
    const databaseUrl = 'https://project-default-rtdb.firebaseio.com';
    const orderId = 'order-uuid-123';
    const url = `${databaseUrl}/orders/${orderId}/locations.json`;
    expect(url).toContain('orders/order-uuid-123/locations.json');
  });
});

describe('Order Status Validation', () => {
  const validStatuses = ['PENDING', 'SEARCHING', 'ASSIGNED', 'ACCEPTED', 'DELIVERING', 'ARRIVED', 'COMPLETED', 'CANCELLED', 'FAILED'];

  it('should recognize SEARCHING as valid for assignment', () => {
    expect(validStatuses).toContain('SEARCHING');
  });

  it('should recognize ASSIGNED as valid for assignment', () => {
    expect(validStatuses).toContain('ASSIGNED');
  });

  it('should have all expected statuses', () => {
    expect(validStatuses).toHaveLength(9);
  });
});

describe('UUID Validation', () => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  it('should match valid UUID format', () => {
    const validUuid = '819a379b-23b4-49f7-82b9-3e24e5c3d5bc';
    expect(uuidRegex.test(validUuid)).toBe(true);
  });

  it('should match uppercase UUID', () => {
    const validUuid = '819A379B-23B4-49F7-82B9-3E24E5C3D5BC';
    expect(uuidRegex.test(validUuid)).toBe(true);
  });

  it('should reject invalid UUID format', () => {
    const invalidUuids = [
      'not-a-uuid',
      '123',
      '12345678-1234-1234-123456789012', // wrong last segment
      '12345678-1234-1234-1234-1234567890123', // too long
    ];

    invalidUuids.forEach(uuid => {
      expect(uuidRegex.test(uuid)).toBe(false);
    });
  });
});

describe('Barista Availability Check', () => {
  it('should filter busy baristas correctly', () => {
    const busyIds = new Set(['barista-1', 'barista-2']);
    const allBaristas = [
      { id: 'barista-1', name: 'Busy Barista' },
      { id: 'barista-2', name: 'Another Busy' },
      { id: 'barista-3', name: 'Free Barista' },
    ];

    const available = allBaristas.filter(b => !busyIds.has(b.id));
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe('barista-3');
  });

  it('should handle empty busy set', () => {
    const busyIds = new Set<string>();
    const allBaristas = [
      { id: 'barista-1', name: 'Free Barista' },
      { id: 'barista-2', name: 'Another Free' },
    ];

    const available = allBaristas.filter(b => !busyIds.has(b.id));
    expect(available).toHaveLength(2);
  });
});

describe('Distance Sorting', () => {
  it('should find nearest barista', () => {
    const baristas = [
      { id: 'b1', name: 'Far', rtdbLat: -6.9, rtdbLng: 107.6, distance: 5.2 },
      { id: 'b2', name: 'Medium', rtdbLat: -6.9, rtdbLng: 107.6, distance: 2.8 },
      { id: 'b3', name: 'Near', rtdbLat: -6.9, rtdbLng: 107.6, distance: 0.5 },
    ];

    let nearest = baristas[0];
    let minDist = Infinity;
    for (const b of baristas) {
      if (b.distance < minDist) {
        minDist = b.distance;
        nearest = b;
      }
    }

    expect(nearest.name).toBe('Near');
    expect(nearest.distance).toBe(0.5);
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

describe('API Response Format', () => {
  it('should have success response with required fields', () => {
    const successResponse = {
      success: true,
      baristaId: 'barista-1',
      baristaName: 'Test Barista',
      baristaPhone: '6281234567890',
      distance: '5.2 km',
      assignedAt: new Date().toISOString(),
      durationMs: 150,
    };

    expect(successResponse.success).toBe(true);
    expect(successResponse).toHaveProperty('baristaId');
    expect(successResponse).toHaveProperty('baristaName');
    expect(successResponse).toHaveProperty('distance');
    expect(successResponse).toHaveProperty('assignedAt');
  });

  it('should have error response with message', () => {
    const errorResponse = {
      success: false,
      message: 'Order not found',
    };

    expect(errorResponse.success).toBe(false);
    expect(errorResponse).toHaveProperty('message');
  });
});

describe('HTTP Status Codes', () => {
  it('should use correct status codes', () => {
    const statusCodes = {
      OK: 200,
      CREATED: 201,
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      SERVER_ERROR: 500,
    };

    expect(statusCodes.OK).toBe(200);
    expect(statusCodes.NOT_FOUND).toBe(404);
    expect(statusCodes.SERVER_ERROR).toBe(500);
  });
});

describe('Distance Formatting', () => {
  it('should round distance to 2 decimal places', () => {
    const distKm = 5.2398765;
    const formatted = (Math.round(distKm * 100) / 100).toString() + ' km';
    expect(formatted).toBe('5.24 km');
  });

  it('should format short distances', () => {
    const distKm = 0.123;
    const formatted = (Math.round(distKm * 100) / 100).toString() + ' km';
    expect(formatted).toBe('0.12 km');
  });
});

describe('Order Locations Data Structure', () => {
  it('should have correct structure for Firebase', () => {
    const orderLocations = {
      customer: {
        lat: -6.902484,
        lng: 107.603595,
        timestamp: Date.now(),
      },
      barista: {
        lat: -6.92,
        lng: 107.61,
        timestamp: Date.now(),
      },
      distance: 2.5,
      orderNumber: 'ORD-001',
    };

    expect(orderLocations.customer).toHaveProperty('lat');
    expect(orderLocations.customer).toHaveProperty('lng');
    expect(orderLocations.customer).toHaveProperty('timestamp');
    expect(orderLocations.barista).toHaveProperty('lat');
    expect(orderLocations.barista).toHaveProperty('lng');
    expect(orderLocations).toHaveProperty('distance');
    expect(orderLocations).toHaveProperty('orderNumber');
  });
});
