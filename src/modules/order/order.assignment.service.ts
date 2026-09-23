import { adminDatabase } from "@/lib/firebases/firebase-admin";
import { prisma } from "@/lib/db";

// ============================================================
// Types
// ============================================================

type BaristaLocation = {
  uid: string;
  role: string;
  name: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  status: string;
  lastSeen: number;
};

export type BaristaCandidate = {
  baristaId: string;
  baristaName: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
};

export type FindBaristasInput = {
  customerLatitude: number;
  customerLongitude: number;
  items: Array<{ productId: string; quantity: number }>;
  radiusKm?: number;
  limit?: number;
  excludeBaristaIds?: string[];
};

export type BroadcastOrderInput = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerLatitude: number;
  customerLongitude: number;
  items: Array<{ productName: string; quantity: number }>;
  subtotal: number;
  total: number;
  baristaIds: string[];
  expiresInMs?: number;
};

// ============================================================
// Haversine distance (km)
// ============================================================

function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// Ambil semua barista aktif dari Firebase
// ============================================================

async function getActiveBaristasFromFirebase(): Promise<
  BaristaLocation[]
> {
  const snapshot = await adminDatabase.ref("locations").once("value");
  const data = snapshot.val() ?? {};

  const baristas: BaristaLocation[] = [];
  const now = Date.now();
  const IDLE_MS = 5 * 60 * 1000; // 5 menit

  for (const [uid, loc] of Object.entries(data)) {
    const l = loc as any;
    if (l.role !== "BARISTA") continue;
    if (!l.isActive) continue;

    const lastSeen = l.lastSeen ?? l.timestamp ?? 0;
    if (now - lastSeen > IDLE_MS) continue;

    baristas.push({
      uid,
      role: l.role,
      name: l.name,
      latitude: l.latitude,
      longitude: l.longitude,
      isActive: l.isActive,
      status: l.status,
      lastSeen,
    });
  }

  return baristas;
}

// ============================================================
// Cari barista terdekat yang punya stok cukup
// ============================================================

export async function findNearestBaristasWithStock(
  input: FindBaristasInput
): Promise<BaristaCandidate[]> {
  const radiusKm = input.radiusKm ?? 5;
  const limit = input.limit ?? 3;
  const excludeIds = new Set(input.excludeBaristaIds ?? []);

  // 1. Ambil barista aktif dari Firebase
  const activeBaristas = await getActiveBaristasFromFirebase();
  if (activeBaristas.length === 0) return [];

  const baristaUids = activeBaristas.map((b) => b.uid);

  // 2. Cari user di DB berdasarkan firebaseUid
  const users = await prisma.user.findMany({
    where: {
      firebaseUid: { in: baristaUids },
      role: "BARISTA",
      status: "ACTIVE",
    },
    select: {
      id: true,
      firebaseUid: true,
      name: true,
      baristaStocks: {
        select: {
          productId: true,
          quantity: true,
        },
      },
    },
  });

  const userMap = new Map(users.map((u) => [u.firebaseUid, u]));

  // 3. Filter & hitung jarak
  const candidates: BaristaCandidate[] = [];

  for (const loc of activeBaristas) {
    const user = userMap.get(loc.uid);
    if (!user) continue;
    if (excludeIds.has(user.id)) continue;

    // Cek stok cukup
    const stockMap = new Map(
      user.baristaStocks.map((s) => [s.productId, s.quantity])
    );

    let hasStock = true;
    for (const item of input.items) {
      const qty = stockMap.get(item.productId) ?? 0;
      if (qty < item.quantity) {
        hasStock = false;
        break;
      }
    }
    if (!hasStock) continue;

    // Hitung jarak
    const distanceKm = haversine(
      input.customerLatitude,
      input.customerLongitude,
      loc.latitude,
      loc.longitude
    );

    if (distanceKm > radiusKm) continue;

    candidates.push({
      baristaId: user.id,
      baristaName: user.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      distanceKm,
    });
  }

  candidates.sort((a, b) => a.distanceKm - b.distanceKm);

  return candidates.slice(0, limit);
}

// ============================================================
// Broadcast order ke order_pool di Firebase
// ============================================================

export async function broadcastOrderToBaristas(
  input: BroadcastOrderInput
): Promise<void> {
  const expiresInMs = input.expiresInMs ?? 30000;
  const now = Date.now();
  const expiresAt = now + expiresInMs;

  const users = await prisma.user.findMany({
    where: { id: { in: input.baristaIds } },
    select: { id: true, firebaseUid: true },
  });

  const updates: Record<string, any> = {};

  for (const u of users) {
    updates[`order_pool/${u.firebaseUid}/${input.orderId}`] = {
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      customerName: input.customerName,
      customerLatitude: input.customerLatitude,
      customerLongitude: input.customerLongitude,
      items: input.items,
      subtotal: input.subtotal,
      total: input.total,
      expiresAt,
      createdAt: now,
    };
  }

  if (Object.keys(updates).length > 0) {
    await adminDatabase.ref().update(updates);
  }
}

// ============================================================
// Hapus order dari pool
// ============================================================

export async function removeOrderFromAllPools(
  orderId: string,
  baristaIds: string[]
): Promise<void> {
  if (baristaIds.length === 0) return;

  const users = await prisma.user.findMany({
    where: { id: { in: baristaIds } },
    select: { firebaseUid: true },
  });

  const updates: Record<string, null> = {};
  for (const u of users) {
    updates[`order_pool/${u.firebaseUid}/${orderId}`] = null;
  }

  if (Object.keys(updates).length > 0) {
    await adminDatabase.ref().update(updates);
  }
}

// ============================================================
// Update tracking Firebase (untuk customer lihat barista)
// ============================================================

export async function updateOrderTrackingFirebase(
  orderId: string,
  data: {
    status?: string;
    baristaId?: string | null;
    baristaName?: string | null;
    baristaLatitude?: number | null;
    baristaLongitude?: number | null;
    estimatedDeliveryAt?: number | null;
  }
): Promise<void> {
  await adminDatabase.ref(`orders/${orderId}`).update({
    ...data,
    updatedAt: Date.now(),
  });
}