/**
 * ASCEND Order Tracking Simulation Script
 * Creates orders with GoFood-style tracking simulation
 *
 * Features:
 * - Creates orders with destination list (multi-stop like GoFood)
 * - Each order has full tracking data in Firebase RTDB
 * - Simulates different statuses: SEARCHING, ASSIGNED, ACCEPTED, DELIVERING, ARRIVED
 * - Updates barista location during delivery
 *
 * Usage:
 *   npx tsx scripts/seed-orders-for-tracker.ts
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import 'dotenv/config';

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kjezwxrebnixdpxljklv.supabase.co',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Firebase credentials
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'ascend-v2-4a67d',
    databaseUrl: process.env.FIREBASE_DATABASE_URL || 'https://ascend-v2-4a67d-default-rtdb.asia-southeast1.firebasedatabase.app',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
  },

  // Bandung area
  bandung: {
    center: { lat: -6.9175, lng: 107.6191 },
  },

  orderCount: 20,
};

// ============================================================
// UTILITIES
// ============================================================

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomInRange(min, max + 1));
}

function generateUUID(): string {
  return crypto.randomUUID();
}

function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(randomInt(1, 9999)).padStart(4, '0');
  return `ORD-${date}-${seq}`;
}

function generatePhone(): string {
  const prefix = '+628';
  const digits = Array.from({ length: 10 }, () => String(randomInt(0, 9))).join('');
  return prefix + digits;
}

function randomCoordinateInRadius(
  centerLat: number,
  centerLng: number,
  radiusKm: number
): { lat: number; lng: number } {
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.pow(Math.random(), 0.5) * radiusKm;
  const latOffset = (distance * Math.cos(angle)) / 111;
  const lngOffset = (distance * Math.sin(angle)) / (111 * Math.cos(centerLat * Math.PI / 180));
  return {
    lat: centerLat + latOffset,
    lng: centerLng + lngOffset,
  };
}

// ============================================================
// NAME GENERATORS
// ============================================================

const FIRST_NAMES = [
  'Ahmad', 'Budi', 'Dewi', 'Eko', 'Fitri', 'Gunawan', 'Hendra', 'Ika', 'Joko', 'Kartika',
  'Lukman', 'Maria', 'Nico', 'Putri', 'Rudi', 'Siti', 'Tono', 'Umar', 'Vina', 'Wati',
];

const LAST_NAMES = [
  'Wijaya', 'Santoso', 'Lestari', 'Prasetyo', 'Handayani', 'Hidayat', 'Kusuma', 'Febriyanti',
  'Widodo', 'Ayuningtyas', 'Hakim', 'Natalia', 'Pratama', 'Wulandari', 'Hermawan', 'Rahayu',
];

const BANDUNG_ADDRESSES = [
  'Jl. Braga No.', 'Jl. Asia Afrika No.', 'Jl. Dago No.', 'Jl. Riau No.', 'Jl. Setiabudhi No.',
  'Jl. Merdeka No.', 'Jl. Sudirman No.', 'Jl. Gatot Subroto No.', 'Jl. Pasteur No.', 'Jl. Buah Batu No.',
];

function randomName(): string {
  const first = FIRST_NAMES[randomInt(0, FIRST_NAMES.length - 1)];
  const last = LAST_NAMES[randomInt(0, LAST_NAMES.length - 1)];
  return `${first} ${last}`;
}

function randomAddress(): string {
  const street = BANDUNG_ADDRESSES[randomInt(0, BANDUNG_ADDRESSES.length - 1)];
  const number = randomInt(1, 200);
  return `${street}${number}, Bandung`;
}

const COFFEE_ITEMS = [
  { name: 'Americano', price: 22000 },
  { name: 'Cappuccino', price: 25000 },
  { name: 'Latte', price: 25000 },
  { name: 'Espresso', price: 18000 },
  { name: 'Mocha', price: 28000 },
  { name: 'Matcha Latte', price: 30000 },
  { name: 'Kopi Susu', price: 20000 },
  { name: 'V60', price: 35000 },
];

// ============================================================
// LOGGING
// ============================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const prefix = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️' }[type];
  console.log(`${prefix} ${message}`);
}

function logSection(title: string) {
  console.log('\n' + '═'.repeat(60));
  console.log(` ${title}`);
  console.log('═'.repeat(60));
}

// ============================================================
// FIREBASE TOKEN
// ============================================================

async function getFirebaseToken(): Promise<string> {
  const { clientEmail, privateKey } = CONFIG.firebase;

  if (!clientEmail || !privateKey) {
    throw new Error('Firebase credentials not configured');
  }

  let parsedKey = privateKey;
  if (parsedKey.includes('\\n')) {
    parsedKey = parsedKey.replace(/\\n/g, '\n');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encodeBase64Url = (str: string): string => {
    const encoded = btoa(unescape(encodeURIComponent(str)));
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const headerBase64 = encodeBase64Url(JSON.stringify(header));
  const payloadBase64 = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${headerBase64}.${payloadBase64}`;

  const keyData = parsedKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureBase64 = encodeBase64Url(
    String.fromCharCode(...new Uint8Array(signature))
  );

  const jwt = `${signingInput}.${signatureBase64}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firebase token exchange failed: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// ============================================================
// FIREBASE WRITE
// ============================================================

async function writeToFirebase(path: string, data: any, token: string): Promise<boolean> {
  try {
    const url = `${CONFIG.firebase.databaseUrl}${path}.json?auth=${token}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (err) {
    console.error(`Firebase write error:`, err.message);
    return false;
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('\n' + '🛵'.repeat(30));
  console.log(' ASCEND Order Tracking Simulation');
  console.log('🛵'.repeat(30));

  try {
    // Get Supabase client
    const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey);

    // Get Firebase token
    log('\nGetting Firebase token...', 'info');
    const firebaseToken = await getFirebaseToken();
    log('Firebase token obtained', 'success');

    // Get available baristas from Supabase
    log('\nFetching baristas from Supabase...', 'info');
    const { data: baristas, error: baristasError } = await supabase
      .from('User')
      .select('id, firebaseUid, name, phone, latitude, longitude')
      .eq('role', 'BARISTA')
      .eq('status', 'ACTIVE')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(CONFIG.orderCount);

    if (baristasError || !baristas || baristas.length === 0) {
      throw new Error('No baristas found. Please run seed-massive.ts first.');
    }

    log(`Found ${baristas.length} baristas`, 'success');

    // Get active orders (SEARCHING status) or create new ones
    log('\nCreating orders with tracking...', 'info');

    const createdOrders: any[] = [];

    for (let i = 0; i < Math.min(CONFIG.orderCount, baristas.length); i++) {
      const barista = baristas[i];

      // Generate order location
      const deliveryLocation = randomCoordinateInRadius(
        CONFIG.bandung.center.lat,
        CONFIG.bandung.center.lng,
        5 // within 5km
      );

      // Random items
      const itemCount = randomInt(1, 4);
      let subtotal = 0;
      const items: any[] = [];

      for (let j = 0; j < itemCount; j++) {
        const item = COFFEE_ITEMS[randomInt(0, COFFEE_ITEMS.length - 1)];
        const quantity = randomInt(1, 3);
        items.push({
          name: item.name,
          price: item.price,
          quantity,
          total: item.price * quantity,
        });
        subtotal += item.price * quantity;
      }

      // Generate destination list (for GoFood-style tracking)
      const destinationList = [];
      const stopCount = randomInt(2, 3); // 2-3 stops
      for (let s = 0; s < stopCount; s++) {
        const stopLocation = randomCoordinateInRadius(
          CONFIG.bandung.center.lat,
          CONFIG.bandung.center.lng,
          8
        );
        destinationList.push({
          lat: stopLocation.lat,
          lng: stopLocation.lng,
          name: s === 0 ? 'Toko Kopi' : `Tujuan ${s}`,
          address: randomAddress(),
          status: s === 0 ? 'DONE' : 'PENDING',
          arrivedAt: s === 0 ? new Date().toISOString() : null,
        });
      }

      // Random status
      const statuses = ['SEARCHING', 'ASSIGNED', 'ACCEPTED', 'DELIVERING', 'ARRIVED', 'COMPLETED'];
      const status = statuses[randomInt(0, statuses.length - 1)];

      // Calculate delivery progress (0-1) based on status
      const statusProgress: Record<string, number> = {
        'SEARCHING': 0,
        'ASSIGNED': 0.1,
        'ACCEPTED': 0.2,
        'DELIVERING': 0.3 + Math.random() * 0.5, // 30-80%
        'ARRIVED': 1,
        'COMPLETED': 1,
      };
      const progress = statusProgress[status] || 0;

      const orderId = generateUUID();
      const orderNumber = generateOrderNumber();
      const customerName = randomName();
      const customerPhone = generatePhone();

      const order = {
        id: orderId,
        orderNumber,
        channel: 'ONLINE',
        customerId: generateUUID(),
        customerName,
        customerPhone,
        deliveryAddress: randomAddress(),
        deliveryLatitude: deliveryLocation.lat,
        deliveryLongitude: deliveryLocation.lng,
        deliveryNote: null,
        baristaId: ['ASSIGNED', 'ACCEPTED', 'DELIVERING', 'ARRIVED', 'COMPLETED'].includes(status) ? barista.id : null,
        status,
        originalBaristaId: null,
        reassignedAt: null,
        reassignReason: null,
        reassignNote: null,
        reassignCount: 0,
        assignedAt: ['ASSIGNED', 'ACCEPTED', 'DELIVERING', 'ARRIVED', 'COMPLETED'].includes(status) ? new Date().toISOString() : null,
        acceptedAt: ['ACCEPTED', 'DELIVERING', 'ARRIVED', 'COMPLETED'].includes(status) ? new Date().toISOString() : null,
        deliveringAt: ['DELIVERING', 'ARRIVED', 'COMPLETED'].includes(status) ? new Date().toISOString() : null,
        arrivedAt: ['ARRIVED', 'COMPLETED'].includes(status) ? new Date().toISOString() : null,
        completedAt: status === 'COMPLETED' ? new Date().toISOString() : null,
        cancelledAt: null,
        cancelReason: null,
        estimatedDeliveryAt: new Date(Date.now() + 30 * 60000).toISOString(), // 30 mins from now
        actualDeliveryAt: null,
        distanceKm: randomInRange(0.5, 5).toFixed(2),
        subtotal: subtotal.toString(),
        chargesTotal: '0',
        deliveryFee: '0',
        total: subtotal.toString(),
        paymentStatus: 'PAID',
        paymentProvider: 'MIDTRANS',
        paymentChannel: 'QRIS',
        paymentMethodCode: 'qris',
        paymentMethodName: 'QRIS',
        paymentMethodGroup: 'qr_payment',
        paymentFeeAmount: '0',
        snapToken: null,
        paymentUrl: null,
        providerChannel: 'qris',
        paymentExpiredAt: null,
        callbackPayload: null,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Insert to Supabase
      const { error: orderError } = await supabase.from('Order').insert(order);
      if (orderError) {
        log(`Failed to create order ${orderNumber}: ${orderError.message}`, 'error');
        continue;
      }

      // Create order items
      for (const item of items) {
        await supabase.from('OrderItem').insert({
          id: generateUUID(),
          orderId,
          productId: null, // Not linked to products for simulation
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price.toString(),
          subtotal: item.total.toString(),
          notes: null,
        });
      }

      // Calculate barista's current location (somewhere along the route)
      const baristaCurrentLat = barista ? barista.latitude + (deliveryLocation.lat - barista.latitude) * progress : CONFIG.bandung.center.lat;
      const baristaCurrentLng = barista ? barista.longitude + (deliveryLocation.lng - barista.longitude) * progress : CONFIG.bandung.center.lng;

      // Create Firebase tracking data (GoFood-style)
      const trackingData = {
        status,
        baristaName: barista?.name || null,
        baristaPhone: barista?.phone || null,
        customerName,
        destination: {
          lat: deliveryLocation.lat,
          lng: deliveryLocation.lng,
          address: order.deliveryAddress,
        },
        estimatedArrival: new Date(Date.now() + randomInt(5, 20) * 60000).toISOString(),
        currentLocation: barista ? {
          lat: baristaCurrentLat,
          lng: baristaCurrentLng,
        } : null,
        destinationList: destinationList.map((stop, idx) => ({
          lat: stop.lat,
          lng: stop.lng,
          name: stop.name,
        })),
      };

      await writeToFirebase(`/orders/${orderId}/tracking`, trackingData, firebaseToken);

      createdOrders.push({ ...order, barista });
      log(`Created: ${orderNumber} (${status})`, 'success');
    }

    // Summary
    logSection('Summary');
    log(`Orders created: ${createdOrders.length}`, 'success');

    const statusCounts: Record<string, number> = {};
    for (const o of createdOrders) {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    }
    for (const [status, count] of Object.entries(statusCounts)) {
      log(`  ${status}: ${count}`, 'info');
    }

    console.log('\n' + '✨'.repeat(30));
    console.log(' Order tracking simulation ready!');
    console.log('✨'.repeat(30) + '\n');

    process.exit(0);
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

main();
