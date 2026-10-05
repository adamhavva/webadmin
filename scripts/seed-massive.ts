/**
 * ASCEND Massive Seed Script
 * Seeds 100 baristas + 1000 customers to Supabase and Firebase RTDB
 * Uses Firebase Admin SDK with serviceAccountKey.json
 *
 * Usage:
 *   npx tsx scripts/seed-massive.ts
 */

import { createClient } from '@supabase/supabase-js';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
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

  // Bandung area
  bandung: {
    center: { lat: -6.9175, lng: 107.6191 }, // Alun-alun Bandung
    baristaInnerRadiusKm: 5,  // 80% of baristas within 5km
    baristaOuterRadiusKm: 10,  // 20% of baristas within 10km
    customerRadiusKm: 15,
  },

  // Counts
  baristaCount: 100,
  customerCount: 1000,

  // Barista online/offline split
  baristaOnlineRatio: 0.5,
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

  // Initialize Firebase Admin if not already initialized
  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: CONFIG.firebaseDatabaseUrl,
    });
  }

  return getDatabase();
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

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  'Hapsari', 'Aditya', 'Mahardika', 'Pratiwi', 'Kurniawan', 'Swandaru', 'Nurjanah', 'Permana',
  'Raharjo', 'Andriani', 'Setiawan', 'Kusumawardani', 'Saputra', 'Wibowo', 'Hartono', 'Suryani',
];

const BANDUNG_ADDRESSES = [
  'Jl. Braga', 'Jl. Asia Afrika', 'Jl. Dago', 'Jl. Riau', 'Jl. Setiabudhi',
  'Jl. Merdeka', 'Jl. Sudirman', 'Jl. Gatot Subroto', 'Jl. Pasteur', 'Jl. Buah Batu',
  'Jl. Cihampelas', 'Jl. Gegerkalong', 'Jl. Tubagus', 'Jl. Pasirkaliki', 'Jl. Sukajadi',
  'Jl. Ciroyom', 'Jl. Ibrahim Ajinge', 'Jl. Veteran', 'Jl. Kopo', 'Jl. Moh Toha',
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
// GENERATE BARISTAS WITH 80/20 DISTRIBUTION
// ============================================================

function generateBaristaLocations(): any[] {
  const baristas: any[] = [];
  const onlineCount = Math.floor(CONFIG.baristaCount * CONFIG.baristaOnlineRatio);

  // Inner radius (5km) for 80% of baristas
  const innerBaristaCount = Math.floor(CONFIG.baristaCount * 0.8);
  // Outer radius (10km) for remaining 20%
  const outerBaristaCount = CONFIG.baristaCount - innerBaristaCount;

  // Inner radius baristas (80%)
  for (let i = 0; i < innerBaristaCount; i++) {
    const location = randomCoordinateInRadius(
      CONFIG.bandung.center.lat,
      CONFIG.bandung.center.lng,
      5 // 5km inner radius
    );
    const isOnline = i < onlineCount;
    baristas.push({
      id: generateUUID(),
      firebaseUid: generateFirebaseUid(),
      role: 'BARISTA',
      status: 'ACTIVE',
      name: randomName(),
      phone: generatePhone(),
      address: randomAddress(),
      latitude: location.lat,
      longitude: location.lng,
      avatarUrl: null,
      idNumber: null,
      birthDate: null,
      joinDate: new Date().toISOString(),
      addressKtp: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOnline,
      distanceKm: calculateDistance(CONFIG.bandung.center.lat, CONFIG.bandung.center.lng, location.lat, location.lng),
    });
  }

  // Outer radius baristas (20%)
  for (let i = 0; i < outerBaristaCount; i++) {
    const location = randomCoordinateInRadius(
      CONFIG.bandung.center.lat,
      CONFIG.bandung.center.lng,
      10 // 10km outer radius
    );
    const isOnline = (innerBaristaCount + i) < onlineCount;
    baristas.push({
      id: generateUUID(),
      firebaseUid: generateFirebaseUid(),
      role: 'BARISTA',
      status: 'ACTIVE',
      name: randomName(),
      phone: generatePhone(),
      address: randomAddress(),
      latitude: location.lat,
      longitude: location.lng,
      avatarUrl: null,
      idNumber: null,
      birthDate: null,
      joinDate: new Date().toISOString(),
      addressKtp: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOnline,
      distanceKm: calculateDistance(CONFIG.bandung.center.lat, CONFIG.bandung.center.lng, location.lat, location.lng),
    });
  }

  return baristas;
}

// ============================================================
// SEED SUPABASE
// ============================================================

async function seedSupabaseBaristas(baristas: any[]): Promise<void> {
  const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey);

  log('Inserting baristas to Supabase...', 'info');

  // Batch insert (max 100 per batch)
  const batchSize = 100;
  for (let i = 0; i < baristas.length; i += batchSize) {
    const batch = baristas.slice(i, i + batchSize).map(({ isOnline, distanceKm, ...rest }) => rest);
    const { error } = await supabase.from('User').insert(batch);
    if (error) {
      if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
        log(`Failed to insert baristas batch: ${error.message}`, 'error');
      }
    }
    logProgress(Math.min(i + batchSize, baristas.length), baristas.length, 'Supabase baristas');
  }
}

async function seedSupabaseCustomers(customers: any[]): Promise<void> {
  const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey);

  log('Inserting customers to Supabase...', 'info');

  // Batch insert
  const batchSize = 100;
  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);
    const { error } = await supabase.from('User').insert(batch);
    if (error) {
      if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
        log(`Failed to insert customers batch: ${error.message}`, 'error');
      }
    }
    logProgress(Math.min(i + batchSize, customers.length), customers.length, 'Supabase customers');
  }
}

// ============================================================
// SEED FIREBASE (using Firebase Admin SDK)
// ============================================================

async function seedFirebaseBaristas(db: ReturnType<typeof getDatabase>, baristas: any[]): Promise<void> {
  log('Writing baristas to Firebase RTDB...', 'info');

  for (let i = 0; i < baristas.length; i++) {
    const b = baristas[i];
    const isOnline = b.isOnline;

    const firebaseData = {
      name: b.name,
      phone: b.phone,
      role: 'BARISTA',
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      location: isOnline ? {
        lat: b.latitude,
        lng: b.longitude,
        lastUpdated: Date.now(),
      } : null,
      createdAt: Date.now(),
      orderHistory: [],
    };

    await db.ref(`users/${b.firebaseUid}`).set(firebaseData);
    logProgress(i + 1, baristas.length, 'Firebase baristas');
  }
}

async function seedFirebaseCustomers(db: ReturnType<typeof getDatabase>, customers: any[]): Promise<void> {
  log('Writing customers to Firebase RTDB...', 'info');

  // Batch write using multi-location updates
  const batchSize = 100;
  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);
    const updates: Record<string, any> = {};

    for (const c of batch) {
      updates[`users/${c.firebaseUid}`] = {
        name: c.name,
        phone: c.phone,
        role: 'CUSTOMER',
        status: 'ONLINE',
        location: {
          lat: c.latitude,
          lng: c.longitude,
          lastUpdated: Date.now(),
        },
        createdAt: Date.now(),
      };
    }

    await db.ref().update(updates);
    logProgress(Math.min(i + batchSize, customers.length), customers.length, 'Firebase customers');
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('\n' + '🚀'.repeat(30));
  console.log(' ASCEND Massive Seed Script');
  console.log('🚀'.repeat(30));
  console.log(`\nConfiguration:`);
  console.log(`  - Baristas: ${CONFIG.baristaCount}`);
  console.log(`  - Customers: ${CONFIG.customerCount}`);
  console.log(`  - Bandung Center: ${CONFIG.bandung.center.lat}, ${CONFIG.bandung.center.lng}`);
  console.log(`  - 80% baristas within 5km`);
  console.log(`  - 20% baristas within 10km`);

  try {
    // Initialize Firebase
    log('\nInitializing Firebase Admin SDK...', 'info');
    const db = initFirebase();
    log('Firebase Admin initialized', 'success');

    // Generate baristas
    log('\nGenerating barista data...', 'info');
    const baristas = generateBaristaLocations();
    log(`Generated ${baristas.length} baristas`, 'success');

    // Generate customers
    log('\nGenerating customer data...', 'info');
    const customers: any[] = [];
    for (let i = 0; i < CONFIG.customerCount; i++) {
      const location = randomCoordinateInRadius(
        CONFIG.bandung.center.lat,
        CONFIG.bandung.center.lng,
        CONFIG.bandung.customerRadiusKm
      );

      customers.push({
        id: generateUUID(),
        firebaseUid: generateFirebaseUid(),
        role: 'CUSTOMER',
        status: 'ACTIVE',
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
      });

      if ((i + 1) % 100 === 0) {
        logProgress(i + 1, CONFIG.customerCount, 'Generating customers');
      }
    }
    console.log();
    log(`Generated ${customers.length} customers`, 'success');

    // Seed Supabase
    log('\n--- Seeding Supabase ---', 'info');
    await seedSupabaseBaristas(baristas);
    await seedSupabaseCustomers(customers);

    // Seed Firebase
    log('\n--- Seeding Firebase RTDB ---', 'info');
    await seedFirebaseBaristas(db, baristas);
    await seedFirebaseCustomers(db, customers);

    // Summary
    const onlineBaristas = baristas.filter(b => b.isOnline).length;
    const offlineBaristas = baristas.filter(b => !b.isOnline).length;

    logSection('Summary');
    log(`Baristas created: ${baristas.length}`, 'success');
    log(`  - Online: ${onlineBaristas}`, 'info');
    log(`  - Offline: ${offlineBaristas}`, 'info');
    log(`Customers created: ${customers.length}`, 'success');
    log(`Data stored in Supabase: ✅`, 'success');
    log(`Data stored in Firebase: ✅`, 'success');

    console.log('\n' + '✨'.repeat(30));
    console.log(' Seed completed successfully!');
    console.log('✨'.repeat(30) + '\n');

    process.exit(0);
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

main();
