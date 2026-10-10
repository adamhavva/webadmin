/**
 * ASCEND Database Explorer
 *
 * Purpose: Explore all tables and data in the database
 *
 * Usage:
 *   npx tsx scripts/explore-db.ts
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// ============================================================
// CONFIG
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kjezwxrebnixdpxljklv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// ============================================================
// UTILITIES
// ============================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'section' = 'info') {
  const prefix = {
    info: '  ',
    success: '✅',
    error: '❌',
    section: '\n─────────────────────────────────────────────────',
  }[type];
  console.log(prefix + ' ' + message);
}

function formatTable(data: any[]): string {
  if (!data || data.length === 0) return '  (empty)';

  const headers = Object.keys(data[0]);
  const colWidths = headers.map(h => Math.max(h.length, ...data.map(r => String(r[h] || '').length)));

  const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ');
  const separator = colWidths.map(w => '-'.repeat(w)).join('-+-');

  let result = '  ' + headerRow + '\n  ' + separator + '\n';

  for (const row of data.slice(0, 10)) { // limit to 10 rows
    const rowStr = headers.map((h, i) => String(row[h] ?? '').padEnd(colWidths[i])).join(' | ');
    result += '  ' + rowStr + '\n';
  }

  if (data.length > 10) {
    result += '  ... and ' + (data.length - 10) + ' more rows\n';
  }

  return result;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('\n🔍 ASCEND Database Explorer\n');

  if (!supabaseServiceKey) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  try {
    // ============================================================
    // 1. USERS
    // ============================================================
    log('USERS TABLE', 'section');
    const { data: users, error: usersError } = await supabase
      .from('User')
      .select('*')
      .order('createdAt', { ascending: false });

    if (usersError) throw usersError;

    log('Total users: ' + (users?.length || 0), 'success');

    // Group by role
    const byRole: Record<string, number> = {};
    users?.forEach(u => {
      byRole[u.role] = (byRole[u.role] || 0) + 1;
    });

    log('By role:');
    for (const [role, count] of Object.entries(byRole)) {
      log('  - ' + role + ': ' + count, 'info');
    }

    // Show sample users
    log('\nSample users (first 5):');
    const sampleUsers = users?.slice(0, 5).map(u => ({
      id: (u.id?.slice(0, 8) || '') + '...',
      name: u.name,
      role: u.role,
      status: u.status,
      lat: u.latitude?.toFixed(4),
      lng: u.longitude?.toFixed(4),
      phone: u.phone,
    })) || [];
    console.log(formatTable(sampleUsers));

    // Show baristas with locations
    const baristasWithLocation = users?.filter(u =>
      u.role === 'BARISTA' && u.latitude && u.longitude
    ).map(u => ({
      id: (u.id?.slice(0, 8) || '') + '...',
      name: u.name,
      status: u.status,
      latitude: u.latitude?.toFixed(6),
      longitude: u.longitude?.toFixed(6),
    })) || [];

    log('\nBaristas with location: ' + baristasWithLocation.length);
    if (baristasWithLocation.length > 0) {
      console.log(formatTable(baristasWithLocation));
    }

    // ============================================================
    // 2. PRODUCTS
    // ============================================================
    log('\nPRODUCTS TABLE', 'section');
    const { data: products, error: productsError } = await supabase
      .from('Product')
      .select('*')
      .order('createdAt', { ascending: false });

    if (productsError) throw productsError;

    log('Total products: ' + (products?.length || 0), 'success');

    const activeProducts = products?.filter(p => p.isActive) || [];
    log('Active products: ' + activeProducts.length);

    log('\nSample products (first 5):');
    const sampleProducts = products?.slice(0, 5).map(p => ({
      id: (p.id?.slice(0, 8) || '') + '...',
      name: p.name,
      price: p.sellingPrice,
      isActive: p.isActive,
    })) || [];
    console.log(formatTable(sampleProducts));

    // ============================================================
    // 3. ORDERS
    // ============================================================
    log('\nORDERS TABLE', 'section');
    const { data: orders, error: ordersError } = await supabase
      .from('Order')
      .select('*')
      .order('createdAt', { ascending: false });

    if (ordersError) throw ordersError;

    log('Total orders: ' + (orders?.length || 0), 'success');
    const totalValue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
    log('Total value: Rp ' + totalValue.toLocaleString('id-ID'), 'info');

    // Group by status
    const byStatus: Record<string, number> = {};
    orders?.forEach(o => {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    });

    log('\nBy status:');
    for (const [status, count] of Object.entries(byStatus)) {
      log('  - ' + status + ': ' + count, 'info');
    }

    // Group by payment status
    const byPayment: Record<string, number> = {};
    orders?.forEach(o => {
      byPayment[o.paymentStatus] = (byPayment[o.paymentStatus] || 0) + 1;
    });

    log('\nBy payment status:');
    for (const [status, count] of Object.entries(byPayment)) {
      log('  - ' + status + ': ' + count, 'info');
    }

    // Show recent orders
    log('\nRecent orders (first 5):');
    const recentOrders = orders?.slice(0, 5).map(o => ({
      id: (o.id?.slice(0, 8) || '') + '...',
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      total: 'Rp ' + Number(o.total).toLocaleString('id-ID'),
      customerName: o.customerName,
      baristaId: (o.baristaId?.slice(0, 8) || '') + '...',
    })) || [];
    console.log(formatTable(recentOrders));

    // ============================================================
    // 4. ORDER ITEMS
    // ============================================================
    log('\nORDER ITEMS TABLE', 'section');
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('OrderItem')
      .select('*')
      .order('createdAt', { ascending: false });

    if (orderItemsError) throw orderItemsError;

    log('Total order items: ' + (orderItems?.length || 0), 'success');

    // ============================================================
    // 5. PAYMENTS
    // ============================================================
    log('\nPAYMENTS TABLE', 'section');
    const { data: payments, error: paymentsError } = await supabase
      .from('Payment')
      .select('*')
      .order('createdAt', { ascending: false });

    if (paymentsError) throw paymentsError;

    log('Total payments: ' + (payments?.length || 0), 'success');

    // ============================================================
    // 6. BARISTA STOCK
    // ============================================================
    log('\nBARISTA STOCK TABLE', 'section');
    const { data: baristaStocks, error: stocksError } = await supabase
      .from('BaristaStock')
      .select('*')
      .order('createdAt', { ascending: false });

    if (stocksError) throw stocksError;

    log('Total barista stocks: ' + (baristaStocks?.length || 0), 'success');

    // Group by barista
    const stocksByBarista: Record<string, number> = {};
    baristaStocks?.forEach(s => {
      stocksByBarista[s.baristaId] = (stocksByBarista[s.baristaId] || 0) + 1;
    });

    log('\nStocks by barista:');
    for (const [baristaId, count] of Object.entries(stocksByBarista)) {
      log('  - ' + (baristaId?.slice(0, 8) || '?') + '...: ' + count + ' products', 'info');
    }

    // ============================================================
    // 7. SETTINGS
    // ============================================================
    log('\nSETTINGS TABLE', 'section');
    const { data: settings, error: settingsError } = await supabase
      .from('Setting')
      .select('*')
      .order('sortOrder');

    if (settingsError) throw settingsError;

    log('Total settings: ' + (settings?.length || 0), 'success');

    log('\nAll settings:');
    const settingsList = settings?.map(s => ({
      key: s.key,
      name: s.name,
      type: s.type,
      value: s.value,
      isActive: s.isActive,
    })) || [];
    console.log(formatTable(settingsList));

    // ============================================================
    // SUMMARY
    // ============================================================
    log('\n================================================', 'section');
    log('SUMMARY', 'success');
    log('================================================', 'section');
    log('Users: ' + (users?.length || 0), 'info');
    log('Products: ' + (products?.length || 0), 'info');
    log('Orders: ' + (orders?.length || 0), 'info');
    log('Order Items: ' + (orderItems?.length || 0), 'info');
    log('Payments: ' + (payments?.length || 0), 'info');
    log('Barista Stocks: ' + (baristaStocks?.length || 0), 'info');
    log('Settings: ' + (settings?.length || 0), 'info');

  } catch (error) {
    log('Error: ' + error, 'error');
    console.error(error);
  }

  console.log('\n');
}

main();
