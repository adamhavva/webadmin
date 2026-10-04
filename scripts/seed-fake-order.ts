/**
 * ASCEND Fake Order Generator Script
 *
 * Purpose: Generate fake orders for testing the order assignment flow
 *
 * Features:
 * - Create fake customer with random location
 * - Create multiple fake baristas with random locations around Bandung
 * - Create fake order with random delivery address
 * - Simulate payment success (skip Midtrans)
 * - Trigger assign-barista edge function
 * - Verify nearest barista assignment
 *
 * Usage:
 *   npx tsx scripts/seed-fake-order.ts
 *
 * Environment:
 *   Set DEMO_MODE=true to skip actual API calls (dry run)
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import 'dotenv/config';

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  // Supabase credentials
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kjezwxrebnixdpxljklv.supabase.co',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Edge Function URL
  edgeFunctionUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kjezwxrebnixdpxljklv.supabase.co'}/functions/v1/assign-barista`,

  // Demo mode (skip actual API calls)
  demoMode: process.env.DEMO_MODE === 'true',

  // Bandung area coordinates (for fake data)
  bandung: {
    center: { lat: -6.9175, lng: 107.6191 }, // Alun-alun Bandung
    radiusKm: 5, // radius for barista distribution
  },

  // Number of fake baristas to create
  baristaCount: 5,
};

// ============================================================
// SUPABASE CLIENTS
// ============================================================

// Admin client (bypasses RLS)
function getSupabaseAdmin() {
  // In demo mode, return null and skip actual API calls
  if (CONFIG.demoMode) {
    return null as any;
  }
  if (!CONFIG.supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  }
  return createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey, {
    auth: { persistSession: false }
  });
}

// ============================================================
// UTILITY FUNCTIONS
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

function generateFirebaseUid(): string {
  return crypto.randomBytes(24).toString('hex');
}

function generatePhone(): string {
  const prefix = '+628';
  const digits = Array.from({ length: 10 }, () => String(randomInt(0, 9))).join('');
  return prefix + digits;
}

function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(randomInt(1, 9999)).padStart(4, '0');
  return `ORD-${date}-${seq}`;
}

// Generate random coordinates within radius of center
function randomCoordinateInRadius(
  centerLat: number,
  centerLng: number,
  radiusKm: number
): { lat: number; lng: number } {
  // Random angle
  const angle = Math.random() * 2 * Math.PI;

  // Random distance (with more concentration near center)
  const distance = Math.pow(Math.random(), 0.5) * radiusKm;

  // Convert km to degrees (approximate)
  const latOffset = (distance * Math.cos(angle)) / 111;
  const lngOffset = (distance * Math.sin(angle)) / (111 * Math.cos(centerLat * Math.PI / 180));

  return {
    lat: centerLat + latOffset,
    lng: centerLng + lngOffset,
  };
}

// Indonesian fake names
const FAKE_NAMES = [
  'Ahmad Wijaya',
  'Budi Santoso',
  'Dewi Lestari',
  'Eko Prasetyo',
  'Fitri Handayani',
  'Gunawan Hidayat',
  'Hendra Kusuma',
  'Ika Febriyanti',
  'Joko Widodo',
  'Kartika Sari',
  'Lukman Hakim',
  'Maria Natalia',
  'Nico Pratama',
  'Putri Ayu',
  'Rudi Hermawan',
];

// Bandung area addresses
const BANDUNG_ADDRESSES = [
  'Jl. Braga No. 1, Bandung',
  'Jl. Asia Afrika No. 45, Bandung',
  'Jl. Dago No. 12, Bandung',
  'Jl. Riau No. 78, Bandung',
  'Jl. Setiabudhi No. 56, Bandung',
  'Jl. Merdeka No. 23, Bandung',
  'Jl. Sudirman No. 89, Bandung',
  'Jl. Gatot Subroto No. 34, Bandung',
  'Jl. Pasteur No. 67, Bandung',
  'Jl. Buah Batu No. 21, Bandung',
];

function randomName(): string {
  return FAKE_NAMES[randomInt(0, FAKE_NAMES.length - 1)];
}

function randomAddress(): string {
  return BANDUNG_ADDRESSES[randomInt(0, BANDUNG_ADDRESSES.length - 1)];
}

function randomItemName(): string {
  const items = [
    'Americano',
    'Cappuccino',
    'Latte',
    'Espresso',
    'Mocha',
    'Matcha Latte',
    'Kopi Susu',
    'V60',
  ];
  return items[randomInt(0, items.length - 1)];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

// ============================================================
// LOGGING
// ============================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  }[type];
  console.log(`${prefix} ${message}`);
}

function logSection(title: string) {
  console.log('\n' + '═'.repeat(60));
  console.log(` ${title}`);
  console.log('═'.repeat(60));
}

// ============================================================
// MAIN FUNCTIONS
// ============================================================

/**
 * Create fake customer
 */
async function createFakeCustomer(supabase: ReturnType<typeof createClient>) {
  logSection('Creating Fake Customer');

  const location = randomCoordinateInRadius(
    CONFIG.bandung.center.lat,
    CONFIG.bandung.center.lng,
    2 // 2km radius
  );

  const customer = {
    id: generateUUID(),
    firebaseUid: generateFirebaseUid(),
    role: 'CUSTOMER' as const,
    status: 'ACTIVE' as const,
    name: randomName(),
    phone: generatePhone(),
    address: randomAddress(),
    latitude: location.lat,
    longitude: location.lng,
    avatarUrl: null,
    idNumber: null,
    birthDate: null,
    joinDate: null,
    addressKtp: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (CONFIG.demoMode) {
    log(`[DEMO] Would create customer: ${customer.name}`, 'info');
    log(`[DEMO] Location: ${customer.latitude?.toFixed(6)}, ${customer.longitude?.toFixed(6)}`, 'info');
    return customer;
  }

  const { data, error } = await supabase
    .from('User')
    .insert(customer)
    .select()
    .single();

  if (error) {
    log(`Failed to create customer: ${error.message}`, 'error');
    throw error;
  }

  log(`Customer created: ${data.name}`, 'success');
  log(`ID: ${data.id}`, 'info');
  log(`Location: ${data.latitude?.toFixed(6)}, ${data.longitude?.toFixed(6)}`, 'info');

  return data;
}

/**
 * Create multiple fake baristas
 */
async function createFakeBaristas(supabase: ReturnType<typeof createClient>) {
  logSection('Creating Fake Baristas');

  const baristas: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    distanceFromCenter: number;
  }> = [];

  for (let i = 0; i < CONFIG.baristaCount; i++) {
    const location = randomCoordinateInRadius(
      CONFIG.bandung.center.lat,
      CONFIG.bandung.center.lng,
      CONFIG.bandung.radiusKm
    );

    // Calculate distance from center
    const distance = haversine(
      CONFIG.bandung.center.lat,
      CONFIG.bandung.center.lng,
      location.lat,
      location.lng
    );

    const barista = {
      id: generateUUID(),
      firebaseUid: generateFirebaseUid(),
      role: 'BARISTA' as const,
      status: 'ACTIVE' as const,
      name: randomName(),
      phone: generatePhone(),
      address: null,
      latitude: location.lat,
      longitude: location.lng,
      avatarUrl: null,
      idNumber: null,
      birthDate: null,
      joinDate: null,
      addressKtp: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (CONFIG.demoMode) {
      log(`[DEMO] Would create barista: ${barista.name}`, 'info');
      continue;
    }

    const { data, error } = await supabase
      .from('User')
      .insert(barista)
      .select()
      .single();

    if (error) {
      log(`Failed to create barista: ${error.message}`, 'error');
      throw error;
    }

    baristas.push({
      id: data.id,
      name: data.name,
      latitude: data.latitude!,
      longitude: data.longitude!,
      distanceFromCenter: distance,
    });

    log(`Barista created: ${data.name}`, 'success');
    log(`  Location: ${data.latitude?.toFixed(6)}, ${data.longitude?.toFixed(6)}`, 'info');
    log(`  Distance from center: ${distance.toFixed(2)} km`, 'info');
  }

  return baristas;
}

/**
 * Create fake order
 */
async function createFakeOrder(
  supabase: ReturnType<typeof createClient>,
  customer: { id: string; name: string; phone: string | null; latitude: number | null; longitude: number | null }
) {
  logSection('Creating Fake Order');

  const deliveryLocation = randomCoordinateInRadius(
    CONFIG.bandung.center.lat,
    CONFIG.bandung.center.lng,
    3
  );

  // Random items (1-3 items)
  const itemCount = randomInt(1, 3);
  const items: Array<{ name: string; price: number; quantity: number; total: number }> = [];
  let subtotal = 0;

  for (let i = 0; i < itemCount; i++) {
    const price = randomInt(15000, 35000);
    const quantity = randomInt(1, 3);
    items.push({
      name: randomItemName(),
      price,
      quantity,
      total: price * quantity,
    });
    subtotal += price * quantity;
  }

  const deliveryFee = 0; // Free delivery
  const total = subtotal + deliveryFee;

  const order = {
    id: generateUUID(),
    orderNumber: generateOrderNumber(),
    channel: 'ONLINE',
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    deliveryAddress: randomAddress(),
    deliveryLatitude: deliveryLocation.lat,
    deliveryLongitude: deliveryLocation.lng,
    deliveryNote: null,
    baristaId: null,
    status: 'SEARCHING' as const, // Skip PENDING, go directly to SEARCHING
    originalBaristaId: null,
    reassignedAt: null,
    reassignReason: null,
    reassignNote: null,
    reassignCount: 0,
    assignedAt: null,
    acceptedAt: null,
    deliveringAt: null,
    arrivedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancelReason: null,
    estimatedDeliveryAt: null,
    actualDeliveryAt: null,
    distanceKm: null,
    subtotal: subtotal.toString(),
    chargesTotal: '0',
    deliveryFee: deliveryFee.toString(),
    total: total.toString(),
    paymentStatus: 'PAID' as const, // Simulate paid
    paymentProvider: 'MIDTRANS',
    paymentChannel: 'PREPAID',
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

  if (CONFIG.demoMode) {
    log(`[DEMO] Would create order: ${order.orderNumber}`, 'info');
    log(`[DEMO] Delivery to: ${order.deliveryAddress}`, 'info');
    log(`[DEMO] Total: ${formatCurrency(total)}`, 'info');
    return { order, items };
  }

  // Create order
  const { data: createdOrder, error: orderError } = await supabase
    .from('Order')
    .insert(order)
    .select()
    .single();

  if (orderError) {
    log(`Failed to create order: ${orderError.message}`, 'error');
    throw orderError;
  }

  log(`Order created: ${createdOrder.orderNumber}`, 'success');
  log(`Delivery to: ${createdOrder.deliveryAddress}`, 'info');
  log(`Location: ${createdOrder.deliveryLatitude?.toFixed(6)}, ${createdOrder.deliveryLongitude?.toFixed(6)}`, 'info');

  // Create order items (need to get product IDs first)
  const { data: products, error: productsError } = await supabase
    .from('Product')
    .select('id, name, sellingPrice')
    .eq('isActive', true)
    .limit(itemCount);

  if (productsError) {
    log(`Failed to fetch products: ${productsError.message}`, 'error');
  }

  if (products && products.length > 0) {
    const orderItems = items.map((item, index) => ({
      id: generateUUID(), // Need to generate UUID manually
      orderId: createdOrder.id,
      productId: products[index % products.length].id,
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.price.toString(),
      subtotal: item.total.toString(),
      notes: null,
    }));

    const { error: itemsError } = await supabase.from('OrderItem').insert(orderItems);
    if (itemsError) {
      log(`Failed to insert order items: ${itemsError.message}`, 'error');
    } else {
      log(`Order items created: ${orderItems.length}`, 'success');
    }
  } else {
    log('No products available to create order items', 'warn');
  }

  log(`Items: ${items.map(i => `${i.name} x${i.quantity}`).join(', ')}`, 'info');
  log(`Subtotal: ${formatCurrency(subtotal)}`, 'info');
  log(`Total: ${formatCurrency(total)}`, 'info');
  log(`Payment: SIMULATED (PAID)`, 'success');

  return { order: createdOrder, items };
}

/**
 * Call assign-barista edge function
 */
async function assignNearestBarista(order: {
  id: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
}) {
  logSection('Calling assign-barista Edge Function');

  if (!order.deliveryLatitude || !order.deliveryLongitude) {
    log('Order has no delivery location', 'error');
    throw new Error('Order has no delivery location');
  }

  if (CONFIG.demoMode) {
    log(`[DEMO] Would call edge function with:`, 'info');
    log(`[DEMO]   orderId: ${order.id}`, 'info');
    log(`[DEMO]   customerLat: ${order.deliveryLatitude}`, 'info');
    log(`[DEMO]   customerLng: ${order.deliveryLongitude}`, 'info');
    return { success: true, message: '[DEMO] Would assign nearest barista' };
  }

  const response = await fetch(CONFIG.edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.supabaseServiceKey}`,
    },
    body: JSON.stringify({
      orderId: order.id,
      customerLat: order.deliveryLatitude,
      customerLng: order.deliveryLongitude,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    log(`Edge function error: ${result.message || response.statusText}`, 'error');
    throw new Error(result.message || 'Edge function failed');
  }

  if (result.success) {
    log(`Assignment successful!`, 'success');
    log(`Barista: ${result.baristaName}`, 'info');
    log(`Phone: ${result.baristaPhone}`, 'info');
    log(`Distance: ${result.distance}`, 'info');
    log(`Assigned at: ${result.assignedAt}`, 'info');
  } else {
    log(`Assignment failed: ${result.message}`, 'warn');
  }

  return result;
}

/**
 * Verify order assignment in database
 */
async function verifyAssignment(
  supabase: ReturnType<typeof createClient>,
  orderId: string
) {
  logSection('Verifying Assignment');

  if (CONFIG.demoMode) {
    log(`[DEMO] Would verify assignment for order: ${orderId}`, 'info');
    return;
  }

  // Fetch order with baristaId
  const { data: order, error } = await supabase
    .from('Order')
    .select('id, orderNumber, status, baristaId, assignedAt, distanceKm')
    .eq('id', orderId)
    .single();

  if (error) {
    log(`Failed to fetch order: ${error.message}`, 'error');
    throw error;
  }

  // Fetch barista details separately
  let baristaName = 'UNASSIGNED';
  if (order.baristaId) {
    const { data: barista } = await supabase
      .from('User')
      .select('name')
      .eq('id', order.baristaId)
      .single();
    baristaName = barista?.name || order.baristaId;
  }

  log(`Order: ${order.orderNumber}`, 'info');
  log(`Status: ${order.status}`, 'info');
  log(`Barista: ${baristaName}`, order.baristaId ? 'success' : 'error');
  log(`Assigned at: ${order.assignedAt || 'N/A'}`, 'info');
  log(`Distance: ${order.distanceKm ? `${order.distanceKm} km` : 'N/A'}`, 'info');

  if (order.status !== 'ASSIGNED' || !order.baristaId) {
    log(`Assignment verification FAILED`, 'error');
    return false;
  }

  log(`Assignment verification PASSED`, 'success');
  return true;
}

/**
 * Haversine distance calculation (in km)
 */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  console.log('\n' + '🎯'.repeat(30));
  console.log(' ASCEND Fake Order Generator');
  console.log('🎯'.repeat(30));

  if (CONFIG.demoMode) {
    log('Running in DEMO MODE (no actual API calls)', 'warn');
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Step 1: Create fake customer
    const customer = await createFakeCustomer(supabaseAdmin);

    // Step 2: Create fake baristas
    const baristas = await createFakeBaristas(supabaseAdmin);

    // Step 3: Create fake order
    const { order } = await createFakeOrder(supabaseAdmin, customer);

    // Step 4: Assign nearest barista
    const assignment = await assignNearestBarista(order);

    // Step 5: Verify assignment
    await verifyAssignment(supabaseAdmin, order.id);

    // Summary
    logSection('Summary');
    log(`Order Number: ${order.orderNumber}`, 'success');
    log(`Order ID: ${order.id}`, 'info');
    log(`Customer: ${customer.name}`, 'info');
    log(`Baristas Created: ${baristas.length}`, 'info');
    log(`Assignment: ${assignment.success ? 'SUCCESS' : 'FAILED'}`, assignment.success ? 'success' : 'error');

    console.log('\n' + '✨'.repeat(30));
    console.log(' Script completed successfully!');
    console.log('✨'.repeat(30) + '\n');

    process.exit(0);
  } catch (error) {
    log(`Fatal error: ${error}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Run
main();
