"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  Bike,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  User,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebaseLogin } from "@/hooks/use-firebase-login";
import { useTrackingBroadcast } from "@/hooks/tracking/use-tracking-broadcast";
import {
  useLiveLocations,
  type EnrichedLocation,
} from "@/hooks/tracking/use-live-locations";
import { cn } from "@/lib/utils";

// ============================================================
// Dynamic imports — Leaflet butuh browser
// ============================================================

const TrackingMap = dynamic(
  () =>
    import("@/components/tracking/tracking-map").then(
      (m) => m.TrackingMap
    ),
  { ssr: false }
);

const TrackingMapStyles = dynamic(
  () =>
    import("@/components/tracking/tracking-map").then(
      (m) => m.TrackingMapStyles
    ),
  { ssr: false }
);

// ============================================================
// Types
// ============================================================

type RoleFilter = "all" | "BARISTA" | "CUSTOMER";

// ============================================================
// Helpers
// ============================================================

function timeAgo(ts: number | null): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Baru saja";
  if (min < 60) return `${min}m lalu`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}j lalu`;
  const day = Math.floor(hour / 24);
  return `${day}h lalu`;
}

// ============================================================
// Main
// ============================================================

export default function TrackingPage() {
  const { data: session, status } = useSession();

  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>("all");
  const [focusUid, setFocusUid] = React.useState<string | null>(null);
  const [panelOpen, setPanelOpen] = React.useState(false);

  const fb = useFirebaseLogin();
  const { locations, counts, isLoading } = useLiveLocations();

  const broadcast = useTrackingBroadcast({
    enabled: status === "authenticated" && fb.isFirebaseReady,
    uid: session?.user?.firebaseUid ?? null,
    role:
      (session?.user?.role as "ADMIN" | "BARISTA" | "CUSTOMER") ?? null,
    name: session?.user?.name ?? null,
    broadcastIntervalMs: 5000,
  });

  const filteredLocations = React.useMemo<EnrichedLocation[]>(() => {
    let list = locations;
    if (roleFilter !== "all") list = list.filter((l) => l.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((l) => l.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const order = { online: 0, idle: 1, offline: 2 };
      const so = order[a.computedStatus] - order[b.computedStatus];
      if (so !== 0) return so;
      if (a.role === "BARISTA" && b.role !== "BARISTA") return -1;
      if (a.role !== "BARISTA" && b.role === "BARISTA") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [locations, roleFilter, search]);

  const mapLocations = React.useMemo(
    () => filteredLocations.filter((l) => l.computedStatus !== "offline"),
    [filteredLocations]
  );

  const ownUid = session?.user?.firebaseUid ?? null;

  return (
    <>
      <TrackingMapStyles />

      {/* Wrapper — fit dalam content area (tidak escape padding) */}
      <div className="relative h-[calc(100vh-3rem)] w-full overflow-hidden rounded-lg border bg-muted/20 shadow-sm">
        {/* ============ MAP (FULL) ============ */}
        <div className="absolute inset-0">
          <TrackingMap
            locations={mapLocations}
            ownUid={ownUid}
            focusUid={focusUid}
            onMarkerClick={(uid) => setFocusUid(uid)}
            className="h-full w-full"
          />
        </div>

        {/* ============ FLOATING HEADER (top-center) ============ */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex justify-center p-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-block size-2 rounded-full",
                  !fb.isFirebaseReady
                    ? "bg-amber-500 animate-pulse"
                    : broadcast.isActive
                      ? "bg-green-500 animate-pulse"
                      : "bg-red-500"
                )}
              />
              <span className="text-sm font-medium">
                {!fb.isFirebaseReady
                  ? "Menyiapkan Firebase..."
                  : broadcast.isActive
                    ? "Broadcasting"
                    : "Offline"}
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-muted-foreground">
              {counts.online} online · {counts.idle} idle ·{" "}
              {counts.offline} offline
            </span>
            {broadcast.error && (
              <>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="size-3.5" />
                  {broadcast.error}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ============ FLOATING LEGEND (bottom-left) ============ */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-[1000]">
          <div className="pointer-events-auto rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Legenda
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-block size-3 rounded-full bg-blue-500" />
                <span>Barista</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block size-3 rounded-full bg-green-500" />
                <span>Customer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block size-3 rounded-full bg-green-500 ring-2 ring-green-500/30" />
                <span>Anda</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============ FLOATING "LOKASI SAYA" (bottom-right) ============ */}
        {ownUid && (
          <div
            className={cn(
              "pointer-events-none absolute bottom-4 z-[1000] transition-all duration-300",
              panelOpen ? "right-[25rem]" : "right-4"
            )}
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="pointer-events-auto shadow-lg"
              onClick={() => setFocusUid(ownUid)}
            >
              Lokasi Saya
            </Button>
          </div>
        )}

        {/* ============ SIDEBAR PANEL (kanan, floating) ============ */}
        <div
          className={cn(
            "absolute inset-y-0 right-0 z-[1050] flex w-96 flex-col border-l bg-background shadow-2xl transition-transform duration-300",
            panelOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          {/* Header */}
          <div className="border-b p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-lg font-semibold tracking-tight">
                  Tracking Live
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Posisi real-time semua user
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Badge
                  className={cn(
                    broadcast.isActive
                      ? "bg-green-500/15 text-green-700 dark:text-green-400"
                      : "bg-red-500/15 text-red-700 dark:text-red-400"
                  )}
                >
                  {broadcast.isActive ? (
                    <>
                      <Wifi className="mr-1 size-3" /> Live
                    </>
                  ) : (
                    <>
                      <WifiOff className="mr-1 size-3" /> Off
                    </>
                  )}
                </Badge>
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

            {/* Stats */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-md border bg-muted/30 p-2 text-center">
                <div className="text-lg font-bold">{counts.barista}</div>
                <div className="text-[10px] text-muted-foreground">
                  Barista
                </div>
              </div>
              <div className="rounded-md border bg-muted/30 p-2 text-center">
                <div className="text-lg font-bold">{counts.customer}</div>
                <div className="text-[10px] text-muted-foreground">
                  Customer
                </div>
              </div>
              <div className="rounded-md border bg-muted/30 p-2 text-center">
                <div className="text-lg font-bold text-green-600">
                  {counts.online}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Online
                </div>
              </div>
            </div>
          </div>

          {/* Search + Filter */}
          <div className="space-y-2 border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama..."
                className="h-9 pl-8 text-sm"
              />
            </div>
            <div className="flex gap-1">
              {(
                [
                  ["all", "Semua", Users],
                  ["BARISTA", "Barista", Bike],
                  ["CUSTOMER", "Customer", User],
                ] as Array<
                  [
                    RoleFilter,
                    string,
                    React.ComponentType<{ className?: string }>,
                  ]
                >
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRoleFilter(key)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                    roleFilter === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="size-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <Users className="size-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">Tidak ada user</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {search || roleFilter !== "all"
                    ? "Coba ubah filter."
                    : "Belum ada user online."}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredLocations.map((loc) => {
                  const isOwn = loc.uid === ownUid;
                  const isFocused = focusUid === loc.uid;

                  return (
                    <button
                      key={loc.uid}
                      type="button"
                      onClick={() => setFocusUid(loc.uid)}
                      className={cn(
                        "w-full px-4 py-3 text-left transition-colors hover:bg-muted/50",
                        isFocused && "bg-primary/5"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "mt-1.5 inline-block size-2 shrink-0 rounded-full",
                            loc.computedStatus === "online" &&
                              "bg-green-500 animate-pulse",
                            loc.computedStatus === "idle" &&
                              "bg-amber-500",
                            loc.computedStatus === "offline" &&
                              "bg-gray-400"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">
                              {loc.name}
                            </p>
                            {isOwn && (
                              <Badge
                                variant="outline"
                                className="shrink-0 text-[10px]"
                              >
                                Anda
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {loc.role === "BARISTA"
                                ? "🛵"
                                : loc.role === "CUSTOMER"
                                  ? "👤"
                                  : "🛡️"}{" "}
                              {loc.role}
                            </span>
                            <span>·</span>
                            <span>
                              {timeAgo(loc.lastSeen ?? loc.timestamp)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                            {loc.speedKmh !== null &&
                              loc.speedKmh > 0 && (
                                <span>
                                  🏃 {loc.speedKmh.toFixed(1)} km/j
                                </span>
                              )}
                            {loc.batteryLevel !== null && (
                              <span>
                                🔋 {loc.batteryLevel}%
                                {loc.batteryCharging ? "⚡" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setFocusUid(null);
                setSearch("");
                setRoleFilter("all");
              }}
            >
              <RefreshCw className="mr-2 size-3.5" />
              Reset View
            </Button>
          </div>
        </div>

        {/* ============ TOGGLE BUTTON (SELALU KELIHATAN) ============ */}
        {/*
          Posisi:
          - Panel terbuka → tombol di kiri panel (right-[25rem])
          - Panel tertutup → tombol di pojok kanan (right-3)
        */}
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          aria-label={panelOpen ? "Tutup panel" : "Buka panel"}
          title={panelOpen ? "Tutup panel" : "Buka panel"}
          className={cn(
            "absolute top-1/2 z-[1200] flex -translate-y-1/2 items-center gap-1.5 rounded-l-lg border border-r-0 bg-background py-3 pl-2 pr-2.5 shadow-lg transition-all duration-300 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
            panelOpen ? "right-[24rem]" : "right-3 rounded-lg border-r"
          )}
        >
          {panelOpen ? (
            <ChevronRight className="size-4" />
          ) : (
            <>
              <ChevronLeft className="size-4" />
              <span className="text-xs font-medium">Panel</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}