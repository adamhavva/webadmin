"use client";

import { useState, useCallback } from "react";
import { InlineMap, useGeolocation, InlineMapLocation, BaristaLocationData } from "./InlineMap";

// ============================================================
// Example Usage in a Component
// ============================================================

interface CheckoutLocationStepProps {
  baristaLocation?: {
    latitude: number;
    longitude: number;
    baristaName?: string;
  };
  onLocationConfirm: (lat: number, lng: number) => void;
}

export function CheckoutLocationStep({
  baristaLocation,
  onLocationConfirm,
}: CheckoutLocationStepProps) {
  // Use geolocation hook to get user's current location
  const { location: userLocation, loading: geoLoading, error: geoError, refresh: refreshGeo } = useGeolocation();

  const handleLocationChange = useCallback(
    (lat: number, lng: number) => {
      onLocationConfirm(lat, lng);
    },
    [onLocationConfirm]
  );

  // Loading state while getting geolocation
  if (geoLoading) {
    return (
      <div className="w-full h-[300px] bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Mendapatkan lokasi Anda...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (geoError) {
    return (
      <div className="w-full">
        <div className="w-full h-[300px] bg-gray-100 rounded-xl flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-gray-500 mb-3">{geoError}</p>
            <button
              onClick={refreshGeo}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm"
            >
              Coba Lagi
            </button>
          </div>
        </div>
        {/* Still show map with default location */}
        <InlineMap
          userLocation={{ latitude: -6.2088, longitude: 106.8456 }}
          baristaLocation={baristaLocation}
          onLocationChange={handleLocationChange}
        />
      </div>
    );
  }

  return (
    <InlineMap
      userLocation={userLocation}
      baristaLocation={baristaLocation}
      onLocationChange={handleLocationChange}
      compact={false}
    />
  );
}

// ============================================================
// Simple Example (without geolocation)
// ============================================================

export function SimpleMapExample() {
  const [userLoc, setUserLoc] = useState<InlineMapLocation>({
    latitude: -6.2088,
    longitude: 106.8456,
  });

  const baristaLoc: BaristaLocationData = {
    latitude: -6.2100,
    longitude: 106.8480,
    baristaName: "Pak Budi",
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Peta Lokasi</h2>

      <InlineMap
        userLocation={userLoc}
        baristaLocation={baristaLoc}
        onLocationChange={(lat, lng) => setUserLoc({ latitude: lat, longitude: lng })}
        compact={false}
      />

      <div className="mt-4 p-4 bg-gray-50 rounded-xl">
        <p className="text-sm text-gray-600">
          <strong>Lokasi Pengantaran:</strong>{" "}
          {userLoc.latitude.toFixed(6)}, {userLoc.longitude.toFixed(6)}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Compact Mode Example
// ============================================================

export function CompactMapExample() {
  const userLoc: InlineMapLocation = {
    latitude: -6.2088,
    longitude: 106.8456,
  };

  const baristaLoc: BaristaLocationData = {
    latitude: -6.2100,
    longitude: 106.8480,
    baristaName: "Bu Sari",
  };

  return (
    <div className="p-4">
      <InlineMap
        userLocation={userLoc}
        baristaLocation={baristaLoc}
        compact={true}
      />
    </div>
  );
}

// ============================================================
// Without Barista Example
// ============================================================

export function UserOnlyMapExample() {
  const [userLoc, setUserLoc] = useState<InlineMapLocation>({
    latitude: -6.2088,
    longitude: 106.8456,
  });

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Pilih Lokasi</h2>
      <p className="text-sm text-gray-500 mb-4">
        Geser marker hijau untuk memilih lokasi pengantaran
      </p>

      <InlineMap
        userLocation={userLoc}
        onLocationChange={(lat, lng) => setUserLoc({ latitude: lat, longitude: lng })}
        compact={false}
      />
    </div>
  );
}
