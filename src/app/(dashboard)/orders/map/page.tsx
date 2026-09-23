"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Bike,
  ChevronRight,
  Package,
  RefreshCw,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================
// Dynamic imports
// ============================================================

const OrdersLiveMap = dynamic(
  () =>
    import("@/components/orders/orders-live-map").then(
      (m) => m.OrdersLiveMap
    ),
  { ssr: false }
);

const OrdersLiveMapStyles = dynamic(
  () =>
    import("@/components/orders/orders-live-map").then(
      (m) => m.OrdersLiveMapStyles
    ),
  { ssr: false }
);

// ============================================================
// Types
// ============================================================

type ActiveOrder = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  deliveryAddress: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  baristaId: string | null;
  baristaName: string | null;
  total: number;
  distanceKm: number | null;
  createdAt: string;
};

type ListResponse = {
  success: boolean;
  data?: {
    items: ActiveOrder[];
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

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    SEARCHING: {
      label: "Cari Barista",
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    },
    ASSIGNED: {
      label: "Ditugaskan",
      className: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    },
    ACCEPTED: {
      label: "Diterima",
      className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
    },
    DELIVERING: {
      label: "Diantar",
      className: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
    },
    ARRIVED: {
      label: "Sampai",
      className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    },
  };
  const cfg = map[status] ?? { label: status, className: "" };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

// ============================================================
// Main
// ============================================================

export default function OrdersMapPage() {
  const [orders, setOrders] = React.useState<ActiveOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusOrderId, setFocusOrderId] = React.useState<string | null>(
    null
  );
  const [panelOpen, setPanelOpen] = React.useState(true);

  const fetchOrders = React.useCallback(
    async (options?: { showLoading?: boolean }) => {
      try {
        if (options?.showLoading) setIsLoading(true);
        setError(null);

        // Ambil order aktif (bukan COMPLETED/CANCELLED)
        const statuses = [
          "SEARCHING",
          "ASSIGNED",
          "ACCEPTED",
          "DELIVERING",
          "ARRIVED",
        ];

        const results = await Promise.all(
          statuses.map((s) =>
            fetch(`/api/orders?status=${s}&limit=100`, {
              headers: { Accept: "application/json" },
              cache: "no-store",
            }).then((r) => r.json())
          )
        );

        const all: ActiveOrder[] = [];
        for (const r of results) {
          if (r.success && r.data) {
            all.push(...r.data.items);
          }
        }

        // Sort by createdAt desc
        all.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        );

        setOrders(all);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat order."
        );
      } finally {
        if (options?.showLoading) setIsLoading(false);
      }
    },
    []
  );

  React.useEffect(() => {
    void fetchOrders({ showLoading: true });
    // Auto refresh setiap 30 detik
    const interval = setInterval(() => {
      void fetchOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  return (
    <>
      <OrdersLiveMapStyles />

      <div className="relative h-[calc(100vh-3rem)] w-full overflow-hidden rounded-lg border bg-muted/20 shadow-sm">
        {/* MAP */}
        <div className="absolute inset-0">
          <OrdersLiveMap
            orders={orders}
            focusOrderId={focusOrderId}
            onMarkerClick={(id) => setFocusOrderId(id)}
            className="h-full w-full"
          />
        </div>

        {/* FLOATING HEADER */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex justify-center p-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
            <Package className="size-4" />
            <span className="text-sm font-medium">
              {orders.length} order aktif
            </span>
            <div className="h-4 w-px bg-border" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void fetchOrders({ showLoading: false })}
              disabled={isLoading}
            >
              <RefreshCw
                className={cn(
                  "mr-1.5 size-3.5",
                  isLoading && "animate-spin"
                )}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* SIDEBAR PANEL */}
        <div
          className={cn(
            "absolute inset-y-0 right-0 z-[1050] flex w-96 flex-col border-l bg-background shadow-2xl transition-transform duration-300",
            panelOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="border-b p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold tracking-tight">
                  Order Live Map
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Posisi customer & barista sedang antar
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setPanelOpen(false)}
                aria-label="Tutup panel"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-destructive">
                {error}
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <Package className="size-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">
                  Tidak ada order aktif
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Order akan muncul saat customer memesan.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {orders.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setFocusOrderId(o.id)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      focusOrderId === o.id && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-xs font-medium">
                          {o.orderNumber}
                        </div>
                        <div className="mt-1 truncate text-sm font-medium">
                          {o.customerName}
                        </div>
                        {o.deliveryAddress && (
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {o.deliveryAddress}
                          </div>
                        )}
                        {o.baristaName && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Bike className="size-3" />
                            {o.baristaName}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        {statusBadge(o.status)}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-medium">
                        {fmtRupiah(o.total)}
                      </span>
                      <Link
                        href={`/orders/${o.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                      >
                        Detail
                        <ChevronRight className="size-3" />
                      </Link>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* TOGGLE BUTTON */}
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          aria-label={panelOpen ? "Tutup panel" : "Buka panel"}
          className={cn(
            "absolute top-1/2 z-[1200] flex -translate-y-1/2 items-center gap-1.5 rounded-l-lg border border-r-0 bg-background py-3 pl-2 pr-2.5 shadow-lg transition-all duration-300 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
            panelOpen ? "right-[24rem]" : "right-3 rounded-lg border-r"
          )}
        >
          {panelOpen ? (
            <ChevronRight className="size-4" />
          ) : (
            <>
              <ChevronRight className="size-4 rotate-180" />
              <span className="text-xs font-medium">Panel</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}