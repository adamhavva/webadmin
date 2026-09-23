"use client";

import * as React from "react";
import {
  computeStatus,
  subscribeToLocations,
  type LiveLocation,
} from "@/lib/firebases/firebase-rtdb";

export type EnrichedLocation = LiveLocation & {
  computedStatus: "online" | "idle" | "offline";
};

type UseLiveLocationsReturn = {
  locations: EnrichedLocation[];
  raw: Record<string, LiveLocation>;
  isLoading: boolean;
  counts: {
    total: number;
    barista: number;
    customer: number;
    online: number;
    idle: number;
    offline: number;
  };
};

export function useLiveLocations(): UseLiveLocationsReturn {
  const [raw, setRaw] = React.useState<Record<string, LiveLocation>>({});
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = subscribeToLocations((data) => {
      setRaw(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Recompute status setiap 15 detik
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  const locations = React.useMemo<EnrichedLocation[]>(() => {
    void tick;
    return Object.values(raw).map((loc) => ({
      ...loc,
      computedStatus: computeStatus(loc),
    }));
  }, [raw, tick]);

  const counts = React.useMemo(() => {
    const barista = locations.filter((l) => l.role === "BARISTA").length;
    const customer = locations.filter((l) => l.role === "CUSTOMER").length;
    const online = locations.filter(
      (l) => l.computedStatus === "online"
    ).length;
    const idle = locations.filter((l) => l.computedStatus === "idle").length;
    const offline = locations.filter(
      (l) => l.computedStatus === "offline"
    ).length;

    return {
      total: locations.length,
      barista,
      customer,
      online,
      idle,
      offline,
    };
  }, [locations]);

  return { locations, raw, isLoading, counts };
}