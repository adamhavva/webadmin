"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import {
  RefreshCw,
  Loader2,
} from "lucide-react";

import { useLiveLocations } from "@/hooks/tracking/use-live-locations";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Dynamic import for TrackingMap to avoid SSR issues with Leaflet
const TrackingMapContent = dynamic(
  () => import("@/components/tracking/tracking-map").then((mod) => mod.TrackingMap),
  { ssr: false }
);

const TrackingMapStyles = dynamic(
  () => import("@/components/tracking/tracking-map").then((mod) => mod.TrackingMapStyles),
  { ssr: false }
);

// Default center (Jakarta)
const DEFAULT_CENTER: [number, number] = [-6.2088, 106.8456];

// Loading skeleton for the map
function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Memuat peta...</p>
      </div>
    </div>
  );
}

export default function MapsPage() {
  const { locations, counts, isLoading } = useLiveLocations();
  const [focusUid, setFocusUid] = React.useState<string | null>(null);
  const [mapKey, setMapKey] = React.useState(0);

  // Get baristas only for filtering
  const baristas = React.useMemo(
    () => locations.filter((l) => l.role === "BARISTA"),
    [locations]
  );

  const handleRefresh = () => {
    setMapKey((k) => k + 1);
  };

  return (
    <main className="relative flex h-[calc(100vh-4rem)] flex-col">
      {/* Inject CSS animations */}
      <TrackingMapStyles />

      {/* Header */}
      <div className="flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div>
          <h1 className="text-lg font-semibold">Peta Lokasi</h1>
          <p className="text-sm text-muted-foreground">
            Lacak lokasi barista secara real-time
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">
                {counts.barista} Barista
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">
                {counts.online} Online
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">
                {counts.idle} Idle
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-gray-400" />
              <span className="text-muted-foreground">
                {counts.offline} Offline
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative flex-1">
        <Suspense fallback={<MapSkeleton />}>
          <TrackingMapContent
            key={mapKey}
            locations={locations}
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={12}
            focusUid={focusUid}
            onMarkerClick={setFocusUid}
            className="h-full w-full"
          />
        </Suspense>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-[1000] rounded-lg border bg-background/95 p-3 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
            LEGENDA
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white" />
              <span>Barista</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
              <span>Customer / Anda</span>
            </div>
            <div className="mt-2 border-t pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Online (&lt; 30dtk)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Idle (5mnt)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-400" />
                <span>Offline (&gt; 5mnt)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barista List Overlay */}
        <div className="absolute right-4 top-4 z-[1000] w-72 rounded-lg border bg-background/95 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="border-b px-3 py-2">
            <h3 className="text-sm font-semibold">Daftar Barista</h3>
            <p className="text-xs text-muted-foreground">
              {baristas.length} barista terlihat
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {baristas.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {isLoading ? "Memuat..." : "Tidak ada barista terlihat"}
              </div>
            ) : (
              <ul className="divide-y">
                {baristas.map((barista) => (
                  <li key={barista.uid}>
                    <button
                      type="button"
                      onClick={() => setFocusUid(barista.uid)}
                      className="w-full px-3 py-2 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              barista.computedStatus === "online" &&
                                "bg-green-500",
                              barista.computedStatus === "idle" &&
                                "bg-amber-500",
                              barista.computedStatus === "offline" &&
                                "bg-gray-400"
                            )}
                          />
                          <span className="text-sm font-medium">
                            {barista.name}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {barista.computedStatus}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {barista.latitude.toFixed(5)},{" "}
                        {barista.longitude.toFixed(5)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
