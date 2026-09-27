"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ArrowLeft,
  Bike,
  CheckCircle2,
  DollarSign,
  Loader2,
  Package,
  QrCode,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type BaristaWithStock = {
  baristaId: string;
  baristaName: string;
  baristaPhone: string | null;
  productCount: number;
  products: Array<{
    productId: string;
    productName: string;
    sellingPrice: number;
    availableStock: number;
  }>;
};

type PaymentMethod = {
  code: string;
  name: string;
  provider: string;
};

type CartItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  availableStock: number;
};

type PreviewData = {
  items: CartItem[];
  subtotal: number;
  charges: Array<{
    settingKey: string;
    settingName: string;
    type: string;
    rateValue: number;
    amount: number;
  }>;
  chargesTotal: number;
  paymentMethod: PaymentMethod;
  paymentFeeAmount: number;
  deliveryFee: number;
  total: number;
  paymentProvider: string;
  paymentChannel: string;
};

type CreateResponse = {
  success: boolean;
  data?: {
    orderId: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: number;
  };
  error?: { message?: string };
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
  const [baristas, setBaristas] = React.useState<BaristaWithStock[]>([]);
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethod[]>([]);
  const [previewData, setPreviewData] = React.useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form state
  const [selectedBaristaId, setSelectedBaristaId] = React.useState<string>("");
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<string>("");
  const [cart, setCart] = React.useState<CartItem[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [successDialog, setSuccessDialog] = React.useState<{
    orderNumber: string;
    total: number;
  } | null>(null);

  // Computed
  const selectedBarista = baristas.find((b) => b.baristaId === selectedBaristaId);
  const availableProducts = selectedBarista?.products ?? [];

  // Fetch initial data
  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [baristasRes, paymentsRes] = await Promise.all([
        fetch("/api/orders/simulation/baristas"),
        fetch("/api/settings/payment-methods?isActive=true"),
      ]);

      const baristasJson = await baristasRes.json();
      const paymentsJson = await paymentsRes.json();

      if (!baristasRes.ok || !baristasJson.success) {
        throw new Error(baristasJson.error?.message ?? "Gagal mengambil data barista");
      }

      if (!paymentsRes.ok || !paymentsJson.success) {
        throw new Error(paymentsJson.error?.message ?? "Gagal mengambil metode pembayaran");
      }

      setBaristas(baristasJson.data.items);
      setPaymentMethods(paymentsJson.data.items);

      // Auto-select CASH if available
      const cashMethod = paymentsJson.data.items.find(
        (m: PaymentMethod) => m.provider === "CASH"
      );
      if (cashMethod) {
        setSelectedPaymentMethod(cashMethod.code);
      }
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
    if (cart.length === 0 || !selectedPaymentMethod || !selectedBaristaId) {
      setPreviewData(null);
      return;
    }

    try {
      setIsLoadingPreview(true);

      const res = await fetch("/api/orders/simulation/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baristaId: selectedBaristaId,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          paymentMethodCode: selectedPaymentMethod,
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
  }, [cart, selectedPaymentMethod, selectedBaristaId]);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      void fetchPreview();
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchPreview]);

  // Cart functions
  function addToCart(product: BaristaWithStock["products"][0]) {
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

  // Submit order
  async function handleSubmit() {
    if (!selectedBaristaId) {
      setSubmitError("Pilih barista terlebih dahulu");
      return;
    }
    if (!customerName.trim()) {
      setSubmitError("Nama customer wajib diisi");
      return;
    }
    if (cart.length === 0) {
      setSubmitError("Pilih minimal 1 produk");
      return;
    }
    if (!selectedPaymentMethod) {
      setSubmitError("Pilih metode pembayaran");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const res = await fetch("/api/orders/simulation/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baristaId: selectedBaristaId,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          paymentMethodCode: selectedPaymentMethod,
        }),
      });

      const json = (await res.json()) as CreateResponse;

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Gagal membuat order");
      }

      setSuccessDialog({
        orderNumber: json.data.orderNumber,
        total: json.data.total,
      });

      // Reset form
      setCustomerName("");
      setCustomerPhone("");
      setCart([]);
      setPreviewData(null);

      // Refresh barista stock
      void fetchData();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
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
          <h1 className="text-xl font-semibold tracking-tight">Simulasi Order</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Uji coba alur order dan pembayaran (CASH & DOKU)
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Barista Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bike className="size-5" />
                Pilih Barista
              </CardTitle>
              <CardDescription>Barista akan menyelesaikan order ini</CardDescription>
            </CardHeader>
            <CardContent>
              {baristas.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Bike className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Tidak ada barista dengan stok tersedia
                  </p>
                </div>
              ) : (
                <select
                  value={selectedBaristaId}
                  onChange={(e) => {
                    setSelectedBaristaId(e.target.value);
                    setCart([]);
                    setPreviewData(null);
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">-- Pilih Barista --</option>
                  {baristas.map((b) => (
                    <option key={b.baristaId} value={b.baristaId}>
                      {b.baristaName} ({b.productCount} produk)
                    </option>
                  ))}
                </select>
              )}
            </CardContent>
          </Card>

          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="size-5" />
                Pilih Produk
              </CardTitle>
              <CardDescription>
                {selectedBarista
                  ? `${availableProducts.length} produk dari ${selectedBarista.baristaName}`
                  : "Pilih barista untuk melihat produk"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedBaristaId ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Package className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Pilih barista terlebih dahulu</p>
                </div>
              ) : availableProducts.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Package className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Barista ini tidak punya stok</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {availableProducts.map((product) => {
                    const inCart = cart.find((item) => item.productId === product.productId);
                    const isMaxed = inCart ? inCart.quantity >= product.availableStock : false;

                    return (
                      <button
                        key={product.productId}
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={isMaxed}
                        className={cn(
                          "flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                          inCart ? "border-primary bg-primary/5" : "border-input hover:bg-muted/50",
                          isMaxed && "cursor-not-allowed opacity-50"
                        )}
                      >
                        <div className="flex w-full items-start justify-between">
                          <span className="font-medium">{product.productName}</span>
                          {inCart && <Badge variant="secondary">{inCart.quantity}x</Badge>}
                        </div>
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
                        <p className="text-sm text-muted-foreground">
                          {fmtRupiah(item.unitPrice)} x {item.quantity}
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
              <CardTitle className="text-base">Info Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">
                  Nama Customer <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Masukkan nama customer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">No. Telepon</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metode Pembayaran</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.code}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(method.code)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      selectedPaymentMethod === method.code
                        ? "border-primary bg-primary/5"
                        : "border-input hover:bg-muted/50"
                    )}
                  >
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                      {method.provider === "CASH" ? (
                        <DollarSign className="size-5" />
                      ) : (
                        <QrCode className="size-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{method.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {method.provider === "CASH" ? "Bayar di tempat (COD)" : "Bayar via DOKU"}
                      </p>
                    </div>
                    {selectedPaymentMethod === method.code && (
                      <CheckCircle2 className="size-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ringkasan Order</CardTitle>
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
                  {previewData.paymentFeeAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fee ({previewData.paymentMethod.name})</span>
                      <span>{fmtRupiah(previewData.paymentFeeAmount)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-primary">{fmtRupiah(previewData.total)}</span>
                    </div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2 text-center text-xs text-muted-foreground">
                    {previewData.paymentChannel === "COD"
                      ? "Pembayaran di tempat (Cash)"
                      : "Bayar via DOKU"}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {cart.length === 0
                    ? "Pilih produk untuk melihat ringkasan"
                    : "Pilih metode pembayaran"}
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
              onClick={() => void handleSubmit()}
              disabled={
                isSubmitting ||
                !selectedBaristaId ||
                !customerName.trim() ||
                cart.length === 0 ||
                !selectedPaymentMethod
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 size-4" />
                  Buat Order Simulation
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog
        open={successDialog !== null}
        onOpenChange={(open) => {
          if (!open) setSuccessDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-6 text-green-500" />
              Order Berhasil!
            </DialogTitle>
            <DialogDescription>
              Order simulation telah berhasil dibuat dan langsung lunas.
            </DialogDescription>
          </DialogHeader>

          {successDialog && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Number</span>
                <span className="font-mono font-semibold">{successDialog.orderNumber}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold text-primary">{fmtRupiah(successDialog.total)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSuccessDialog(null)}>
              Buat Order Lagi
            </Button>
            <Button
              type="button"
              onClick={() => {
                setSuccessDialog(null);
                router.push("/orders");
              }}
            >
              Lihat Daftar Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
