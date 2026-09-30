"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleUser,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  Minus,
  Navigation,
  Package,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Wallet,
  X,
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

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  recipe?: {
    name: string;
    components: Array<{
      inventoryItemName: string;
      quantity: number;
      unit: string;
    }>;
  };
}

interface CartItemType {
  product: Product;
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
// InlineCheckout Component (Dynamic Import)
// ============================================================

const InlineCheckout = dynamic(
  () => import("@/components/map/inline-checkout"),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-gray-400" />
      </div>
    ),
  }
);

// ============================================================
// Main Component
// ============================================================

export default function OrderSimulationPage() {
  const router = useRouter();

  // Data state
  const [products, setProducts] = React.useState<Product[]>([]);
  const [baristaLocations, setBaristaLocations] = React.useState<BaristaLocation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [expandedProduct, setExpandedProduct] = React.useState<string | null>(null);
  const [showCart, setShowCart] = React.useState(false);
  const [showCheckout, setShowCheckout] = React.useState(false);
  const [orderSuccess, setOrderSuccess] = React.useState<string | null>(null);

  // Cart state
  const [cart, setCart] = React.useState<CartItemType[]>([]);

  // Customer state
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");

  // Barista stock map
  const [baristaStocks, setBaristaStocks] = React.useState<Map<string, { stock: number; baristaId: string; baristaName: string }>>(new Map());

  // ============================================================
  // Fetch Data
  // ============================================================

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch barista stock with location
      const res = await fetch("/api/barista-stock");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal mengambil data");
      }

      const items = json.data.items ?? [];

      // Extract products and barista locations
      const allProducts: Product[] = [];
      const allBaristaLocations: BaristaLocation[] = [];
      const stockMap = new Map<string, { stock: number; baristaId: string; baristaName: string }>();

      // User location for distance calculation (default Jakarta)
      const userLat = -6.2088;
      const userLng = 106.8456;

      for (const barista of items) {
        if (barista.baristaStatus !== "ACTIVE") continue;

        // Add barista location
        if (barista.lat && barista.lng) {
          const distance = calculateDistance(
            userLat, userLng,
            barista.lat, barista.lng
          );
          allBaristaLocations.push({
            baristaId: barista.baristaId,
            baristaName: barista.baristaName,
            lat: barista.lat,
            lng: barista.lng,
            distance,
            eta: Math.round(distance * 3),
          });
        }

        // Add products
        for (const product of barista.products ?? []) {
          if (!product.productIsActive) continue;

          const productId = product.productId;
          const existing = stockMap.get(productId);

          if (existing) {
            if (product.quantity > existing.stock) {
              existing.stock = product.quantity;
              existing.baristaId = barista.baristaId;
              existing.baristaName = barista.baristaName;
            }
          } else {
            stockMap.set(productId, {
              stock: product.quantity,
              baristaId: barista.baristaId,
              baristaName: barista.baristaName,
            });
          }

          if (!allProducts.find((p) => p.id === productId)) {
            allProducts.push({
              id: productId,
              name: product.productName,
              price: product.sellingPrice,
              imageUrl: product.imageUrl,
              description: product.description,
            });
          }
        }
      }

      // Sort baristas by distance
      allBaristaLocations.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

      setProducts(allProducts);
      setBaristaLocations(allBaristaLocations);
      setBaristaStocks(stockMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ============================================================
  // Distance Calculation
  // ============================================================

  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // ============================================================
  // Cart Functions
  // ============================================================

  function getStockForProduct(productId: string): { stock: number; baristaId: string; baristaName: string } {
    return baristaStocks.get(productId) ?? { stock: 0, baristaId: "", baristaName: "" };
  }

  function getNearestBaristaLocation(baristaId: string): BaristaLocation | undefined {
    return baristaLocations.find((b) => b.baristaId === baristaId);
  }

  function addToCart(product: Product, quantity: number, baristaId: string, baristaName: string) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, baristaId, baristaName }];
    });
    setExpandedProduct(null);
  }

  function updateCartQuantity(productId: string, newQuantity: number) {
    if (newQuantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }

  const cartTotal = React.useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );

  const cartCount = React.useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  // ============================================================
  // Filter Products
  // ============================================================

  const filteredProducts = React.useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, searchQuery]);

  // ============================================================
  // Order Success Handler
  // ============================================================

  function handleOrderSuccess(orderId: string) {
    setOrderSuccess(orderId);
    setShowCheckout(false);
    setCart([]);
  }

  // ============================================================
  // Loading State
  // ============================================================

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Memuat menu...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // Error State
  // ============================================================

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="size-8 text-red-500" />
          <p className="text-sm text-gray-500">{error}</p>
          <Button onClick={() => void fetchData()}>
            <RefreshCw className="mr-2 size-4" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // Order Success View
  // ============================================================

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Order BERHASIL!</h2>
          <p className="text-gray-500 mb-1">Nomor Order:</p>
          <p className="text-xl font-mono font-bold mb-6">{orderSuccess}</p>
          <Button
            onClick={() => {
              setOrderSuccess(null);
              setCustomerName("");
              setCustomerPhone("");
            }}
            className="w-full"
          >
            Pesan Lagi
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // Main Render
  // ============================================================

  const nearestBarista = baristaLocations[0] ?? null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col w-full overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between h-12">
            {/* Left - Back & Logo */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="size-8"
              >
                <ArrowLeft className="size-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-black">ASCEND</h1>
                <p className="text-xs text-gray-500">Pesan kopi favorit</p>
              </div>
            </div>

            {/* Right - Cart */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCart(!showCart)}
                className="relative bg-black text-white p-3 rounded-full hover:bg-gray-800 transition shadow-md"
              >
                <ShoppingCart size={24} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mt-3">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari kopi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
            />
          </div>
        </div>
      </header>

      {/* Barista Distance Info */}
      {baristaLocations.length > 0 && (
        <div className="bg-orange-50 border-b border-orange-100">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Navigation size={16} className="text-orange-500" />
              <span className="text-gray-700">
                Barista terdekat: <strong>{baristaLocations[0]?.baristaName}</strong>
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-orange-600 font-medium">
                {baristaLocations[0]?.distance !== undefined ? formatDistance(baristaLocations[0].distance) : "-"}
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-blue-600">
                ~{baristaLocations[0]?.eta || "-"} menit
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {/* Product Grid */}
        <div className="mb-32">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <Package size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg">Menu tidak ditemukan</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const { stock, baristaId, baristaName } = getStockForProduct(product.id);
                const nearestBaristaLoc = getNearestBaristaLocation(baristaId);
                const isExpanded = expandedProduct === product.id;

                return (
                  <div key={product.id} className="space-y-2">
                    <button
                      onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                      className={cn(
                        "bg-white border rounded-2xl overflow-hidden text-left hover:shadow-lg transition w-full",
                        isExpanded ? "border-2 border-black shadow-lg" : "border-gray-100"
                      )}
                    >
                      <div className="relative h-36 bg-gray-100">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-300">
                            <Package size={40} />
                          </div>
                        )}
                        {stock === 0 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-semibold">Habis</span>
                          </div>
                        )}
                        {stock > 0 && stock <= 5 && (
                          <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                            Tinggal {stock}
                          </div>
                        )}
                        {baristaName && (
                          <div className="absolute bottom-2 left-2 bg-white/90 text-gray-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CircleUser size={10} />
                            {baristaName}
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
                        <p className="text-black font-bold text-lg mt-1">Rp {toLocaleString(product.price)}</p>
                        {nearestBaristaLoc?.distance && (
                          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <MapPin size={12} /> ~{formatDistance(nearestBaristaLoc.distance)}
                          </p>
                        )}
                      </div>
                    </button>

                    {/* Expanded Product Detail */}
                    {isExpanded && (
                      <div className="bg-white border-2 border-black rounded-2xl p-4 space-y-4">
                        <div className="flex gap-4">
                          {product.imageUrl && (
                            <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{product.name}</h4>
                            {product.description && (
                              <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                            )}
                          </div>
                        </div>

                        {product.recipe && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-500 mb-2">Resep: {product.recipe.name}</p>
                            <div className="space-y-1">
                              {product.recipe.components.map((comp, i) => (
                                <div key={i} className="flex justify-between text-xs">
                                  <span>{comp.inventoryItemName}</span>
                                  <span className="text-gray-500">{comp.quantity} {comp.unit}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Stok:</span>
                          <span className={cn("font-medium", stock <= 5 ? "text-yellow-600" : "text-green-600")}>
                            {stock} units
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product, 1, baristaId, baristaName);
                            }}
                            disabled={stock === 0}
                            className="flex-1 bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <Plus size={18} />
                            Tambah
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product, 1, baristaId, baristaName);
                              setShowCart(true);
                            }}
                            disabled={stock === 0}
                            className="bg-gray-100 text-black py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                          >
                            <ShoppingCart size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating Cart Button */}
      {cartCount > 0 && !showCart && !showCheckout && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 bg-black text-white py-4 px-6 rounded-2xl font-semibold shadow-lg hover:bg-gray-800 transition flex items-center gap-3 z-30"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} />
            <span>{cartCount} item</span>
          </div>
          <span className="border-l border-gray-600 pl-3">Rp {toLocaleString(cartTotal)}</span>
        </button>
      )}

      {/* Sticky Cart Panel */}
      <div className={cn(
        "fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-40 transition-transform duration-300 flex flex-col",
        showCart ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} />
            <span className="font-semibold">Keranjang ({cartCount})</span>
          </div>
          <button onClick={() => setShowCart(false)} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag size={48} className="text-gray-300 mb-4" />
              <p className="text-gray-500">Keranjang kosong</p>
              <p className="text-sm text-gray-400 mt-1">Pilih produk untuk menambahkan</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <Package size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-1">{item.product.name}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{item.baristaName}</p>
                  <p className="font-semibold text-sm mt-1">Rp {toLocaleString(item.product.price)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="ml-auto p-2 text-red-500 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600">Total</span>
              <span className="text-xl font-bold">Rp {toLocaleString(cartTotal)}</span>
            </div>
            <div className="space-y-2">
              {/* Customer Info */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Nama Pelanggan"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black focus:border-black text-sm"
                />
                <input
                  type="tel"
                  placeholder="Nomor HP (opsional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black focus:border-black text-sm"
                />
              </div>
              <button
                onClick={() => {
                  if (!customerName.trim()) {
                    alert("Masukkan nama pelanggan");
                    return;
                  }
                  setShowCart(false);
                  setShowCheckout(true);
                }}
                className="w-full bg-black text-white py-4 rounded-xl font-semibold hover:bg-gray-800 transition flex items-center justify-center gap-2"
              >
                Checkout
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inline Checkout */}
      {showCheckout && (
        <InlineCheckout
          cart={cart}
          cartTotal={cartTotal}
          nearestBarista={nearestBarista}
          onSuccess={handleOrderSuccess}
          onBack={() => setShowCheckout(false)}
        />
      )}
    </div>
  );
}
