"use client";

import * as React from "react";
import {
  setLocationOffline,
  setupDisconnectHandlers,
  updateLocation,
  type LocationRole,
} from "@/lib/firebases/firebase-rtdb";
import {
  useBattery,
  useDeviceInfo,
  useGeolocation,
} from "./use-geolocation";

type UseTrackingBroadcastOptions = {
  enabled: boolean;
  uid: string | null | undefined;
  role: LocationRole | null | undefined;
  name: string | null | undefined;
  broadcastIntervalMs?: number;
};

type UseTrackingBroadcastReturn = {
  isActive: boolean;
  lastSyncAt: number | null;
  error: string | null;
  permission: "granted" | "denied" | "prompt" | "unknown";
};

export function useTrackingBroadcast({
  enabled,
  uid,
  role,
  name,
  broadcastIntervalMs = 5000,
}: UseTrackingBroadcastOptions): UseTrackingBroadcastReturn {
  const canBroadcast = Boolean(enabled && uid && role && name);

  const geo = useGeolocation({
    enabled: canBroadcast,
    throttleMs: broadcastIntervalMs,
  });
  const battery = useBattery();
  const device = useDeviceInfo();

  const [lastSyncAt, setLastSyncAt] = React.useState<number | null>(null);

  // Setup onDisconnect
  React.useEffect(() => {
    if (!canBroadcast || !uid) return;

    setupDisconnectHandlers(uid).catch(() => {});

    return () => {
      setLocationOffline(uid).catch(() => {});
    };
  }, [canBroadcast, uid]);

  // Broadcast on position update
  React.useEffect(() => {
    if (!canBroadcast || !uid || !role || !name) return;
    if (!geo.position) return;

    let cancelled = false;

    (async () => {
      try {
        await updateLocation({
          uid,
          role,
          name,
          latitude: geo.position!.latitude,
          longitude: geo.position!.longitude,
          accuracy: geo.position!.accuracy,
          altitude: geo.position!.altitude,
          altitudeAccuracy: geo.position!.altitudeAccuracy,
          heading: geo.position!.heading,
          speed: geo.position!.speed,
          batteryLevel: battery.level,
          batteryCharging: battery.charging,
          devicePlatform: device.platform,
          deviceIsMobile: device.isMobile,
        });
        if (!cancelled) setLastSyncAt(Date.now());
      } catch {
        // silent
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    canBroadcast,
    uid,
    role,
    name,
    geo.position,
    battery.level,
    battery.charging,
    device.platform,
    device.isMobile,
  ]);

  // beforeunload
  React.useEffect(() => {
    if (!canBroadcast || !uid) return;
    const handler = () => {
      setLocationOffline(uid).catch(() => {});
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [canBroadcast, uid]);

  return {
    isActive: canBroadcast && geo.isWatching,
    lastSyncAt,
    error: geo.error,
    permission: geo.permission,
  };
}