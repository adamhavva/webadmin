/**
 * ASCEND End-to-End Test Script
 *
 * Purpose: Test complete order flow
 * - List existing users & orders
 * - Test Edge Function with existing order
 * - Verify assignment works
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/test-flow.ts
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// CONFIG
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const edgeFunctionUrl = supabaseUrl + '/functions/v1/assign-barista';

// ============================================================
// LOGGING
// ============================================================

function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const prefix = {
    info: '  ',
    success: '✅',
    error: '❌',
  }[type];
  console.log(`${prefix} ${message}`);
}

function section(title: string) {
  console.log('\n' + '═'.repeat(60));
  console.log(` ${title}`);
  console.log('═'.repeat(60));
}

// ============================================================
// HAVERSINE
// ============================================================

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// TEST FUNCTIONS
// ============================================================

async function testEdgeFunction(orderId: string, lat: number, lng: number) {
  section('TESTING EDGE FUNCTION');

  log(`Order ID: ${orderId.slice(0, 8)}...`);
  log(`Customer Location: ${lat}, ${lng}`);

  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ orderId, customerLat: lat, customerLng: lng }),
  });

  const result = await response.json();

  if (response.ok && result.success) {
    log(`Assignment successful!`);
    log(`Barista: ${result.baristaName}`);
    log(`Distance: ${result.distance}`);
    return { success: true, ...result };
  } else {
    log(`Failed: ${result.message || response.statusText}`, 'error');
    return { success: false, message: result.message };
  }
}

async function main() {
  console.log('\n🔬 ASCEND End-to-End Test\n');

  if (!supabaseServiceKey) {
    log('SUPABASE_SERVICE_KEY required', 'error');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  try {
    // 1. List baristas
    section('BARISTAS WITH LOCATIONS');
    const { data: baristas } = await supabase
      .from('User')
      .select('id, name, latitude, longitude, status')
      .eq('role', 'BARISTA')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (!baristas?.length) {
      log('No baristas with locations found', 'error');
      return;
    }

    log(`Found ${baristas.length} baristas:`);
    baristas.forEach((b) => {
      const lat = b.latitude?.toFixed(4);
      const lng = b.longitude?.toFixed(4);
      log(`  • ${b.name} (${b.status}) - ${lat}, ${lng}`);
    });

    // 2. Find orders with SEARCHING status (ready for assignment)
    section('ORDERS WITH SEARCHING STATUS');
    const { data: orders } = await supabase
      .from('Order')
      .select('id, orderNumber, status, deliveryLatitude, deliveryLongitude')
      .eq('status', 'SEARCHING')
      .order('createdAt', { ascending: false })
      .limit(5);

    if (!orders?.length) {
      log('No SEARCHING orders found - need to create one');

      // Create test order
      section('CREATING TEST ORDER');
      const orderData = {
        orderNumber: `TEST-${Date.now()}`,
        channel: 'ONLINE',
        status: 'SEARCHING',
        customerName: 'Test Customer',
        customerPhone: '+6281234567890',
        deliveryLatitude: -6.914,
        deliveryLongitude: 107.61,
        subtotal: 50000,
        chargesTotal: 0,
        deliveryFee: 0,
        total: 50000,
        paymentStatus: 'PAID',
        paymentProvider: 'MIDTRANS',
        paymentChannel: 'PREPAID',
      };

      const { data: newOrder, error: createError } = await supabase
        .from('Order')
        .insert(orderData)
        .select()
        .single();

      if (createError) {
        log(`Create failed: ${createError.message}`, 'error');
        return;
      }

      log(`Created order: ${newOrder.orderNumber}`);

      // Test edge function
      const result = await testEdgeFunction(
        newOrder.id,
        newOrder.deliveryLatitude,
        newOrder.deliveryLongitude
      );

      if (result.success) {
        // Verify in DB
        section('VERIFY ASSIGNMENT');
        const { data: verified } = await supabase
          .from('Order')
          .select('id, status, baristaId, assignedAt, distanceKm')
          .eq('id', newOrder.id)
          .single();

        log(`Status: ${verified.status}`);
        log(`Barista assigned: ${verified.baristaId ? 'YES' : 'NO'}`);
        log(`Distance: ${verified.distanceKm} km`);
      }
    } else {
      log(`Found ${orders.length} SEARCHING orders`);

      for (const order of orders) {
        console.log('');
        const result = await testEdgeFunction(
          order.id,
          order.deliveryLatitude!,
          order.deliveryLongitude!
        );

        if (result.success) break;
      }
    }

    // 3. Final summary
    section('SUMMARY');
    const { count: totalBaristas } = await supabase
      .from('User')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'BARISTA');

    const { count: totalOrders } = await supabase
      .from('Order')
      .select('*', { count: 'exact', head: true });

    log(`Total baristas: ${totalBaristas}`);
    log(`Total orders: ${totalOrders}`);

  } catch (error) {
    log(`Error: ${error}`, 'error');
    console.error(error);
  }

  console.log('\n');
}

main();
