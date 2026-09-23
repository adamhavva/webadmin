// ============================================================
// Firebase RTDB Helpers — client-side
// ============================================================

import {
  ref,
  update,
  onValue,
  onDisconnect,
  type Unsubscribe,
} from "firebase/database";

import { rtdb } from "./firebase";

// ============================================================
// Types
// ============================================================

export type LocationRole = "ADMIN" | "BARISTA" | "CUSTOMER";

export type LiveLocation = {
  uid: string;
  role: LocationRole;
  name: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  speedKmh: number | null;
  timestamp: number;
  lastSeen: number;
  isActive: boolean;
  status: "online" | "idle" | "offline";
  batteryLevel: number | null;
  batteryCharging: boolean | null;
  devicePlatform: string | null;
  deviceIsMobile: boolean | null;
};

export type UpdateLocationInput = {
  uid: string;
  role: LocationRole;
  name: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  batteryLevel: number | null;
  batteryCharging: boolean | null;
  devicePlatform: string | null;
  deviceIsMobile: boolean | null;
};

// ============================================================
// Update Location
// ============================================================

export async function updateLocation(input: UpdateLocationInput) {
  const locationRef = ref(rtdb, `locations/${input.uid}`);

  await update(locationRef, {
    uid: input.uid,
    role: input.role,
    name: input.name,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy,
    altitude: input.altitude,
    altitudeAccuracy: input.altitudeAccuracy,
    heading: input.heading,
    speed: input.speed,
    speedKmh: input.speed !== null ? input.speed * 3.6 : null,
    timestamp: Date.now(),
    lastSeen: Date.now(),
    isActive: true,
    status: "online",
    batteryLevel: input.batteryLevel,
    batteryCharging: input.batteryCharging,
    devicePlatform: input.devicePlatform,
    deviceIsMobile: input.deviceIsMobile,
  });
}

// ============================================================
// Setup onDisconnect — auto offline kalau koneksi putus
// ============================================================

export async function setupDisconnectHandlers(uid: string) {
  const basePath = `locations/${uid}`;
  await onDisconnect(ref(rtdb, `${basePath}/isActive`)).set(false);
  await onDisconnect(ref(rtdb, `${basePath}/status`)).set("offline");
  await onDisconnect(ref(rtdb, `${basePath}/lastSeen`)).set(Date.now());
}

// ============================================================
// Set manual offline
// ============================================================

export async function setLocationOffline(uid: string) {
  try {
    await update(ref(rtdb, `locations/${uid}`), {
      isActive: false,
      status: "offline",
      lastSeen: Date.now(),
    });
  } catch {
    // silent
  }
}

// ============================================================
// Subscribe All Locations
// ============================================================

export function subscribeToLocations(
  callback: (locations: Record<string, LiveLocation>) => void
): Unsubscribe {
  return onValue(ref(rtdb, "locations"), (snapshot) => {
    callback(snapshot.val() ?? {});
  });
}

// ============================================================
// Status computation
// ============================================================

const ONLINE_MS = 30 * 1000; // 30 detik
const IDLE_MS = 5 * 60 * 1000; // 5 menit

export function computeStatus(
  loc: LiveLocation
): "online" | "idle" | "offline" {
  if (!loc.isActive) return "offline";
  const since = Date.now() - (loc.lastSeen ?? loc.timestamp ?? 0);
  if (since < ONLINE_MS) return "online";
  if (since < IDLE_MS) return "idle";
  return "offline";
}