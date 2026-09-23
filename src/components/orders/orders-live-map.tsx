"use client";

import * as React from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";

import { cn } from "@/lib/utils";

import "leaflet/dist/leaflet.css";

// ============================================================
// Types
// ============================================================

type ActiveOrder = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  deliveryAddress: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  baristaId: string | null;
  baristaName: string | null;
  total: number;
  distanceKm: number | null;
  createdAt: string;
};

type OrdersLiveMapProps = {
  orders: ActiveOrder[];
  focusOrderId?: string | null;
  onMarkerClick?: (orderId: string) => void;
  className?: string;
};

// ============================================================
// Icons
// ============================================================

function getOrderIcon(status: string): L.DivIcon {
  let color = "#F59E0B";
  if (status === "ASSIGNED") color = "#3B82F6";
  else if (status === "ACCEPTED") color = "#6366F1";
  else if (status === "DELIVERING") color = "#06B6D4";
  else if (status === "ARRIVED") color = "#10B981";

  const html = `
    <div style="
      position: relative;
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
    ">
      <div style="
        position: absolute;
        width: 48px; height: 48px;
        border-radius: 50%;
        background: ${color};
        opacity: 0.25;
        animation: pulse-ring 1.5s ease-out infinite;
      "></div>
      <div style="
        width: 36px; height: 36px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        box-shadow: 0 2px 8px ${color}80;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
      ">📦</div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "order-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

// ============================================================
// Auto-fit
// ============================================================

function AutoFitBounds({
  orders,
  focusOrderId,
}: {
  orders: ActiveOrder[];
  focusOrderId?: string | null;
}) {
  const map = useMap();

  React.useEffect(() => {
    const withCoords = orders.filter(
      (o) => o.deliveryLatitude !== null && o.deliveryLongitude !== null
    );
    if (withCoords.length === 0) return;

    if (focusOrderId) {
      const target = withCoords.find((o) => o.id === focusOrderId);
      if (target) {
        map.setView(
          [target.deliveryLatitude!, target.deliveryLongitude!],
          16,
          { animate: true }
        );
      }
      return;
    }

    if (withCoords.length === 1) {
      map.setView(
        [withCoords[0].deliveryLatitude!, withCoords[0].deliveryLongitude!],
        15,
        { animate: true }
      );
      return;
    }

    const bounds = L.latLngBounds(
      withCoords.map((o) => [o.deliveryLatitude!, o.deliveryLongitude!])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [orders, focusOrderId, map]);

  return null;
}

// ============================================================
// Map Component
// ============================================================

export function OrdersLiveMap({
  orders,
  focusOrderId,
  onMarkerClick,
  className,
}: OrdersLiveMapProps) {
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

  const ordersWithCoords = orders.filter(
    (o) => o.deliveryLatitude !== null && o.deliveryLongitude !== null
  );

  return (
    <MapContainer
      center={[-6.2, 106.8]}
      zoom={12}
      className={cn("h-full w-full", className)}
      zoomControl={true}
      style={{ background: "#e5e7eb" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />

      <AutoFitBounds orders={ordersWithCoords} focusOrderId={focusOrderId} />

      {ordersWithCoords.map((o) => (
        <Marker
          key={o.id}
          position={[o.deliveryLatitude!, o.deliveryLongitude!]}
          icon={getOrderIcon(o.status)}
          eventHandlers={{
            click: () => onMarkerClick?.(o.id),
          }}
        >
          <Popup>
            <div className="min-w-[200px] space-y-2 text-sm">
              <div className="font-mono text-xs font-semibold">
                {o.orderNumber}
              </div>
              <div className="font-medium">{o.customerName}</div>
              {o.deliveryAddress && (
                <div className="text-xs text-muted-foreground">
                  📍 {o.deliveryAddress}
                </div>
              )}
              {o.baristaName && (
                <div className="text-xs text-muted-foreground">
                  🛵 {o.baristaName}
                </div>
              )}
              {o.distanceKm !== null && (
                <div className="text-xs text-muted-foreground">
                  Jarak: {o.distanceKm.toFixed(2)} km
                </div>
              )}
              <div className="border-t pt-1.5 text-xs">
                Status:{" "}
                <span className="font-medium">{o.status}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

// ============================================================
// CSS Styles
// ============================================================

export function OrdersLiveMapStyles() {
  React.useEffect(() => {
    const styleId = "orders-live-map-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes pulse-ring {
        0% { transform: scale(0.7); opacity: 0.6; }
        100% { transform: scale(1.5); opacity: 0; }
      }
      .order-marker {
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