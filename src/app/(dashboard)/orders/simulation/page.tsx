"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Coffee,
  Minus,
  Plus,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  subscribeToLocations,
  type LiveLocation,
} from "@/lib/firebases/firebase-rtdb";

// ============================================================
// Types
// ============================================================

interface SimProduct {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  description: string | null;
  totalStock: number;
  baristaIds: string[];
}

interface NearbyBarista {
  uid: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  distanceKm: number;
}

// ============================================================
// Lazy-loaded Map
// ============================================================

const InlineMap = dynamic(
  () => import("@/components/map/InlineMap").then((m) => m.InlineMap),
  { ssr: false }
);

// ============================================================
// Helpers
// ============================================================

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// Payment Result View
// ============================================================

function PaymentResult() {
  const params = useSearchParams();
  const status = params.get("transaction_status");
  const orderId = params.get("order_id");
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  if (!status) return null;

  const isSuccess = status === "settlement" || status === "capture";
  const isPending = status === "pending";

  async function handleComplete() {
    if (!orderId) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/complete`, { method: "POST" });
      const json = await res.json();
      if (json.success) setCompleted(true);
      else alert(json.error?.message || "Gagal menyelesaikan order");
    } catch {
      alert("Gagal menyelesaikan order");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
      <div
        className={`w-24 h-24 rounded-full flex items-center justify-center ${
          isSuccess
            ? "bg-green-100"
            : isPending
              ? "bg-yellow-100"
              : "bg-red-100"
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        ) : isPending ? (
          <Clock className="w-12 h-12 text-yellow-600" />
        ) : (
          <XCircle className="w-12 h-12 text-red-600" />
        )}
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          {completed
            ? "Order Selesai!"
            : isSuccess
              ? "Pembayaran Berhasil!"
              : isPending
                ? "Menunggu Pembayaran"
                : "Pembayaran Gagal"}
        </h2>
        <p className="text-muted-foreground">
          {completed
            ? "Order telah diselesaikan."
            : isSuccess
              ? "Order sedang diproses. Barista sedang menuju lokasi kamu."
              : isPending
                ? "Selesaikan pembayaran sesuai instruksi yang diberikan."
                : "Pembayaran tidak berhasil. Silakan coba lagi."}
        </p>
        {orderId && (
          <p className="text-sm text-muted-foreground mt-2">
            Order ID: <span className="font-mono">{orderId}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {isSuccess && !completed && orderId && (
          <>
            <Button variant="outline" onClick={() => { window.location.href = "/tracking"; }}>
              <MapPin className="w-4 h-4 mr-2" /> Lihat Tracking
            </Button>
            <Button
              variant="destructive"
              onClick={handleComplete}
              disabled={completing}
            >
              {completing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Selesaikan Pesanan (Simulasi)
            </Button>
          </>
        )}
        <Button
          onClick={() => { window.location.href = "/orders/simulation"; }}
          variant={isSuccess ? "default" : "outline"}
        >
          {isSuccess ? "Order Lagi" : "Kembali ke Menu"}
        </Button>
      </div>

      {isSuccess && (
        <p className="text-xs text-muted-foreground text-center max-w-sm">
          Tombol &ldquo;Selesaikan Pesanan&rdquo; hanya ada di simulasi. Di aplikasi nyata, barista yang konfirmasi pesanan selesai.
        </p>
      )}
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function SimulationPage() {
  const params = useSearchParams();
  const transactionStatus = params.get("transaction_status");

  // Show result view if returning from Midtrans
  if (transactionStatus) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <PaymentResult />
      </div>
    );
  }

  return <SimulationContent />;
}

function SimulationContent() {
  const { data: session } = useSession();

  // Products
  const [products, setProducts] = useState<SimProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Cart: productId → quantity
  const [cart, setCart] = useState<Map<string, number>>(new Map());

  // Firebase barista locations
  const [baristaLocations, setBaristaLocations] = useState<
    Record<string, LiveLocation>
  >({});

  // User geolocation
  const [userLat, setUserLat] = useState(-6.2088);
  const [userLng, setUserLng] = useState(106.8456);

  // Checkout sheet: step "barista" → "info" → submitting
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"barista" | "info">("barista");
  const [selectedBaristaId, setSelectedBaristaId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState(session?.user?.name ?? "");
  const [customerPhone, setCustomerPhone] = useState((session?.user as { phone?: string })?.phone ?? "");
  const [customerEmail, setCustomerEmail] = useState(session?.user?.email ?? "");
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // ── Fetch products ──────────────────────────────────────────

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/baristas/available");
      const json = await res.json();
      if (json.success && Array.isArray(json.data.items)) {
        // Deduplicate products across baristas client-side
        const map = new Map<string, SimProduct>();
        for (const barista of json.data.items) {
          for (const p of barista.products ?? []) {
            const existing = map.get(p.productId);
            if (existing) {
              existing.totalStock += p.availableStock;
              if (!existing.baristaIds.includes(barista.baristaId)) {
                existing.baristaIds.push(barista.baristaId);
              }
            } else {
              map.set(p.productId, {
                productId: p.productId,
                name: p.productName,
                price: p.sellingPrice,
                imageUrl: null,
                description: null,
                totalStock: p.availableStock,
                baristaIds: [barista.baristaId],
              });
            }
          }
        }
        setProducts(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch {
      // silent
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── Firebase RTDB subscription ──────────────────────────────

  useEffect(() => {
    const unsub = subscribeToLocations((locations) => {
      setBaristaLocations(locations);
    });
    return () => unsub();
  }, []);

  // ── Geolocation ─────────────────────────────────────────────

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
      },
      () => {
        // keep defaults
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // ── Cart helpers ────────────────────────────────────────────

  const setQty = (productId: string, qty: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(productId);
      else next.set(productId, qty);
      return next;
    });
  };

  const cartItems = Array.from(cart.entries())
    .map(([pid, qty]) => ({
      product: products.find((p) => p.productId === pid)!,
      qty,
    }))
    .filter((i) => i.product);

  const cartTotal = cartItems.reduce(
    (sum, i) => sum + i.product.price * i.qty,
    0
  );

  // ── Active baristas sorted by distance ─────────────────────

  const nearbyBaristas: NearbyBarista[] = Object.values(baristaLocations)
    .filter(
      (loc) => loc.role === "BARISTA" && loc.isActive && loc.status !== "offline"
    )
    .map((loc) => ({
      uid: loc.uid,
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      status: loc.status,
      distanceKm: haversineKm(userLat, userLng, loc.latitude, loc.longitude),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  // For map: show selected or nearest barista
  const displayBarista =
    nearbyBaristas.find((b) => b.uid === selectedBaristaId) ??
    nearbyBaristas[0];

  // ── Order submit ────────────────────────────────────────────

  const handleOrder = async () => {
    if (!customerName.trim()) {
      setOrderError("Nama customer wajib diisi");
      return;
    }
    if (cartItems.length === 0) {
      setOrderError("Pilih minimal 1 produk");
      return;
    }

    setIsOrdering(true);
    setOrderError(null);

    try {
      // 1. Create order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "ONLINE",
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          deliveryLatitude: userLat,
          deliveryLongitude: userLng,
          paymentMethodCode: "MIDTRANS",
          baristaId: selectedBaristaId || undefined,
          items: cartItems.map((i) => ({
            productId: i.product.productId,
            quantity: i.qty,
          })),
        }),
      });

      const orderJson = await orderRes.json();
      if (!orderJson.success) {
        setOrderError(orderJson.error?.message || "Gagal membuat order");
        return;
      }

      const orderId = orderJson.data?.orderId || orderJson.data?.id;
      if (!orderId) {
        setOrderError("Order ID tidak ditemukan");
        return;
      }

      // 2. Create payment (Midtrans Snap)
      const paymentRes = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          customerEmail: customerEmail.trim() || undefined,
        }),
      });

      const paymentJson = await paymentRes.json();
      if (!paymentJson.success) {
        setOrderError(paymentJson.error?.message || "Gagal membuat pembayaran");
        return;
      }

      const redirectUrl = paymentJson.data?.redirectUrl;
      if (!redirectUrl) {
        setOrderError("URL pembayaran tidak ditemukan");
        return;
      }

      // 3. Redirect to Midtrans Snap
      window.location.href = redirectUrl;
    } catch (err) {
      setOrderError("Terjadi kesalahan. Silakan coba lagi.");
      console.error(err);
    } finally {
      setIsOrdering(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Simulasi Order ASCEND Coffee</h1>
          <p className="text-muted-foreground text-sm">
            Demo alur pemesanan seperti GoFood / ShopeeFood
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchProducts}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Menu
        </Button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Map */}
        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600" />
                Peta Live
                {nearbyBaristas.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    <Users className="w-3 h-3 mr-1" />
                    {nearbyBaristas.length} barista online
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InlineMap
                userLocation={{ latitude: userLat, longitude: userLng }}
                baristaLocation={
                  displayBarista
                    ? {
                        latitude: displayBarista.latitude,
                        longitude: displayBarista.longitude,
                        baristaName: displayBarista.name,
                      }
                    : undefined
                }
                onLocationChange={(lat, lng) => {
                  setUserLat(lat);
                  setUserLng(lng);
                }}
              />
            </CardContent>
          </Card>

          {/* Nearby baristas list — clickable to select */}
          {nearbyBaristas.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  Barista Terdekat
                  {selectedBaristaId && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      Dipilih
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {nearbyBaristas.map((b, idx) => {
                    const isSelected = selectedBaristaId === b.uid;
                    const isNearest = idx === 0;
                    return (
                      <button
                        key={b.uid}
                        onClick={() =>
                          setSelectedBaristaId(isSelected ? null : b.uid)
                        }
                        className={`w-full flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors text-left ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            b.status === "online"
                              ? isSelected ? "bg-green-300" : "bg-green-500"
                              : isSelected ? "bg-yellow-300" : "bg-yellow-500"
                          }`}
                        />
                        <span className="font-medium flex-1">{b.name}</span>
                        {isNearest && !isSelected && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            Terdekat
                          </Badge>
                        )}
                        <span className={`text-xs ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {b.distanceKm < 1
                            ? `${Math.round(b.distanceKm * 1000)} m`
                            : `${b.distanceKm.toFixed(1)} km`}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!selectedBaristaId && nearbyBaristas.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Sistem akan otomatis memilih barista terdekat saat order
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT: Menu + Cart */}
        <div className="flex flex-col gap-4">
          {/* Product Grid */}
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Coffee className="w-4 h-4" />
                Menu Kopi
                {loadingProducts && (
                  <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Memuat menu...
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                  <Coffee className="w-8 h-8 opacity-30" />
                  <p className="text-sm">Belum ada produk tersedia</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-3">
                    {products.map((product) => {
                      const qty = cart.get(product.productId) ?? 0;
                      return (
                        <ProductCard
                          key={product.productId}
                          product={product}
                          qty={qty}
                          onQtyChange={(q) => setQty(product.productId, q)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cart Summary */}
          {cartItems.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Pesanan Kamu
                  <Badge className="ml-auto">{cartItems.length} item</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {cartItems.map(({ product, qty }) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {product.name}{" "}
                      <span className="text-muted-foreground">×{qty}</span>
                    </span>
                    <span className="font-medium">
                      {formatRupiah(product.price * qty)}
                    </span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatRupiah(cartTotal)}</span>
                </div>
                <Button
                  className="w-full mt-2"
                  onClick={() => {
                    setCheckoutStep("barista");
                    setOrderError(null);
                    setCheckoutOpen(true);
                  }}
                >
                  Pesan Sekarang →
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Checkout Sheet */}
      <Sheet open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {checkoutStep === "barista" ? "Pilih Barista" : "Data Pengiriman"}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Order summary (always visible) */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              {cartItems.map(({ product, qty }) => (
                <div
                  key={product.productId}
                  className="flex justify-between text-sm"
                >
                  <span>{product.name} ×{qty}</span>
                  <span>{formatRupiah(product.price * qty)}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatRupiah(cartTotal)}</span>
              </div>
            </div>

            {/* Step 1: Barista selection */}
            {checkoutStep === "barista" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Pilih gerobak kopi terdekat dari lokasi kamu, atau biarkan sistem memilih otomatis.
                </p>
                {nearbyBaristas.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6 text-sm">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Tidak ada barista aktif saat ini. Sistem akan mencari otomatis.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {nearbyBaristas.map((b, idx) => {
                      const isSelected = selectedBaristaId === b.uid;
                      return (
                        <button
                          key={b.uid}
                          onClick={() =>
                            setSelectedBaristaId(isSelected ? null : b.uid)
                          }
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-primary/40 bg-card"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isSelected ? "bg-primary/10" : "bg-muted"}`}>
                            ☕
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{b.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {b.distanceKm < 1
                                ? `${Math.round(b.distanceKm * 1000)} meter dari kamu`
                                : `${b.distanceKm.toFixed(1)} km dari kamu`}
                              {idx === 0 && " · Terdekat"}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <Button
                  className="w-full h-12"
                  onClick={() => setCheckoutStep("info")}
                >
                  {selectedBaristaId
                    ? `Lanjut dengan ${nearbyBaristas.find(b => b.uid === selectedBaristaId)?.name ?? "barista dipilih"} →`
                    : "Lanjut (Pilih Otomatis) →"}
                </Button>
              </div>
            )}

            {/* Step 2: Customer info + pay */}
            {checkoutStep === "info" && (
              <>
                {/* Selected barista info */}
                {selectedBaristaId && (
                  <div className="flex items-center gap-2 text-sm bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <span className="text-lg">☕</span>
                    <div className="flex-1">
                      <span className="font-medium">
                        {nearbyBaristas.find(b => b.uid === selectedBaristaId)?.name}
                      </span>
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({nearbyBaristas.find(b => b.uid === selectedBaristaId)?.distanceKm.toFixed(1)} km)
                      </span>
                    </div>
                    <button
                      onClick={() => setCheckoutStep("barista")}
                      className="text-xs text-primary underline"
                    >
                      Ganti
                    </button>
                  </div>
                )}

                {/* Customer info */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="cname">
                      Nama Customer <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cname"
                      placeholder="Masukkan nama..."
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cphone">No. HP</Label>
                    <Input
                      id="cphone"
                      placeholder="08xxxxxxxxxx"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cemail">Email (opsional)</Label>
                    <Input
                      id="cemail"
                      type="email"
                      placeholder="email@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Delivery location */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>
                    Antar ke: {userLat.toFixed(5)}, {userLng.toFixed(5)}
                  </span>
                </div>

                {/* Error */}
                {orderError && (
                  <div className="text-red-600 text-sm bg-red-50 rounded-lg p-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    {orderError}
                  </div>
                )}

                {/* Pay button */}
                <Button
                  className="w-full h-12 text-base"
                  onClick={handleOrder}
                  disabled={isOrdering || !customerName.trim()}
                >
                  {isOrdering ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>Bayar via Midtrans — {formatRupiah(cartTotal)}</>
                  )}
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============================================================
// Product Card Component
// ============================================================

function ProductCard({
  product,
  qty,
  onQtyChange,
}: {
  product: SimProduct;
  qty: number;
  onQtyChange: (qty: number) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 flex flex-col gap-2 hover:shadow-sm transition-shadow">
      {/* Image / emoji */}
      <div className="w-full h-24 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl">☕</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1">
        <p className="font-medium text-sm leading-tight line-clamp-2">
          {product.name}
        </p>
        <p className="text-primary font-bold text-sm mt-1">
          {formatRupiah(product.price)}
        </p>
        <p className="text-xs text-muted-foreground">
          Stok: {product.totalStock}
        </p>
      </div>

      {/* Qty Controls */}
      {qty === 0 ? (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs"
          onClick={() => onQtyChange(1)}
          disabled={product.totalStock === 0}
        >
          <Plus className="w-3 h-3 mr-1" />
          Tambah
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => onQtyChange(qty - 1)}
          >
            <Minus className="w-3 h-3" />
          </Button>
          <span className="flex-1 text-center text-sm font-bold">{qty}</span>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => onQtyChange(qty + 1)}
            disabled={qty >= product.totalStock}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
