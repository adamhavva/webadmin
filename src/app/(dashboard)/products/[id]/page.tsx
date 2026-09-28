"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  AlertTriangle,
  ArrowLeft,
  DollarSign,
  Loader2,
  MapPin,
} from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProductImage = { url: string; isPrimary?: boolean };

type RecipeItem = { inventoryItemId: string; inventoryItemName: string; quantity: number };
type Recipe = { id: string; version: number; items: RecipeItem[] };

type ProductDetail = {
  id: string;
  name: string;
  description: string;
  sellingPrice: number;
  images: ProductImage[];
  metadata: Record<string, string>;
  recipes: Recipe[];
  totalStock: number;
};

type ProductResponse = { success: boolean; data?: ProductDetail; error?: { message?: string } };

function fmtRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function MapPlaceholder({ lat, lon }: { lat: number; lon: number }) {
  return (
    <div className="relative h-48 w-full overflow-hidden rounded-xl bg-muted">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="mx-auto mb-1 size-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Lat: {lat.toFixed(6)}, Lon: {lon.toFixed(6)}</p>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [product, setProduct] = React.useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [resolvedId, setResolvedId] = React.useState<string | null>(null);
  const [mapLat, setMapLat] = React.useState<number>(-6.2088);
  const [mapLon, setMapLon] = React.useState<number>(106.8456);
  const [locationError, setLocationError] = React.useState<string | null>(null);
  const [isLocating, setIsLocating] = React.useState(false);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<import("leaflet").Map | null>(null);
  const markerRef = React.useRef<import("leaflet").Marker | null>(null);

  // Resolve params and load product
  React.useEffect(() => {
    void (async () => {
      const { id } = await params;
      if (!resolvedId) {
        setResolvedId(id);
      }
    })();
  }, [params, resolvedId]);

  React.useEffect(() => {
    if (!resolvedId) return;
    void (async () => {
      try {
        const res = await fetch(`/api/products/${resolvedId}`);
        const json: ProductResponse = await res.json();
        if (!res.ok || !json.success || !json.data) throw new Error(json.error?.message ?? "Gagal memuat produk");
        setProduct(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan memuat produk");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [resolvedId]);

  // Geolocation
  function requestLocation() {
    if (!navigator.geolocation) { setLocationError("Geolocation tidak didukung browser ini"); return; }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setMapLat(lat);
        setMapLon(lon);
        setIsLocating(false);
        // Pan map if initialized
        mapInstanceRef.current?.setView([lat, lon], mapInstanceRef.current.getZoom());
        if (markerRef.current) markerRef.current.setLatLng([lat, lon]);
      },
      err => { setLocationError(err.message); setIsLocating(false); },
      { timeout: 10000 }
    );
  }

  // Leaflet init
  React.useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;
    let L: typeof import("leaflet");
    let mounted = true;
    import("leaflet").then(mod => { L = mod.default ?? mod; if (!mounted || !mapRef.current) return; initMap(L); });
    return () => { mounted = false; mapInstanceRef.current?.remove(); };
    async function initMap(leaflet: typeof L) {
      if (!mapRef.current) return;
      const map = leaflet.map(mapRef.current, { zoomControl: true }).setView([mapLat, mapLon], 16);
      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      mapInstanceRef.current = map;
      const icon = leaflet.icon({ iconUrl: "https://unpkg.com/leaflet/dist/images/marker-icon.png", iconRetinaUrl: "https://unpkg.com/leaflet/dist/images/marker-icon-2x.png", shadowUrl: "https://unpkg.com/leaflet/dist/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] });
      const marker = leaflet.marker([mapLat, mapLon], { icon, draggable: true });
      marker.on("dragend", () => { const p = marker.getLatLng(); setMapLat(p.lat); setMapLon(p.lng); });
      marker.addTo(map);
      markerRef.current = marker;
    }
  }, []);

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (error || !product) return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{error ?? "Produk tidak ditemukan"}</p>
      <Button onClick={() => router.back()}>
        <ArrowLeft className="mr-2 size-4" />Kembali
      </Button>
    </div>
  );

  const { images = [] } = product;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => router.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="flex-1 truncate text-base font-semibold">{product.name}</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Image gallery */}
        {images.length > 0 ? (
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            <img src={images[0].url} alt={product.name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-muted">
            <p className="text-muted-foreground">Tidak ada gambar</p>
          </div>
        )}

        {images.length > 1 && (
          <div className="flex gap-1 px-4 py-2">
            {images.map((img, i) => (
              <button key={i} className={cn("size-12 overflow-hidden rounded-md border-2", i === 0 ? "border-primary" : "border-transparent")}>
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="px-4 py-3 space-y-4">
          {/* Info */}
          <div>
            <h2 className="text-xl font-bold">{product.name}</h2>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-semibold text-primary">{fmtRupiah(product.sellingPrice)}</span>
              <Badge variant={product.totalStock > 0 ? "outline" : "destructive"}>
                Stok: {product.totalStock}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="prose prose-sm text-muted-foreground">
              <p>{product.description}</p>
            </div>
          )}

          {/* Metadata */}
          {Object.keys(product.metadata).length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Info Produk</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {Object.entries(product.metadata).map(([key, value]) => (
                  <React.Fragment key={key}>
                    <dt className="text-muted-foreground">{key}</dt>
                    <dd className="font-medium">{value}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
          )}

          {/* Leaflet Map */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Lokasi Pickup</h3>
              <Button size="sm" variant="outline" onClick={requestLocation} disabled={isLocating}>
                {isLocating ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <MapPin className="mr-1.5 size-3.5" />}
                {isLocating ? "Mendeteksi..." : "Gunakan Lokasi Saat Ini"}
              </Button>
            </div>
            {locationError && <p className="text-xs text-destructive">{locationError}</p>}
            <div ref={mapRef} className="h-48 w-full overflow-hidden rounded-xl">
              {!mapInstanceRef.current && <MapPlaceholder lat={mapLat} lon={mapLon} />}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Lat: {mapLat.toFixed(6)}, Lon: {mapLon.toFixed(6)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
