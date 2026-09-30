"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Package,
  RefreshCw,
  ShoppingBag,
  Trash2,
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
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type ProductItem = {
  productId: string;
  productName: string;
  sellingPrice: number;
  availableStock: number;
  baristaId: string;
  baristaName: string;
};

type CartItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  availableStock: number;
  baristaName: string;
};

type PreviewData = {
  subtotal: number;
  charges: Array<{
    settingKey: string;
    settingName: string;
    type: string;
    rateValue: number;
    amount: number;
  }>;
  chargesTotal: number;
  total: number;
};

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

// ============================================================
// Main Component
// ============================================================

export default function OrderSimulationPage() {
  const router = useRouter();

  // Data state
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [previewData, setPreviewData] = React.useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form state
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [cart, setCart] = React.useState<CartItem[]>([]);

  // UI state
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Fetch products from all baristas
  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch("/api/barista-stock");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal mengambil data produk");
      }

      // Flatten all products from all baristas into a single list
      const allProducts: ProductItem[] = [];

      for (const barista of json.data.items ?? []) {
        if (barista.baristaStatus !== "ACTIVE") continue;

        for (const product of barista.products ?? []) {
          if (!product.productIsActive) continue;
          if (product.quantity <= 0) continue;

          allProducts.push({
            productId: product.productId,
            productName: product.productName,
            sellingPrice: product.sellingPrice,
            availableStock: product.quantity,
            baristaId: barista.baristaId,
            baristaName: barista.baristaName,
          });
        }
      }

      setProducts(allProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Preview calculation
  const fetchPreview = React.useCallback(async () => {
    if (cart.length === 0) {
      setPreviewData(null);
      return;
    }

    try {
      setIsLoadingPreview(true);

      const res = await fetch("/api/orders/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          paymentMethodCode: "QRIS", // Default, DOKU SNAP handles the actual selection
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setPreviewData(null);
        return;
      }

      setPreviewData(json.data);
    } catch {
      setPreviewData(null);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [cart]);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      void fetchPreview();
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchPreview]);

  // Cart functions
  function addToCart(product: ProductItem) {
    const existing = cart.find((item) => item.productId === product.productId);
    if (existing) {
      if (existing.quantity >= product.availableStock) return;
      setCart(
        cart.map((item) =>
          item.productId === product.productId
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unitPrice }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: product.productId,
          productName: product.productName,
          quantity: 1,
          unitPrice: product.sellingPrice,
          subtotal: product.sellingPrice,
          availableStock: product.availableStock,
          baristaName: product.baristaName,
        },
      ]);
    }
  }

  function updateQuantity(productId: string, newQty: number) {
    if (newQty <= 0) {
      setCart(cart.filter((item) => item.productId !== productId));
      return;
    }

    const item = cart.find((i) => i.productId === productId);
    if (item && newQty > item.availableStock) return;

    setCart(
      cart.map((item) =>
        item.productId === productId
          ? { ...item, quantity: newQty, subtotal: newQty * item.unitPrice }
          : item
      )
    );
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter((item) => item.productId !== productId));
  }

  // Navigate to checkout page
  function goToCheckout() {
    if (!customerName.trim()) {
      setSubmitError("Nama customer wajib diisi");
      return;
    }
    if (cart.length === 0) {
      setSubmitError("Pilih minimal 1 produk");
      return;
    }

    // Encode cart data for checkout page
    const checkoutData = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      items: cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        availableStock: item.availableStock,
        baristaName: item.baristaName,
      })),
    };

    const encoded = btoa(encodeURIComponent(JSON.stringify(checkoutData)));
    router.push(`/orders/simulation/checkout?cart=${encoded}`);
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="size-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => void fetchData()}>
            <RefreshCw className="mr-2 size-4" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button type="button" variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Order</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih produk — pembayaran via DOKU SNAP
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Products */}
        <div className="space-y-6 lg:col-span-2">
          {/* Product Selection - All Baristas Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="size-5" />
                Pilih Produk
              </CardTitle>
              <CardDescription>
                {products.length} produk tersedia dari semua gerobak
              </CardDescription>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Package className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Tidak ada produk tersedia
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {products.map((product) => {
                    const inCart = cart.find((item) => item.productId === product.productId);
                    const isMaxed = inCart ? inCart.quantity >= product.availableStock : false;

                    return (
                      <button
                        key={`${product.baristaId}-${product.productId}`}
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={isMaxed}
                        className={cn(
                          "flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                          inCart ? "border-primary bg-primary/5" : "border-input hover:bg-muted/50",
                          isMaxed && "cursor-not-allowed opacity-50"
                        )}
                      >
                        {/* Barista badge */}
                        <Badge variant="outline" className="text-xs font-normal">
                          {product.baristaName}
                        </Badge>
                        {/* Product name */}
                        <div className="flex w-full flex-wrap items-start justify-between gap-1">
                          <span className="font-medium leading-tight">{product.productName}</span>
                          {inCart && <Badge variant="secondary" className="shrink-0">{inCart.quantity}x</Badge>}
                        </div>
                        {/* Price & stock */}
                        <div className="flex w-full items-center justify-between">
                          <span className="text-sm font-semibold text-primary">
                            {fmtRupiah(product.sellingPrice)}
                          </span>
                          <span className="text-xs text-muted-foreground">Stok: {product.availableStock}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="size-5" />
                Keranjang ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <ShoppingBag className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Belum ada produk dipilih</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.baristaName} · {fmtRupiah(item.unitPrice)} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-8"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-8"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.availableStock}
                        >
                          +
                        </Button>
                      </div>
                      <p className="w-24 text-right font-semibold">{fmtRupiah(item.subtotal)}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Info Pembeli</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">
                  Nama <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Masukkan nama"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">No. HP</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pembayaran</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
                <p className="text-sm font-medium">DOKU SNAP Checkout</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pilih metode bayar di halaman DOKU
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
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
                  {previewData.charges.map((c) => (
                    <div key={c.settingKey} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{c.settingName}</span>
                      <span>{fmtRupiah(c.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-primary">{fmtRupiah(previewData.total)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {cart.length === 0
                    ? "Pilih produk untuk melihat ringkasan"
                    : "Memuat..."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="space-y-2">
            {submitError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </div>
            )}
            <Button
              type="button"
              className="w-full"
              size="lg"
              onClick={() => goToCheckout()}
              disabled={
                !customerName.trim() || cart.length === 0
              }
            >
              <CheckCircle2 className="mr-2 size-4" />
              Lanjut ke Pembayaran
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
