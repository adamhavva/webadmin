"use client";

import * as React from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";

import "leaflet/dist/leaflet.css";

// ============================================================
// Icon
// ============================================================

function getLocationIcon(color: string): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 40px; height: 40px;
        display: flex; align-items: center; justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 40px; height: 40px;
          border-radius: 50%;
          background: ${color}40;
          animation: pulse 1.5s ease-out infinite;
        "></div>
        <div style="
          width: 20px; height: 20px;
          border-radius: 50%;
          background: ${color};
          border: 3px solid white;
          box-shadow: 0 2px 8px ${color}80;
        "></div>
      </div>
    `,
    className: "location-picker-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function getKitchenIcon(): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="
        width: 24px; height: 24px;
        border-radius: 50%;
        background: #EF4444;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `,
    className: "kitchen-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// ============================================================
// Draggable Marker Component
// ============================================================

function DraggableMarker({
  position,
  onPositionChange,
  color = "#3B82F6",
}: {
  position: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
  color?: string;
}) {
  const markerRef = React.useRef<L.Marker>(null);

  const eventHandlers = React.useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const latlng = marker.getLatLng();
          onPositionChange(latlng.lat, latlng.lng);
        }
      },
    }),
    [onPositionChange]
  );

  // Update marker position when props change
  React.useEffect(() => {
    const marker = markerRef.current;
    if (marker) {
      marker.setLatLng(position);
    }
  }, [position]);

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={getLocationIcon(color)}
    />
  );
}

// ============================================================
// Map Click Handler
// ============================================================

function MapClickHandler({
  onLocationChange,
}: {
  onLocationChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ============================================================
// Main Component
// ============================================================

interface LeafletLocationPickerProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
  kitchenLat?: number;
  kitchenLon?: number;
  height?: string;
}

export default function LeafletLocationPicker({
  lat,
  lng,
  onLocationChange,
  kitchenLat = -6.2088,
  kitchenLon = 106.8456,
  height = "h-48",
}: LeafletLocationPickerProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Inject styles
  React.useEffect(() => {
    if (!mounted) return;

    const styleId = "leaflet-location-picker-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); opacity: 0.7; }
        100% { transform: scale(2); opacity: 0; }
      }
      .location-picker-marker,
      .kitchen-marker {
        background: transparent !important;
        border: none !important;
      }
      .leaflet-container {
        font-family: inherit;
        border-radius: 8px;
      }
    `;
    document.head.appendChild(style);
  }, [mounted]);

  if (!mounted) {
    return (
      <div
        className={`flex w-full items-center justify-center bg-muted/30 ${height}`}
      >
        <span className="text-sm text-muted-foreground">Memuat peta...</span>
      </div>
    );
  }

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      className={`w-full ${height}`}
      zoomControl={true}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapClickHandler onLocationChange={onLocationChange} />

      {/* Kitchen marker (fixed) */}
      <Marker position={[kitchenLat, kitchenLon]} icon={getKitchenIcon()} />

      {/* Draggable location marker */}
      <DraggableMarker
        position={[lat, lng]}
        onPositionChange={onLocationChange}
        color="#3B82F6"
      />
    </MapContainer>
  );
}
