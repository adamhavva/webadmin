/**
 * ASCEND Complete Seed Script
 *
 * Creates:
 * - 2 Admins (Supabase auth + User table)
 * - 100 Baristas (Firebase Auth + Supabase User + Firebase RTDB)
 * - 1000 Customers (Firebase Auth + Supabase User + Firebase RTDB)
 * - 10 Products with 50%+ margin
 *
 * Usage:
 *   npx tsx scripts/seed-all.ts
 */

import { createClient } from '@supabase/supabase-js';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kjezwxrebnixdpxljklv.supabase.co',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  firebaseDatabaseUrl: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://ascend-v2-4a67d-default-rtdb.asia-southeast1.firebasedatabase.app',

  // Bandung area center
  bandung: {
    center: { lat: -6.9175, lng: 107.6191 },
    baristaRadius: 10,
    customerRadius: 15,
  },

  // Counts
  adminCount: 2,
  baristaCount: 100,
  customerCount: 1000,
  baristaOnlineRatio: 0.5, // 50% ONLINE
  customerOnlineRatio: 0.3, // 30% ONLINE

  // Default password for all users
  defaultPassword: '123456',
};

// ============================================================
// FIREBASE ADMIN SETUP
// ============================================================

function initFirebase() {
  const serviceAccountPath = path.join(process.cwd(), 'credentials', 'firebase', 'serviceAccountKey.json');

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Firebase service account not found: ${serviceAccountPath}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: CONFIG.firebaseDatabaseUrl,
    });
  }

  return {
    auth: getAuth(),
    db: getDatabase(),
  };
}

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

function generateFirebaseUid(): string {
  return crypto.randomBytes(24).toString('hex');
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

function generateEmail(name: string, role: string, index: number): string {
  const cleanName = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
  return `${role.toLowerCase()}.${cleanName}.${index}@ascend.test`;
}

// ============================================================
// NAME GENERATORS
// ============================================================

const FIRST_NAMES = [
  'Ahmad', 'Budi', 'Dewi', 'Eko', 'Fitri', 'Gunawan', 'Hendra', 'Ika', 'Joko', 'Kartika',
  'Lukman', 'Maria', 'Nico', 'Putri', 'Rudi', 'Siti', 'Tono', 'Umar', 'Vina', 'Wati',
  'Yusuf', 'Zahra', 'Andi', 'Bella', 'Citra', 'Dian', 'Erlang', 'Fajar', 'Gita', 'Hana',
  'Indra', 'Jasmine', 'Kiki', 'Lina', 'Made', 'Nadya', 'Oscar', 'Putra', 'Qori', 'Rina',
  'Sari', 'Tika', 'Ulfah', 'Vino', 'Wawan', 'Yuni', 'Zaki', 'Ardi', 'Bima', 'Caca',
];

const LAST_NAMES = [
  'Wijaya', 'Santoso', 'Lestari', 'Prasetyo', 'Handayani', 'Hidayat', 'Kusuma', 'Febriyanti',
  'Widodo', 'Ayuningtyas', 'Hakim', 'Natalia', 'Pratama', 'Wulandari', 'Hermawan', 'Rahayu',
  'Susanto', 'Nugroho', 'Saputra', 'Utami', 'Ningsih', 'Kusuma', 'Wati', 'Santika', 'Laksono',
];

const ADMIN_FIRST_NAMES = ['Dan', 'Admin'];
const ADMIN_LAST_NAMES = ['Iramdani', 'Super User'];

const BANDUNG_ADDRESSES = [
  'Jl. Braga', 'Jl. Asia Afrika', 'Jl. Dago', 'Jl. Riau', 'Jl. Setiabudhi',
  'Jl. Merdeka', 'Jl. Sudirman', 'Jl. Gatot Subroto', 'Jl. Pasteur', 'Jl. Buah Batu',
];

function randomName(): string {
  const first = FIRST_NAMES[randomInt(0, FIRST_NAMES.length - 1)];
  const last = LAST_NAMES[randomInt(0, LAST_NAMES.length - 1)];
  return `${first} ${last}`;
}

function randomAddress(): string {
  const street = BANDUNG_ADDRESSES[randomInt(0, BANDUNG_ADDRESSES.length - 1)];
  const number = randomInt(1, 200);
  return `${street} No. ${number}, Bandung`;
}

// ============================================================
// COFFEE PRODUCTS WITH MARGIN
// ============================================================

const COFFEE_PRODUCTS = [
  { name: 'Espresso', description: 'Single shot espresso', basePrice: 12000 },
  { name: 'Americano', description: 'Espresso with hot water', basePrice: 18000 },
  { name: 'Cappuccino', description: 'Espresso with steamed milk foam', basePrice: 22000 },
  { name: 'Latte', description: 'Espresso with steamed milk', basePrice: 22000 },
  { name: 'Mocha', description: 'Espresso with chocolate and steamed milk', basePrice: 25000 },
  { name: 'Kopi Susu Gula Aren', description: 'Coffee with milk and palm sugar', basePrice: 18000 },
  { name: 'V60 Single Origin', description: 'Pour over from single origin beans', basePrice: 28000 },
  { name: 'Cold Brew', description: '18-hour cold extracted coffee', basePrice: 25000 },
  { name: 'Affogato', description: 'Vanilla ice cream with espresso', basePrice: 30000 },
  { name: 'Matcha Latte', description: 'Japanese green tea with steamed milk', basePrice: 28000 },
  { name: 'Teh Tarik', description: 'Pulled tea with condensed milk', basePrice: 15000 },
  { name: 'Croffle Kopi', description: 'Croissant-waffle with coffee cream', basePrice: 35000 },
];

// ============================================================
// LOGGING
// ============================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const prefix = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️' }[type];
  console.log(`${prefix} ${message}`);
}

function logProgress(current: number, total: number, label: string) {
  const percent = Math.round((current / total) * 100);
  process.stdout.write(`\r${label}: ${current}/${total} (${percent}%)`);
  if (current === total) console.log();
}

function logSection(title: string) {
  console.log('\n' + '═'.repeat(60));
  console.log(` ${title}`);
  console.log('═'.repeat(60));
}

// ============================================================
// SEED ADMINS
// ============================================================

async function seedAdmins(): Promise<any[]> {
  logSection('Seeding Admins');

  const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey);
  const { auth } = initFirebase();

  const admins = [];

  for (let i = 0; i < CONFIG.adminCount; i++) {
    const firstName = ADMIN_FIRST_NAMES[i];
    const lastName = ADMIN_LAST_NAMES[i];
    const name = `${firstName} ${lastName}`;
    const email = i === 0 ? 'admin@ascend.test' : `admin${i + 1}@ascend.test`;
    const password = CONFIG.defaultPassword;

    // Create in Firebase Auth
    try {
      const firebaseUser = await auth.createUser({
        email,
        password,
        displayName: name,
      });

      // Create in Supabase User table
      const userId = generateUUID();
      const { error } = await supabase.from('User').insert({
        id: userId,
        firebaseUid: firebaseUser.uid,
        role: 'ADMIN',
        status: 'ACTIVE',
        name,
        phone: generatePhone(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (error && !error.message.includes('duplicate')) {
        log(`Failed to insert admin to Supabase: ${error.message}`, 'error');
      }

      admins.push({ name, email, password, firebaseUid: firebaseUser.uid });
      log(`Created: ${email} (password: ${password})`, 'success');
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        log(`Admin already exists: ${email}`, 'warn');
      } else {
        log(`Failed to create admin: ${err.message}`, 'error');
      }
    }
  }

  return admins;
}

// ============================================================
// SEED BARISTAS
// ============================================================

async function seedBaristas(): Promise<void> {
  logSection('Seeding Baristas');

  const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey);
  const { auth, db } = initFirebase();

  const onlineCount = Math.floor(CONFIG.baristaCount * CONFIG.baristaOnlineRatio);

  for (let i = 0; i < CONFIG.baristaCount; i++) {
    const name = randomName();
    const email = generateEmail(name, 'barista', i + 1);
    const password = CONFIG.defaultPassword;
    const isOnline = i < onlineCount;

    const location = randomCoordinateInRadius(
      CONFIG.bandung.center.lat,
      CONFIG.bandung.center.lng,
      CONFIG.bandung.baristaRadius
    );

    try {
      // Create in Firebase Auth
      const firebaseUser = await auth.createUser({
        email,
        password,
        displayName: name,
      });

      // Create in Supabase User table
      const userId = generateUUID();
      const { error: supabaseError } = await supabase.from('User').insert({
        id: userId,
        firebaseUid: firebaseUser.uid,
        role: 'BARISTA',
        status: 'ACTIVE',
        name,
        phone: generatePhone(),
        address: randomAddress(),
        latitude: location.lat,
        longitude: location.lng,
        online_status: isOnline ? 'ONLINE' : 'OFFLINE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (supabaseError && !supabaseError.message.includes('duplicate')) {
        log(`Failed to insert barista to Supabase: ${supabaseError.message}`, 'error');
      }

      // Create in Firebase RTDB
      await db.ref(`users/${firebaseUser.uid}`).set({
        name,
        phone: generatePhone(),
        role: 'BARISTA',
        status: isOnline ? 'ONLINE' : 'OFFLINE',
        location: isOnline ? {
          lat: location.lat,
          lng: location.lng,
          lastUpdated: Date.now(),
        } : null,
        createdAt: Date.now(),
        orderHistory: [],
      });

      logProgress(i + 1, CONFIG.baristaCount, 'Baristas');
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        logProgress(i + 1, CONFIG.baristaCount, 'Baristas');
      } else {
        log(`Failed to create barista: ${err.message}`, 'error');
        logProgress(i + 1, CONFIG.baristaCount, 'Baristas');
      }
    }
  }

  log(`Created ${CONFIG.baristaCount} baristas (${onlineCount} online, ${CONFIG.baristaCount - onlineCount} offline)`, 'success');
}

// ============================================================
// SEED CUSTOMERS
// ============================================================

async function seedCustomers(): Promise<void> {
  logSection('Seeding Customers');

  const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey);
  const { auth, db } = initFirebase();

  const onlineCount = Math.floor(CONFIG.customerCount * CONFIG.customerOnlineRatio);

  // Batch insert to Supabase
  const supabaseBatch = [];

  for (let i = 0; i < CONFIG.customerCount; i++) {
    const name = randomName();
    const email = generateEmail(name, 'customer', i + 1);
    const password = CONFIG.defaultPassword;
    const isOnline = i < onlineCount;

    const location = randomCoordinateInRadius(
      CONFIG.bandung.center.lat,
      CONFIG.bandung.center.lng,
      CONFIG.bandung.customerRadius
    );

    const firebaseUid = generateFirebaseUid();

    try {
      // Create in Firebase Auth
      const firebaseUser = await auth.createUser({
        email,
        password,
        displayName: name,
      });

      // Prepare Supabase insert
      supabaseBatch.push({
        id: generateUUID(),
        firebaseUid: firebaseUser.uid,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        name,
        phone: generatePhone(),
        address: randomAddress(),
        latitude: location.lat,
        longitude: location.lng,
        online_status: isOnline ? 'ONLINE' : 'OFFLINE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Insert to Firebase RTDB immediately
      await db.ref(`users/${firebaseUser.uid}`).set({
        name,
        phone: generatePhone(),
        role: 'CUSTOMER',
        status: isOnline ? 'ONLINE' : 'OFFLINE',
        location: isOnline ? {
          lat: location.lat,
          lng: location.lng,
          lastUpdated: Date.now(),
        } : null,
        createdAt: Date.now(),
        orderHistory: [],
      });

      logProgress(i + 1, CONFIG.customerCount, 'Customers');
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        logProgress(i + 1, CONFIG.customerCount, 'Customers');
      } else {
        log(`Failed: ${err.message}`, 'error');
        logProgress(i + 1, CONFIG.customerCount, 'Customers');
      }
    }

    // Batch insert to Supabase every 100 records
    if (supabaseBatch.length >= 100) {
      const batch = supabaseBatch.splice(0, 100);
      await supabase.from('User').insert(batch).then(({ error }) => {
        if (error && !error.message.includes('duplicate')) {
          log(`Supabase batch insert error: ${error.message}`, 'error');
        }
      });
    }
  }

  // Insert remaining
  if (supabaseBatch.length > 0) {
    await supabase.from('User').insert(supabaseBatch).then(({ error }) => {
      if (error && !error.message.includes('duplicate')) {
        log(`Supabase final batch insert error: ${error.message}`, 'error');
      }
    });
  }

  log(`Created ${CONFIG.customerCount} customers (${onlineCount} online, ${CONFIG.customerCount - onlineCount} offline)`, 'success');
}

// ============================================================
// SEED PRODUCTS
// ============================================================

async function seedProducts(): Promise<void> {
  logSection('Seeding Products');

  const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey);

  // Assume HPP (cost) is ~40-50% of selling price for 50%+ margin
  // Margin = (sellingPrice - hpp) / sellingPrice * 100

  const products = COFFEE_PRODUCTS.map((p, i) => {
    // Random HPP between 40-48% of selling price (giving 52-60% margin)
    const hppMultiplier = randomInRange(0.40, 0.48);
    const hpp = Math.round(p.basePrice * hppMultiplier);
    const margin = Math.round(((p.basePrice - hpp) / p.basePrice) * 100);

    return {
      id: generateUUID(),
      name: p.name,
      description: p.description,
      sellingPrice: p.basePrice,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Store HPP for reference (you might want to add this column)
      _hpp: hpp,
      _marginPercent: margin,
    };
  });

  // Insert products
  const insertData = products.map(({ _hpp, _marginPercent, ...p }) => p);
  const { error } = await supabase.from('Product').insert(insertData);

  if (error && !error.message.includes('duplicate')) {
    log(`Failed to insert products: ${error.message}`, 'error');
  }

  log(`Created ${products.length} products:`, 'success');
  for (const p of products) {
    log(`  - ${p.name}: Rp ${p.sellingPrice.toLocaleString('id-ID')} (margin: ${p._marginPercent}%)`, 'info');
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('\n' + '🚀'.repeat(30));
  console.log(' ASCEND Complete Seed Script');
  console.log('🚀'.repeat(30));
  console.log(`\nConfiguration:`);
  console.log(`  - Admins: ${CONFIG.adminCount}`);
  console.log(`  - Baristas: ${CONFIG.baristaCount} (${CONFIG.baristaOnlineRatio * 100}% online)`);
  console.log(`  - Customers: ${CONFIG.customerCount} (${CONFIG.customerOnlineRatio * 100}% online)`);
  console.log(`  - Products: ${COFFEE_PRODUCTS.length}+`);
  console.log(`  - Default Password: ${CONFIG.defaultPassword}`);
  console.log(`  - Area: Bandung`);

  try {
    // Initialize Firebase
    log('\nInitializing Firebase Admin SDK...', 'info');
    initFirebase();
    log('Firebase Admin initialized', 'success');

    // Seed admins
    const admins = await seedAdmins();

    // Seed baristas
    await seedBaristas();

    // Seed customers
    await seedCustomers();

    // Seed products
    await seedProducts();

    // Summary
    logSection('Summary');
    log(`Admins: ${admins.length} (email: admin@ascend.test, password: ${CONFIG.defaultPassword})`, 'success');
    log(`Baristas: ${CONFIG.baristaCount}`, 'success');
    log(`Customers: ${CONFIG.customerCount}`, 'success');
    log(`Products: ${COFFEE_PRODUCTS.length}+ with 50%+ margin`, 'success');
    log(`Firebase Auth: ✅ (all users with password: ${CONFIG.defaultPassword})`, 'success');
    log(`Firebase RTDB: ✅ (all users with location data)`, 'success');
    log(`Supabase: ✅ (all users in User table)`, 'success');

    console.log('\n' + '✨'.repeat(30));
    console.log(' Seed completed successfully!');
    console.log('✨'.repeat(30) + '\n');

    process.exit(0);
  } catch (error: any) {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

main();
