"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Clock, Loader2 } from "lucide-react";

// ============================================================
// Types
// ============================================================

export interface InlineMapLocation {
  latitude: number;
  longitude: number;
}

export interface BaristaLocationData {
  latitude: number;
  longitude: number;
  baristaName?: string;
}

export interface InlineMapProps {
  userLocation: InlineMapLocation;
  baristaLocation?: BaristaLocationData;
  onLocationChange?: (lat: number, lng: number) => void;
  compact?: boolean; // true = 200px, false = 300px
}

// Default location (Jakarta)
const DEFAULT_LAT = -6.2088;
const DEFAULT_LON = 106.8456;

// Haversine formula for distance calculation
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(km: number): string {
  if (km < 1) return Math.round(km * 1000) + " m";
  return km.toFixed(1) + " km";
}

function calculateETA(distanceKm: number): number {
  // Assuming average speed of 30 km/h
  return Math.round((distanceKm / 30) * 60);
}

// ============================================================
// Inline Map Component
// ============================================================

export function InlineMap({
  userLocation,
  baristaLocation,
  onLocationChange,
  compact = false,
}: InlineMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const baristaMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate distance and ETA
  const distance = baristaLocation
    ? haversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        baristaLocation.latitude,
        baristaLocation.longitude
      )
    : undefined;

  const eta = distance ? calculateETA(distance) : undefined;

  // Handle client-side mounting
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;

    let mounted = true;

    const initMap = async () => {
      try {
        // Dynamically import Leaflet and its CSS
        const leaflet = await import("leaflet");
        const L = leaflet.default;

        // Import CSS
        await import("leaflet/dist/leaflet.css");

        if (!mounted || !mapContainerRef.current) return;

        // Clean up existing map instance
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Create map
        const map = L.map(mapContainerRef.current, {
          center: [userLocation.latitude, userLocation.longitude],
          zoom: 15,
          zoomControl: true,
          attributionControl: true,
        });

        // Add tile layer
        L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }
        ).addTo(map);

        // Custom marker icons using SVG
        const userIcon = L.divIcon({
          className: "custom-marker user-marker",
          html: `
            <div style="
              width: 40px;
              height: 40px;
              background: #22c55e;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            ">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <div style="
                position: absolute;
                bottom: -8px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 8px solid #22c55e;
              "></div>
            </div>
          `,
          iconSize: [40, 48],
          iconAnchor: [20, 48],
          popupAnchor: [0, -48],
        });

        const baristaIcon = L.divIcon({
          className: "custom-marker barista-marker",
          html: `
            <div style="
              width: 36px;
              height: 36px;
              background: #f97316;
              border: 3px solid white;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -18],
        });

        // Add user marker (draggable)
        const userMarker = L.marker(
          [userLocation.latitude, userLocation.longitude],
          {
            draggable: true,
            icon: userIcon,
          }
        )
          .addTo(map)
          .bindPopup(
            "<strong>Lokasi Pengantaran</strong><br/>Geser marker untuk mengubah posisi"
          );

        // Handle drag end
        userMarker.on("dragend", (e: any) => {
          const pos = e.target.getLatLng();
          onLocationChange?.(pos.lat, pos.lng);
        });

        userMarkerRef.current = userMarker;

        // Add barista marker if available
        if (baristaLocation) {
          const baristaMarker = L.marker(
            [baristaLocation.latitude, baristaLocation.longitude],
            {
              draggable: false,
              icon: baristaIcon,
            }
          )
            .addTo(map)
            .bindPopup(
              `<strong>${baristaLocation.baristaName || "Barista"}</strong><br/>Lokasi saat ini`
            );

          baristaMarkerRef.current = baristaMarker;

          // Draw dashed route line
          const routeLine = L.polyline(
            [
              [baristaLocation.latitude, baristaLocation.longitude],
              [userLocation.latitude, userLocation.longitude],
            ],
            {
              color: "#22c55e",
              weight: 4,
              dashArray: "10, 10",
              opacity: 0.8,
            }
          ).addTo(map);

          routeLineRef.current = routeLine;

          // Fit bounds to show both markers
          map.fitBounds(routeLine.getBounds(), {
            padding: [40, 40],
            maxZoom: 15,
          });
        }

        // Handle map resize
        setTimeout(() => {
          if (mapInstanceRef.current) {
            map.invalidateSize();
          }
        }, 100);

        mapInstanceRef.current = map;
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to initialize map:", err);
        setError("Gagal memuat peta");
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isClient, userLocation, baristaLocation, onLocationChange]);

  // Update marker positions when locations change
  useEffect(() => {
    if (!mapInstanceRef.current || !isClient) return;

    const updateMarkers = async () => {
      const leaflet = await import("leaflet");
      const L = leaflet.default;

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([
          userLocation.latitude,
          userLocation.longitude,
        ]);
      }

      if (
        baristaLocation &&
        baristaMarkerRef.current &&
        routeLineRef.current
      ) {
        baristaMarkerRef.current.setLatLng([
          baristaLocation.latitude,
          baristaLocation.longitude,
        ]);

        // Update route line
        routeLineRef.current.setLatLngs([
          [baristaLocation.latitude, baristaLocation.longitude],
          [userLocation.latitude, userLocation.longitude],
        ]);

        // Fit bounds
        const bounds = L.latLngBounds([
          [baristaLocation.latitude, baristaLocation.longitude],
          [userLocation.latitude, userLocation.longitude],
        ]);
        mapInstanceRef.current.fitBounds(bounds, {
          padding: [40, 40],
          maxZoom: 15,
        });
      }

      mapInstanceRef.current.invalidateSize();
    };

    updateMarkers();
  }, [userLocation, baristaLocation, isClient]);

  // Handle window resize
  useEffect(() => {
    if (!isClient) return;

    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isClient]);

  if (!isClient) {
    return (
      <div
        className={`w-full ${compact ? "h-[200px]" : "h-[300px]"} bg-gray-100 rounded-xl flex items-center justify-center`}
      >
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          <span>Memuat peta...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Map Container */}
      <div
        className={`w-full ${compact ? "h-[200px]" : "h-[300px]"} rounded-xl overflow-hidden border border-gray-200 relative`}
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-gray-400" />
              <span className="text-sm text-gray-500">Memuat peta...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 bg-gray-100 z-10 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MapPin size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Map */}
        <div
          ref={mapContainerRef}
          className="w-full h-full"
          style={{ background: "#f5f5f5" }}
        />
      </div>

      {/* Info Bar */}
      <div
        className={`mt-3 p-3 bg-gray-50 rounded-xl space-y-2 text-sm ${compact ? "text-xs" : ""}`}
      >
        {/* User Location */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
          <span className="font-medium text-gray-700 flex-shrink-0">Lokasi:</span>
          <span className="text-gray-600 truncate">
            {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
          </span>
        </div>

        {/* Barista Location */}
        {baristaLocation && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500 flex-shrink-0" />
              <span className="font-medium text-gray-700 flex-shrink-0">
                {baristaLocation.baristaName || "Barista"}:
              </span>
              <span className="text-gray-600 truncate">
                {baristaLocation.latitude.toFixed(6)},{" "}
                {baristaLocation.longitude.toFixed(6)}
              </span>
            </div>

            {/* Distance */}
            <div className="flex items-center gap-2">
              <Navigation size={14} className="text-green-500 flex-shrink-0" />
              <span className="font-medium text-gray-700 flex-shrink-0">Jarak:</span>
              <span className="text-gray-600">
                {distance !== undefined ? formatDistance(distance) : "-"}
              </span>
            </div>

            {/* ETA */}
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-blue-500 flex-shrink-0" />
              <span className="font-medium text-gray-700 flex-shrink-0">ETA:</span>
              <span className="text-gray-600">
                {eta !== undefined ? `~${eta} menit` : "-"}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Lokasi Pengantaran (geser)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span>Barista</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Geolocation Helper Hook
// ============================================================

export interface UseGeolocationResult {
  location: InlineMapLocation;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useGeolocation(
  defaultLocation: InlineMapLocation = { latitude: DEFAULT_LAT, longitude: DEFAULT_LON }
): UseGeolocationResult {
  const [location, setLocation] = useState<InlineMapLocation>(defaultLocation);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation tidak tersedia di browser ini");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError("Tidak dapat mendapatkan lokasi");
        setLocation(defaultLocation);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  useEffect(() => {
    getLocation();
  }, []);

  return { location, loading, error, refresh: getLocation };
}

// ============================================================
// Export default
// ============================================================

export default InlineMap;
