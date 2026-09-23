"use client";

import * as React from "react";

export type GeoPosition = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
};

type UseGeolocationOptions = {
  enabled: boolean;
  throttleMs?: number;
};

type UseGeolocationReturn = {
  position: GeoPosition | null;
  error: string | null;
  isWatching: boolean;
  permission: "granted" | "denied" | "prompt" | "unknown";
};

export function useGeolocation({
  enabled,
  throttleMs = 5000,
}: UseGeolocationOptions): UseGeolocationReturn {
  const [position, setPosition] = React.useState<GeoPosition | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isWatching, setIsWatching] = React.useState(false);
  const [permission, setPermission] = React.useState<
    "granted" | "denied" | "prompt" | "unknown"
  >("unknown");

  const lastUpdateRef = React.useRef(0);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("geolocation" in navigator)) {
      setError("Geolocation tidak didukung");
      return;
    }

    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          setPermission(result.state as typeof permission);
          result.onchange = () =>
            setPermission(result.state as typeof permission);
        })
        .catch(() => {});
    }
  }, []);

  React.useEffect(() => {
    if (!enabled) {
      setIsWatching(false);
      return;
    }
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) return;

    setIsWatching(true);
    setError(null);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastUpdateRef.current < throttleMs) return;
        lastUpdateRef.current = now;

        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          altitude: pos.coords.altitude ?? null,
          altitudeAccuracy: pos.coords.altitudeAccuracy ?? null,
          heading: pos.coords.heading ?? null,
          speed: pos.coords.speed ?? null,
          timestamp: pos.timestamp,
        });
        setError(null);
        setPermission("granted");
      },
      (err) => {
        let msg = "Gagal mendapatkan lokasi";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Izin lokasi ditolak";
          setPermission("denied");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "Lokasi tidak tersedia";
        } else if (err.code === err.TIMEOUT) {
          msg = "Timeout mendapatkan lokasi";
        }
        setError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setIsWatching(false);
    };
  }, [enabled, throttleMs]);

  return {
    position,
    error,
    isWatching,
    permission,
  };
}

// ---------- Battery ----------

type NavigatorWithBattery = Navigator & {
  getBattery?: () => Promise<{
    level: number;
    charging: boolean;
    addEventListener: (type: string, listener: () => void) => void;
    removeEventListener: (type: string, listener: () => void) => void;
  }>;
};

export function useBattery() {
  const [info, setInfo] = React.useState<{
    level: number | null;
    charging: boolean | null;
  }>({ level: null, charging: null });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const nav = navigator as NavigatorWithBattery;
    if (!nav.getBattery) return;

    let battery: Awaited<
      ReturnType<NonNullable<typeof nav.getBattery>>
    > | null = null;
    let mounted = true;

    const update = () => {
      if (!mounted || !battery) return;
      setInfo({
        level: Math.round(battery.level * 100),
        charging: battery.charging,
      });
    };

    nav.getBattery().then((b) => {
      if (!mounted) return;
      battery = b;
      update();
      b.addEventListener("levelchange", update);
      b.addEventListener("chargingchange", update);
    });

    return () => {
      mounted = false;
      if (battery) {
        battery.removeEventListener("levelchange", update);
        battery.removeEventListener("chargingchange", update);
      }
    };
  }, []);

  return info;
}

// ---------- Device ----------

export function useDeviceInfo() {
  const [info, setInfo] = React.useState<{
    platform: string | null;
    isMobile: boolean | null;
  }>({ platform: null, isMobile: null });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent;
    let platform: string | null = null;
    if (/android/i.test(ua)) platform = "Android";
    else if (/iphone|ipad|ipod/i.test(ua)) platform = "iOS";
    else if (/mac/i.test(ua)) platform = "macOS";
    else if (/windows/i.test(ua)) platform = "Windows";
    else if (/linux/i.test(ua)) platform = "Linux";

    setInfo({
      platform,
      isMobile: /android|iphone|ipad|ipod/i.test(ua),
    });
  }, []);

  return info;
}