"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
  User,
  Phone,
  ArrowLeft,
  Navigation,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type CartItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  availableStock: number;
  baristaName: string;
};

type CartData = {
  customerName: string;
  customerPhone?: string;
  items: CartItem[];
};

type Charge = {
  settingKey: string;
  settingName: string;
  type: string;
  rateValue: number;
  amount: number;
};

type PreviewData = {
  items: CartItem[];
  subtotal: number;
  charges: Charge[];
  chargesTotal: number;
  paymentFeeAmount: number;
  deliveryFee: number;
  total: number;
};

type PreviewResponse = {
  success: boolean;
  data?: PreviewData;
  error?: { message?: string };
};

type CreateOrderResponse = {
  success: boolean;
  data?: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
  };
  error?: { message?: string };
};

type CreatePaymentResponse = {
  success: boolean;
  data?: {
    id: string;
    dokuPaymentUrl?: string;
    orderNumber?: string;
    expiryTime?: string;
  };
  error?: { message?: string };
};

// ============================================================
// DOKU JS SDK Integration
// ============================================================

declare global {
  interface Window {
    loadJokulCheckout?: (paymentUrl: string) => void;
    dokuCheckoutCallback?: (result: DokuCheckoutResult) => void;
  }
}

interface DokuCheckoutResult {
  result?: {
    status: "SUCCESS" | "FAILED" | "CANCELLED";
    message?: string;
    transactionId?: string;
  };
  error?: {
    message: string;
  };
}

function loadDOKUSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.loadJokulCheckout === "function") {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://jokul.doku.com/jokul-checkout-sdk/v1/jokul-checkout-1.0.0.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load DOKU SDK"));
    document.head.appendChild(script);
  });
}

async function openDOKUCheckout(
  paymentUrl: string
): Promise<DokuCheckoutResult> {
  try {
    await loadDOKUSDK();

    if (typeof window.loadJokulCheckout === "function") {
      return new Promise((resolve) => {
        window.dokuCheckoutCallback = (result: DokuCheckoutResult) => {
          console.log("[DOKU Checkout] Callback received:", result);
          resolve(result);
        };

        console.log("[DOKU Checkout] Opening SDK modal...");
        window.loadJokulCheckout!(paymentUrl);
      });
    }
  } catch (error) {
    console.warn(
      "[DOKU Checkout] SDK not available, using redirect fallback:",
      error
    );
  }

  // Fallback to redirect
  console.log("[DOKU Checkout] Using redirect fallback...");
  window.location.href = paymentUrl;

  return new Promise(() => {});
}

// ============================================================
// Helpers
// ============================================================

function fmtRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(2)} km`;
}

// Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
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

// ============================================================
// Leaflet Map Component (Dynamic)
// ============================================================

const LeafletMap = dynamic(() => import("./leaflet-location-picker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 w-full items-center justify-center rounded-lg bg-muted/30">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  ),
});

// ============================================================
// Main Component
// ============================================================

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Data state
  const [cartData, setCartData] = React.useState<CartData | null>(null);
  const [previewData, setPreviewData] = React.useState<PreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Location state
  const [deliveryAddress, setDeliveryAddress] = React.useState("");
  const [deliveryLatitude, setDeliveryLatitude] = React.useState(-6.2088);
  const [deliveryLongitude, setDeliveryLongitude] = React.useState(106.8456);
  const [distance, setDistance] = React.useState<number | null>(null);

  // Kitchen location (from settings or default Jakarta)
  const KITCHEN_LAT = -6.2088;
  const KITCHEN_LON = 106.8456;

  // Calculate distance when coordinates change
  React.useEffect(() => {
    const lat = parseFloat(String(deliveryLatitude));
    const lon = parseFloat(String(deliveryLongitude));

    if (isNaN(lat) || isNaN(lon)) {
      setDistance(null);
      return;
    }

    const dist = calculateDistance(KITCHEN_LAT, KITCHEN_LON, lat, lon);
    setDistance(dist);
  }, [deliveryLatitude, deliveryLongitude]);

  // Parse cart data from URL params
  React.useEffect(() => {
    const cartParam = searchParams.get("cart");
    if (!cartParam) {
      setError("Data keranjang tidak ditemukan");
      return;
    }

    try {
      const decoded = decodeURIComponent(atob(cartParam));
      const data = JSON.parse(decoded) as CartData;
      setCartData(data);
    } catch {
      setError("Data keranjang tidak valid");
    }
  }, [searchParams]);

  // Fetch preview (charges from settings)
  React.useEffect(() => {
    if (!cartData) return;

    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const res = await fetch("/api/orders/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cartData.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            paymentMethodCode: "QRIS",
          }),
        });

        const json = (await res.json()) as PreviewResponse;
        if (json.success && json.data) {
          setPreviewData(json.data);
        }
      } catch (err) {
        console.error("Preview fetch error:", err);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    void fetchPreview();
  }, [cartData]);

  // Handle location change from map
  function handleLocationChange(lat: number, lng: number) {
    setDeliveryLatitude(lat);
    setDeliveryLongitude(lng);
  }

  // Handle payment
  async function handlePayment() {
    if (!cartData) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "ONLINE",
          customerName: cartData.customerName,
          customerPhone: cartData.customerPhone || undefined,
          deliveryAddress: deliveryAddress || undefined,
          deliveryLatitude,
          deliveryLongitude,
          items: cartData.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          paymentMethodCode: "QRIS",
        }),
      });

      const orderJson = (await orderRes.json()) as CreateOrderResponse;

      if (!orderRes.ok || !orderJson.success || !orderJson.data) {
        throw new Error(orderJson.error?.message ?? "Gagal membuat order");
      }

      const order = orderJson.data;
      console.log("[CHECKOUT] Order created:", order);

      // 2. Create payment
      const paymentRes = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          methodCode: "QRIS",
          customerName: cartData.customerName,
          customerEmail: undefined,
          customerPhone: cartData.customerPhone || undefined,
          expiryMinutes: 60,
        }),
      });

      const paymentJson =
        (await paymentRes.json()) as CreatePaymentResponse;

      if (!paymentRes.ok || !paymentJson.success || !paymentJson.data) {
        throw new Error(
          paymentJson.error?.message ?? "Gagal membuat pembayaran"
        );
      }

      const payment = paymentJson.data;
      console.log("[CHECKOUT] Payment created:", payment);

      // 3. Open DOKU Checkout
      if (payment.dokuPaymentUrl) {
        console.log("[CHECKOUT] Opening DOKU Checkout...");

        const dokuResult = await openDOKUCheckout(payment.dokuPaymentUrl);

        if (dokuResult?.result) {
          const { status, message, transactionId } = dokuResult.result;

          console.log("[CHECKOUT] DOKU result:", {
            status,
            message,
            transactionId,
          });

          if (status === "SUCCESS") {
            router.push(
              `/orders/simulation/success?orderId=${order.id}&transactionId=${transactionId}`
            );
            return;
          } else if (status === "CANCELLED") {
            setError("Pembayaran dibatalkan. Silakan coba lagi.");
            return;
          } else {
            setError(message || "Pembayaran gagal. Silakan coba lagi.");
            return;
          }
        }

        setError("Mengalihkan ke halaman pembayaran DOKU...");
      } else {
        throw new Error("Tidak dapat membuat sesi pembayaran");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Get user location
  async function handleGetCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation tidak didukung browser ini");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeliveryLatitude(position.coords.latitude);
        setDeliveryLongitude(position.coords.longitude);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError("Tidak dapat mendapatkan lokasi. Silakan pilih di peta.");
      }
    );
  }

  // Error state
  if (error && !cartData) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
            <AlertTriangle className="size-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="mr-2 size-4" />
              Kembali
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!cartData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const subtotal = cartData.items.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Checkout</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bayar via DOKU SNAP
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="size-4" />
                Info Pembeli
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Nama</Label>
                  <Input
                    value={cartData.customerName}
                    disabled
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">No. HP</Label>
                  <Input
                    value={cartData.customerPhone || "-"}
                    disabled
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4" />
                Lokasi Pengiriman
              </CardTitle>
              <CardDescription>
                Geser marker di peta untuk memilih lokasi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Address input */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Alamat</Label>
                <Input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Jl. Contoh No. 123"
                  className="h-9"
                />
              </div>

              {/* Map */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Lokasi di Peta
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleGetCurrentLocation()}
                    className="h-7 text-xs"
                  >
                    <Navigation className="mr-1.5 size-3" />
                    Lokasi Saya
                  </Button>
                </div>

                <div className="relative overflow-hidden rounded-lg border">
                  <LeafletMap
                    lat={deliveryLatitude}
                    lng={deliveryLongitude}
                    onLocationChange={handleLocationChange}
                    kitchenLat={KITCHEN_LAT}
                    kitchenLon={KITCHEN_LON}
                  />
                </div>
              </div>

              {/* Coordinates display */}
              <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2">
                <span className="text-xs text-muted-foreground">Koordinat:</span>
                <span className="font-mono text-xs">
                  {deliveryLatitude.toFixed(6)}, {deliveryLongitude.toFixed(6)}
                </span>
              </div>

              {/* Distance */}
              {distance !== null && (
                <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Jarak ke dapur:</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {formatDistance(distance)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="size-4" />
                Item Order ({cartData.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cartData.items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.baristaName} · {fmtRupiah(item.unitPrice)} x{" "}
                        {item.quantity}
                      </p>
                    </div>
                    <span className="ml-4 font-semibold">
                      {fmtRupiah(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : previewData ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{fmtRupiah(previewData.subtotal)}</span>
                  </div>

                  {(previewData.charges ?? []).map((charge) => (
                    <div key={charge.settingKey} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {charge.settingName}
                      </span>
                      <span>{fmtRupiah(charge.amount)}</span>
                    </div>
                  ))}

                  {(previewData.paymentFeeAmount ?? 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Fee Pembayaran
                      </span>
                      <span>
                        +{fmtRupiah(previewData.paymentFeeAmount)}
                      </span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-lg text-primary">
                      {fmtRupiah(previewData.total)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-lg text-primary">
                    {fmtRupiah(subtotal)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Banner */}
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="mr-1.5 inline size-4" />
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={() => void handlePayment()}
            disabled={isSubmitting || isLoadingPreview}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 size-4" />
                Bayar Sekarang
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Pembayaran diproses via DOKU SNAP
          </p>
        </div>
      </div>
    </div>
  );
}
