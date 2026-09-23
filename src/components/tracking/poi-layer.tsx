"use client";

import * as React from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

// ============================================================
// POI Config
// ============================================================

const POI_ICONS: Record<string, { emoji: string; label: string }> = {
  fuel: { emoji: "⛽", label: "SPBU" },
  hospital: { emoji: "🏥", label: "Rumah Sakit" },
  police: { emoji: "🚔", label: "Polisi" },
  pharmacy: { emoji: "💊", label: "Apotek" },
  bank: { emoji: "🏦", label: "Bank" },
  atm: { emoji: "🏧", label: "ATM" },
  restaurant: { emoji: "🍽️", label: "Restoran" },
  cafe: { emoji: "☕", label: "Kafe" },
  fast_food: { emoji: "🍔", label: "Fast Food" },
  place_of_worship: { emoji: "🕌", label: "Ibadah" },
  school: { emoji: "🏫", label: "Sekolah" },
  university: { emoji: "🎓", label: "Universitas" },
  parking: { emoji: "🅿️", label: "Parkir" },
  bus_station: { emoji: "🚌", label: "Terminal" },
  fire_station: { emoji: "🚒", label: "Pemadam" },
  convenience: { emoji: "🏪", label: "Minimarket" },
  supermarket: { emoji: "🛒", label: "Supermarket" },
  bakery: { emoji: "🥐", label: "Toko Roti" },
};

const AMENITY_LIST = [
  "fuel",
  "hospital",
  "police",
  "pharmacy",
  "bank",
  "atm",
  "restaurant",
  "cafe",
  "fast_food",
];

const SHOP_LIST = ["convenience", "supermarket", "bakery"];

// ============================================================
// Types
// ============================================================

type POILayerProps = {
  enabled: boolean;
  radiusM?: number;
  /** Filter tipe POI yang ditampilkan. Kalau tidak diisi, tampil semua */
  types?: string[];
};

// ============================================================
// Component
// ============================================================

export function POILayer({
  enabled,
  radiusM = 5000,
  types,
}: POILayerProps) {
  const map = useMap();
  const layerRef = React.useRef<L.LayerGroup | null>(null);

  React.useEffect(() => {
    if (!enabled) {
      layerRef.current?.clearLayers();
      return;
    }

    const layer = L.layerGroup().addTo(map);
    layerRef.current = layer;

    const center = map.getCenter();

    // Filter berdasarkan types (kalau ada)
    const amenities = types
      ? AMENITY_LIST.filter((a) => types.includes(a))
      : AMENITY_LIST;
    const shops = types
      ? SHOP_LIST.filter((s) => types.includes(s))
      : SHOP_LIST;

    // Kalau filter kosong (misal user pilih preset yang tidak match),
    // jangan query — langsung return
    if (amenities.length === 0 && shops.length === 0) {
      return () => {
        layer.clearLayers();
        map.removeLayer(layer);
      };
    }

    // Build Overpass query
    const amenityQuery = amenities
      .map(
        (a) =>
          `node["amenity"="${a}"](around:${radiusM},${center.lat},${center.lng});`
      )
      .join("\n");

    const shopQuery = shops
      .map(
        (s) =>
          `node["shop"="${s}"](around:${radiusM},${center.lat},${center.lng});`
      )
      .join("\n");

    const query = `[out:json][timeout:25];(${amenityQuery}${shopQuery});out body;`;

    const controller = new AbortController();

    fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.elements) return;

        data.elements.forEach((el: any) => {
          const props = el.tags || {};
          const key = props.amenity || props.shop;
          const style = POI_ICONS[key] ?? { emoji: "📍", label: "POI" };

          const icon = L.divIcon({
            html: `<div style="
              font-size: 20px;
              filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
            ">${style.emoji}</div>`,
            className: "poi-marker",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          const address =
            props["addr:full"] || props["addr:street"] || null;

          L.marker([el.lat, el.lon], { icon })
            .bindPopup(
              `
              <div style="min-width: 160px;">
                <div style="font-weight: 600; font-size: 13px;">
                  ${props.name || style.label}
                </div>
                <div style="font-size: 11px; color: #666; margin-top: 4px;">
                  ${style.label}
                  ${props.brand ? `· ${props.brand}` : ""}
                </div>
                ${
                  address
                    ? `<div style="font-size:11px;color:#666;margin-top:4px;">
                        📍 ${address}
                      </div>`
                    : ""
                }
                ${
                  props.opening_hours
                    ? `<div style="font-size:11px;color:#666;margin-top:2px;">
                        🕐 ${props.opening_hours}
                      </div>`
                    : ""
                }
              </div>
            `
            )
            .addTo(layer);
        });
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("POI fetch error:", err);
        }
      });

    return () => {
      controller.abort();
      layer.clearLayers();
      map.removeLayer(layer);
    };
  }, [enabled, radiusM, types, map]);

  return null;
}