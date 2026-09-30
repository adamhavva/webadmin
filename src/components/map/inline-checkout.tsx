"use client";

import * as React from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Loader2,
  MapPin,
  QrCode,
  Timer,
  Wallet,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// ============================================================
// Types
// ============================================================

interface CartItemType {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
  };
  quantity: number;
  baristaId: string;
  baristaName: string;
}

interface BaristaLocation {
  baristaId: string;
  baristaName: string;
  lat: number;
  lng: number;
  distance?: number;
  eta?: number;
}

type CheckoutStep = 1 | 2 | 3;

interface PaymentMethod {
  code: string;
  name: string;
  icon: "qris" | "va" | "ewallet";
  subMethods?: Array<{
    code: string;
    name: string;
    icon?: string;
  }>;
}

// ============================================================
// Helpers
// ============================================================

function toLocaleString(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

function formatDistance(km: number): string {
  if (km < 1) {
    return Math.round(km * 1000) + " m";
  }
  return km.toFixed(1) + " km";
}

// ============================================================
// Map Component (Dynamic)
// ============================================================

const InlineMap = dynamic(() => import("./InlineMap"), {
  ssr: false,
  loading: () => (
    <div className="h-48 bg-gray-100 rounded-xl flex items-center justify-center">
      <Loader2 className="size-6 animate-spin text-gray-400" />
    </div>
  ),
});

// ============================================================
// InlineCheckout Component
// ============================================================

interface InlineCheckoutProps {
  cart: CartItemType[];
  cartTotal: number;
  nearestBarista: BaristaLocation | null;
  onSuccess: (orderId: string) => void;
  onBack: () => void;
}

export default function InlineCheckout({
  cart,
  cartTotal,
  nearestBarista,
  onSuccess,
  onBack,
}: InlineCheckoutProps) {
  // Step state
  const [step, setStep] = React.useState<CheckoutStep>(1);

  // Customer info
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");

  // Location state
  const [userLat, setUserLat] = React.useState(-6.2088);
  const [userLng, setUserLng] = React.useState(106.8456);
  const [address, setAddress] = React.useState("");

  // Payment state
  const [paymentMethod, setPaymentMethod] = React.useState<string>("QRIS");
  const [selectedSubMethod, setSelectedSubMethod] = React.useState<string>("");
  const [showVaList, setShowVaList] = React.useState(false);
  const [showWalletList, setShowWalletList] = React.useState(false);

  // Processing state
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [paymentStatus, setPaymentStatus] = React.useState<"idle" | "pending" | "processing" | "waiting" | "success" | "failed">("idle");
  const [paymentDetails, setPaymentDetails] = React.useState<{
    qrCode?: string;
    vaNumber?: string;
    deepLink?: string;
    expiresAt?: string;
  }>({});
  const [orderId, setOrderId] = React.useState<string>("");
  const [countdown, setCountdown] = React.useState<number>(0);
  const [error, setError] = React.useState<string | null>(null);

  // Refs
  const countdownRef = React.useRef<NodeJS.Timeout | null>(null);

  // Payment methods configuration
  const paymentMethods: PaymentMethod[] = [
    { code: "QRIS", name: "QRIS", icon: "qris" },
    { code: "VA", name: "Transfer Bank", icon: "va", subMethods: [
      { code: "VA_BCA", name: "BCA Virtual Account" },
      { code: "VA_MANDIRI", name: "Mandiri Virtual Account" },
      { code: "VA_BNI", name: "BNI Virtual Account" },
      { code: "VA_BRI", name: "BRI Virtual Account" },
    ]},
    { code: "EWALLET", name: "E-Wallet", icon: "ewallet", subMethods: [
      { code: "EWALLET_OVO", name: "OVO" },
      { code: "EWALLET_DANA", name: "DANA" },
      { code: "EWALLET_SHOPEEPAY", name: "ShopeePay" },
    ]},
  ];

  // Get user location
  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLat(position.coords.latitude);
          setUserLng(position.coords.longitude);
        },
        () => {
          // Use default location
        }
      );
    }
  }, []);

  // Countdown timer
  React.useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    } else if (countdown === 0 && paymentStatus === "waiting") {
      setPaymentStatus("failed");
      setError("Waktu pembayaran habis");
    }
    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [countdown, paymentStatus]);

  // Poll payment status
  React.useEffect(() => {
    if (paymentStatus !== "waiting" || !orderId) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment?orderId=${orderId}`);
        const json = await res.json();
        if (json.success && json.data?.status === "PAID") {
          setPaymentStatus("success");
          clearInterval(pollInterval);
        }
      } catch {
        // Continue polling
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [paymentStatus, orderId]);

  // ============================================================
  // Step Navigation
  // ============================================================

  function canProceedToStep2(): boolean {
    return customerName.trim().length > 0;
  }

  function canProceedToStep3(): boolean {
    return true;
  }

  function handleNextStep() {
    if (step === 1 && canProceedToStep2()) {
      setStep(2);
    } else if (step === 2 && canProceedToStep3()) {
      setStep(3);
    }
  }

  // ============================================================
  // Payment Processing
  // ============================================================

  async function handlePayment() {
    setIsProcessing(true);
    setError(null);

    try {
      // Determine actual payment method
      let actualPaymentMethod = paymentMethod;
      if (paymentMethod === "VA" && selectedSubMethod) {
        actualPaymentMethod = selectedSubMethod;
      } else if (paymentMethod === "EWALLET" && selectedSubMethod) {
        actualPaymentMethod = selectedSubMethod;
      }

      // Create order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          address: address || undefined,
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        }),
      });

      const orderJson = await orderRes.json();
      if (!orderJson.success) {
        throw new Error(orderJson.error?.message || "Gagal membuat pesanan");
      }

      const newOrderId = orderJson.data.id;
      setOrderId(newOrderId);

      // Create Midtrans checkout
      const checkoutRes = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: newOrderId,
          paymentMethod: actualPaymentMethod,
          amount: cartTotal,
          customerEmail: customerPhone ? `${customerPhone}@example.com` : undefined,
          customerName: customerName,
        }),
      });

      const checkoutJson = await checkoutRes.json();
      if (!checkoutJson.success) {
        throw new Error(checkoutJson.error?.message || "Gagal membuat checkout");
      }

      const checkoutData = checkoutJson.data;

      // Handle different payment types
      if (checkoutData.qrCode) {
        setPaymentDetails({
          qrCode: checkoutData.qrCode,
          expiresAt: checkoutData.expiresAt,
        });
        setPaymentStatus("waiting");
        // Set countdown (e.g., 30 minutes)
        setCountdown(30 * 60);
      } else if (checkoutData.redirectUrl) {
        // For e-wallets or VA, show deep link or redirect
        if (checkoutData.deepLinkUrl) {
          setPaymentDetails({
            deepLink: checkoutData.deepLinkUrl,
          });
          setPaymentStatus("waiting");
          setCountdown(30 * 60);
          // Open deep link
          window.open(checkoutData.deepLinkUrl, "_blank");
        } else {
          // Redirect to Midtrans payment page
          window.location.href = checkoutData.redirectUrl;
        }
      } else if (checkoutData.virtualAccountNumber) {
        setPaymentDetails({
          vaNumber: checkoutData.virtualAccountNumber,
          expiresAt: checkoutData.expiresAt,
        });
        setPaymentStatus("waiting");
        setCountdown(24 * 60 * 60); // 24 hours for VA
      } else {
        // For simpler cases, just redirect
        if (checkoutData.redirectUrl) {
          window.location.href = checkoutData.redirectUrl;
        } else {
          throw new Error("Metode pembayaran tidak didukung");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setPaymentStatus("failed");
    } finally {
      setIsProcessing(false);
    }
  }

  // ============================================================
  // Copy VA Number
  // ============================================================

  function copyVaNumber() {
    if (paymentDetails.vaNumber) {
      navigator.clipboard.writeText(paymentDetails.vaNumber);
    }
  }

  // ============================================================
  // Render Payment Icon
  // ============================================================

  function renderPaymentIcon(icon: "qris" | "va" | "ewallet") {
    switch (icon) {
      case "qris":
        return <QrCode size={24} />;
      case "va":
        return <Building2 size={24} />;
      case "ewallet":
        return <Wallet size={24} />;
    }
  }

  // ============================================================
  // Render Step Content
  // ============================================================

  function renderStep1() {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">
            1
          </div>
          <h3 className="text-lg font-semibold">Data Diri</h3>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="customerName">
              Nama Pelanggan <span className="text-red-500">*</span>
            </Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Masukkan nama lengkap"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="customerPhone">Nomor HP</Label>
            <Input
              id="customerPhone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="mt-1"
            />
          </div>
        </div>

        <Button
          onClick={handleNextStep}
          disabled={!canProceedToStep2()}
          className="w-full mt-4"
          size="lg"
        >
          Lanjut
        </Button>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setStep(1)}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">
            2
          </div>
          <h3 className="text-lg font-semibold">Lokasi Pengantaran</h3>
        </div>

        <div>
          <Label htmlFor="address">Alamat (opsional)</Label>
          <textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Masukkan alamat pengantaran"
            className="mt-1 w-full border rounded-xl px-4 py-3 min-h-[80px] resize-none"
          />
        </div>

        <div className="rounded-xl overflow-hidden border">
          <InlineMap
            userLocation={{ latitude: userLat, longitude: userLng }}
            baristaLocation={
              nearestBarista
                ? {
                    latitude: nearestBarista.lat,
                    longitude: nearestBarista.lng,
                    baristaName: nearestBarista.baristaName,
                  }
                : undefined
            }
            onLocationChange={(lat, lng) => {
              setUserLat(lat);
              setUserLng(lng);
            }}
            compact={false}
          />
        </div>

        {nearestBarista && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="size-4 text-orange-500" />
            <span>Barista: {nearestBarista.baristaName}</span>
            <span className="text-gray-400">|</span>
            <span className="text-orange-600">
              {nearestBarista.distance !== undefined
                ? formatDistance(nearestBarista.distance)
                : "-"}
            </span>
            <span className="text-gray-400">|</span>
            <Clock className="size-4 text-blue-500" />
            <span className="text-blue-600">
              ~{nearestBarista.eta || "-"} menit
            </span>
          </div>
        )}

        <Button onClick={handleNextStep} className="w-full mt-4" size="lg">
          Lanjut ke Pembayaran
        </Button>
      </div>
    );
  }

  function renderStep3() {
    if (paymentStatus === "waiting" || paymentStatus === "success" || paymentStatus === "failed") {
      return renderPaymentStatus();
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setStep(2)}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">
            3
          </div>
          <h3 className="text-lg font-semibold">Pembayaran</h3>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <h4 className="font-medium text-sm text-gray-500">Ringkasan Pesanan</h4>
          {cart.map((item) => (
            <div key={item.product.id} className="flex justify-between text-sm">
              <span>
                {item.product.name} x{item.quantity}
              </span>
              <span className="font-medium">
                Rp {toLocaleString(item.product.price * item.quantity)}
              </span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-lg">Rp {toLocaleString(cartTotal)}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-2">
          <Label>Pilih Metode Pembayaran</Label>

          {paymentMethods.map((method) => (
            <div key={method.code} className="space-y-2">
              <button
                onClick={() => {
                  setPaymentMethod(method.code);
                  if (method.code === "VA") {
                    setShowVaList(!showVaList);
                    setShowWalletList(false);
                  } else if (method.code === "EWALLET") {
                    setShowWalletList(!showWalletList);
                    setShowVaList(false);
                  } else {
                    setShowVaList(false);
                    setShowWalletList(false);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl border transition",
                  paymentMethod === method.code
                    ? "border-black bg-black/5"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    paymentMethod === method.code ? "bg-black text-white" : "bg-gray-100"
                  )}
                >
                  {renderPaymentIcon(method.icon)}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">{method.name}</p>
                  {method.code === "QRIS" && (
                    <p className="text-xs text-gray-500">Scan QR via Midtrans</p>
                  )}
                </div>
                {method.subMethods && (
                  (showVaList || showWalletList) && paymentMethod === method.code ? (
                    <ChevronUp className="size-5" />
                  ) : (
                    <ChevronDown className="size-5" />
                  )
                )}
              </button>

              {/* Sub-methods */}
              {method.subMethods && paymentMethod === method.code && (
                <div className="pl-4 space-y-2">
                  {(method.code === "VA" ? showVaList : showWalletList) &&
                    method.subMethods.map((sub) => (
                      <button
                        key={sub.code}
                        onClick={() => setSelectedSubMethod(sub.code)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg border transition",
                          selectedSubMethod === sub.code
                            ? "border-black bg-black/5"
                            : "border-gray-100 hover:border-gray-200"
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                          {sub.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{sub.name}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Pay Button */}
        <Button
          onClick={handlePayment}
          disabled={
            isProcessing ||
            (paymentMethod !== "QRIS" &&
              ((paymentMethod === "VA" && !selectedSubMethod) ||
                (paymentMethod === "EWALLET" && !selectedSubMethod)))
          }
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 size-5 animate-spin" />
              Memproses...
            </>
          ) : (
            <>Bayar Rp {toLocaleString(cartTotal)}</>
          )}
        </Button>
      </div>
    );
  }

  function renderPaymentStatus() {
    if (paymentStatus === "success") {
      return (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} className="text-green-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">Pembayaran Berhasil!</h3>
          <p className="text-gray-500 mb-4">Order ID: {orderId}</p>
          <Button onClick={() => onSuccess(orderId)} className="w-full">
            Selesai
          </Button>
        </div>
      );
    }

    if (paymentStatus === "failed") {
      return (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="size-12 text-red-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">Pembayaran Gagal</h3>
          <p className="text-gray-500 mb-4">{error || "Silakan coba lagi"}</p>
          <Button
            onClick={() => {
              setPaymentStatus("idle");
              setPaymentDetails({});
              setError(null);
            }}
            className="w-full"
          >
            Coba Lagi
          </Button>
        </div>
      );
    }

    // Waiting status
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Timer className="size-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold">Menunggu Pembayaran</h3>
          <p className="text-sm text-gray-500">Selesaikan pembayaran sebelum waktu habis</p>
        </div>

        {/* Countdown */}
        {countdown > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
            <p className="text-sm text-orange-600 mb-1">Waktu tersisa</p>
            <p className="text-2xl font-bold text-orange-700">
              {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
            </p>
          </div>
        )}

        {/* QR Code */}
        {paymentDetails.qrCode && (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">Scan QR code di bawah ini</p>
            <div className="bg-white p-4 rounded-xl border inline-block">
              <img
                src={paymentDetails.qrCode}
                alt="QR Code"
                className="w-64 h-64 mx-auto"
              />
            </div>
          </div>
        )}

        {/* VA Number */}
        {paymentDetails.vaNumber && (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">Nomor Virtual Account</p>
            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
              <span className="text-xl font-mono font-bold">{paymentDetails.vaNumber}</span>
              <button
                onClick={copyVaNumber}
                className="p-2 hover:bg-gray-200 rounded-lg transition"
              >
                <Copy className="size-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Salin nomor VA dan bayarkan di aplikasi bank Anda
            </p>
          </div>
        )}

        {/* Deep Link */}
        {paymentDetails.deepLink && (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">Buka aplikasi e-wallet</p>
            <Button
              onClick={() => window.open(paymentDetails.deepLink, "_blank")}
              className="w-full"
              size="lg"
            >
              Buka {paymentMethod === "EWALLET_OVO" ? "OVO" : paymentMethod === "EWALLET_DANA" ? "DANA" : "ShopeePay"}
            </Button>
          </div>
        )}

        <Button
          onClick={() => {
            setPaymentStatus("idle");
            setPaymentDetails({});
          }}
          variant="outline"
          className="w-full mt-4"
        >
          Batal
        </Button>
      </div>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as CheckoutStep)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <h1 className="text-lg font-semibold">Checkout</h1>
          </div>
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 pb-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-1 rounded-full transition",
                  step >= s ? "bg-black" : "bg-gray-200"
                )}
              />
            </div>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
}
