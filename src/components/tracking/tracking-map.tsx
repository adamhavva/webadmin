"use client";

import * as React from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";

import { cn } from "@/lib/utils";
import type { EnrichedLocation } from "@/hooks/tracking/use-live-locations";

import "leaflet/dist/leaflet.css";

// ============================================================
// Types
// ============================================================

type TrackingMapProps = {
  locations: EnrichedLocation[];
  ownUid?: string | null;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  focusUid?: string | null;
  onMarkerClick?: (uid: string) => void;
  className?: string;
};

type MarkerVariant = "barista" | "customer" | "own";

// ============================================================
// Icon generator
// ============================================================

function getMarkerIcon(variant: MarkerVariant, isFaded: boolean): L.DivIcon {
  let color = "#3B82F6";
  let size = 32;
  let ringSize = 0;

  if (variant === "customer") {
    color = "#10B981";
    size = 28;
  } else if (variant === "own") {
    color = "#10B981";
    size = 40;
    ringSize = 60;
  }

  const opacity = isFaded ? 0.5 : 1;

  const ringHtml =
    ringSize > 0
      ? `<div style="
          position: absolute;
          top: 50%; left: 50%;
          width: ${ringSize}px; height: ${ringSize}px;
          margin-left: -${ringSize / 2}px; margin-top: -${ringSize / 2}px;
          border-radius: 50%;
          background: ${color};
          opacity: 0.25;
          animation: pulse-ring 1.5s ease-out infinite;
        "></div>`
      : "";

  const html = `
    <div style="
      position: relative;
      width: ${size}px; height: ${size}px;
      display: flex; align-items: center; justify-content: center;
      opacity: ${opacity};
    ">
      ${ringHtml}
      <div style="
        width: ${size}px; height: ${size}px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        box-shadow: 0 0 ${size / 2}px ${size / 4}px ${color}80;
        animation: breathe 2s ease-in-out infinite;
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "tracking-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// ============================================================
// Auto fit bounds / focus
// ============================================================

function AutoFitBounds({
  locations,
  focusUid,
}: {
  locations: EnrichedLocation[];
  focusUid?: string | null;
}) {
  const map = useMap();

  React.useEffect(() => {
    if (locations.length === 0) return;

    if (focusUid) {
      const target = locations.find((l) => l.uid === focusUid);
      if (target) {
        map.setView([target.latitude, target.longitude], 16, {
          animate: true,
        });
      }
      return;
    }

    if (locations.length === 1) {
      map.setView(
        [locations[0].latitude, locations[0].longitude],
        15,
        { animate: true }
      );
      return;
    }

    const bounds = L.latLngBounds(
      locations.map((l) => [l.latitude, l.longitude])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [locations, focusUid, map]);

  return null;
}

// ============================================================
// Map Component
// ============================================================

export function TrackingMap({
  locations,
  ownUid,
  defaultCenter = [-6.2, 106.8],
  defaultZoom = 12,
  focusUid,
  onMarkerClick,
  className,
}: TrackingMapProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/30",
          className
        )}
      >
        <span className="text-sm text-muted-foreground">Memuat peta...</span>
      </div>
    );
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className={cn("h-full w-full", className)}
      zoomControl={true}
      style={{ background: "#e5e7eb" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <AutoFitBounds locations={locations} focusUid={focusUid} />

      {locations.map((loc) => {
        const isOwn = ownUid && loc.uid === ownUid;
        const variant: MarkerVariant = isOwn
          ? "own"
          : loc.role === "BARISTA"
            ? "barista"
            : "customer";
        const isFaded = loc.computedStatus === "offline";

        return (
          <Marker
            key={loc.uid}
            position={[loc.latitude, loc.longitude]}
            icon={getMarkerIcon(variant, isFaded)}
            eventHandlers={{
              click: () => onMarkerClick?.(loc.uid),
            }}
          >
            <Popup>
              <div className="min-w-[180px] space-y-1.5 text-sm">
                <div className="font-semibold">{loc.name}</div>
                <div className="text-xs text-muted-foreground">
                  {loc.role === "BARISTA"
                    ? "🛵 Barista"
                    : loc.role === "CUSTOMER"
                      ? "👤 Customer"
                      : "🛡️ Admin"}
                  {isOwn && " (Anda)"}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span
                    className={cn(
                      "inline-block size-2 rounded-full",
                      loc.computedStatus === "online" && "bg-green-500",
                      loc.computedStatus === "idle" && "bg-amber-500",
                      loc.computedStatus === "offline" && "bg-gray-400"
                    )}
                  />
                  <span className="capitalize">{loc.computedStatus}</span>
                </div>
                {loc.speedKmh !== null && loc.speedKmh > 0 && (
                  <div className="text-xs text-muted-foreground">
                    🏃 {loc.speedKmh.toFixed(1)} km/j
                  </div>
                )}
                {loc.batteryLevel !== null && (
                  <div className="text-xs text-muted-foreground">
                    🔋 {loc.batteryLevel}%
                    {loc.batteryCharging ? " (charging)" : ""}
                  </div>
                )}
                <div className="border-t pt-1.5 text-[10px] text-muted-foreground">
                  {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

// ============================================================
// CSS Animations injector
// ============================================================

export function TrackingMapStyles() {
  React.useEffect(() => {
    const styleId = "tracking-map-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes breathe {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
      }
      @keyframes pulse-ring {
        0% { transform: scale(0.7); opacity: 0.6; }
        100% { transform: scale(1.5); opacity: 0; }
      }
      .tracking-marker {
        background: transparent !important;
        border: none !important;
      }
      .leaflet-container {
        font-family: inherit;
      }
      .leaflet-popup-content-wrapper {
        border-radius: 8px;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return null;
}