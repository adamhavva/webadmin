"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MoreHorizontal,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type TabValue = "ACTIVE" | "VOIDED";

type Restock = {
  id: string;
  inventoryItemId: string;
  batchId: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
  supplierName: string | null;
  status: "ACTIVE" | "VOIDED";
  voidedAt: string | null;
  voidNote: string | null;
  createdAt: string;
  canVoid: boolean;
  inventoryItem: { id: string; name: string; unit: string };
  batch: {
    id: string;
    batchCode: string;
    remainingQuantity: string;
    quantity: string;
  };
};

type ListResponse = {
  success: boolean;
  data?: {
    items: Restock[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: {
      totalValue: number;
      totalQuantity: number;
      count: number;
    };
  };
  error?: { message?: string };
};

type MutationResponse = {
  success: boolean;
  error?: { message?: string };
};

// ============================================================
// Helpers
// ============================================================

function formatNumber(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("id-ID").format(num);
}

function formatRupiah(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

// ============================================================
// Skeleton / Error / Empty
// ============================================================

function RestockSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-4">
          <div className="size-10 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function RestockErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">Gagal memuat data</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-4"
        onClick={onRetry}
      >
        <RefreshCw className="mr-2 size-4" />
        Coba Lagi
      </Button>
    </div>
  );
}

function RestockEmptyState({
  hasSearch,
  isVoidTab,
}: {
  hasSearch: boolean;
  isVoidTab: boolean;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <PackageCheck className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">
        {hasSearch
          ? "Tidak ditemukan"
          : isVoidTab
            ? "Belum ada restock di-void"
            : "Belum ada pengadaan"}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {hasSearch
          ? "Tidak ada transaksi yang cocok dengan filter."
          : isVoidTab
            ? "Tidak ada restock yang dibatalkan."
            : "Catat penerimaan barang untuk memulai."}
      </p>
      {!hasSearch && !isVoidTab && (
        <Link
          href="/inventory/restocks/new"
          className={cn(buttonVariants(), "mt-4")}
        >
          <Plus className="mr-2 size-4" />
          Penerimaan Barang
        </Link>
      )}
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export function RestockListPage() {
  const router = useRouter();

  const [tab, setTab] = React.useState<TabValue>("ACTIVE");
  const [restocks, setRestocks] = React.useState<Restock[]>([]);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<
    { total: number; totalPages: number } | undefined
  >();
  const [summary, setSummary] = React.useState({
    totalValue: 0,
    totalQuantity: 0,
    count: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Void dialog
  const [voidTarget, setVoidTarget] = React.useState<Restock | null>(null);
  const [voidBatchInput, setVoidBatchInput] = React.useState("");
  const [voidNote, setVoidNote] = React.useState("");
  const [isVoiding, setIsVoiding] = React.useState(false);
  const [voidError, setVoidError] = React.useState<string | null>(null);

  // Reset page when tab changes
  React.useEffect(() => {
    setPage(1);
  }, [tab]);

  // Debounce search
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchRestocks = React.useCallback(
    async (
      currentPage: number,
      currentTab: TabValue,
      currentSearch: string,
      currentDateFrom: string,
      currentDateTo: string,
      options?: { showLoading?: boolean; showRefreshing?: boolean }
    ) => {
      try {
        if (options?.showLoading) setIsLoading(true);
        if (options?.showRefreshing) setIsRefreshing(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("page", String(currentPage));
        params.set("limit", "10");
        params.set("status", currentTab);

        if (currentSearch) params.set("search", currentSearch);
        if (currentDateFrom) params.set("dateFrom", currentDateFrom);
        if (currentDateTo) params.set("dateTo", currentDateTo);

        const res = await fetch(
          `/api/inventory/restocks?${params.toString()}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );

        const json = (await res.json()) as ListResponse;

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "Gagal memuat data.");
        }

        setRestocks(json.data.items);
        setPagination(json.data.pagination);
        setSummary(json.data.summary);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat data."
        );
      } finally {
        if (options?.showLoading) setIsLoading(false);
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    []
  );

  React.useEffect(() => {
    void fetchRestocks(page, tab, debouncedSearch, dateFrom, dateTo, {
      showLoading: true,
    });
  }, [page, tab, debouncedSearch, dateFrom, dateTo, fetchRestocks]);

  function handleRefresh() {
    void fetchRestocks(page, tab, debouncedSearch, dateFrom, dateTo, {
      showRefreshing: true,
    });
  }

  function handleResetFilter() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function openVoidDialog(r: Restock) {
    setVoidTarget(r);
    setVoidBatchInput("");
    setVoidNote("");
    setVoidError(null);
  }

  function closeVoidDialog() {
    if (isVoiding) return;
    setVoidTarget(null);
    setVoidBatchInput("");
    setVoidNote("");
    setVoidError(null);
  }

  async function handleVoid() {
    if (!voidTarget || isVoiding) return;

    try {
      setIsVoiding(true);
      setVoidError(null);

      const res = await fetch(
        `/api/inventory/restocks/${encodeURIComponent(voidTarget.id)}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            batchCode: voidBatchInput.trim(),
            voidNote: voidNote.trim() || undefined,
          }),
        }
      );

      const json = (await res.json()) as MutationResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal void restock.");
      }

      setVoidTarget(null);
      setVoidBatchInput("");
      setVoidNote("");
      await fetchRestocks(page, tab, debouncedSearch, dateFrom, dateTo, {
        showRefreshing: true,
      });
    } catch (err) {
      setVoidError(
        err instanceof Error ? err.message : "Gagal void restock."
      );
    } finally {
      setIsVoiding(false);
    }
  }

  const hasSearch =
    search.trim().length > 0 || dateFrom !== "" || dateTo !== "";
  const totalPages = pagination?.totalPages ?? 0;
  const isVoidTab = tab === "VOIDED";

  // Validasi input batch code
  const batchMatch =
    voidTarget !== null &&
    voidBatchInput.trim() === voidTarget.batch.batchCode;

  return (
    <>
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Pengadaan
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Riwayat penerimaan bahan baku dari supplier.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw
                className={cn(
                  "mr-2 size-4",
                  isRefreshing && "animate-spin"
                )}
              />
              Refresh
            </Button>

            <Link
              href="/inventory/restocks/new"
              className={cn(buttonVariants())}
            >
              <Plus className="mr-2 size-4" />
              Penerimaan Barang
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {isVoidTab ? "Total Void" : "Total Transaksi"}
              </CardTitle>
              {isVoidTab ? (
                <Ban className="h-4 w-4 text-muted-foreground" />
              ) : (
                <PackageCheck className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(summary.count)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {isVoidTab ? "Nilai Di-void" : "Total Nilai"}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(summary.totalValue)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {isVoidTab ? "Quantity Di-void" : "Total Quantity"}
              </CardTitle>
              <PackageCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(summary.totalQuantity)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Card with Tabs */}
        <Card>
          {/* Tab switcher */}
          <div className="flex border-b">
            <button
              type="button"
              onClick={() => setTab("ACTIVE")}
              className={cn(
                "relative flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-colors",
                tab === "ACTIVE"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <CheckCircle2 className="size-4" />
              Aktif
            </button>

            <button
              type="button"
              onClick={() => setTab("VOIDED")}
              className={cn(
                "relative flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-colors",
                tab === "VOIDED"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Ban className="size-4" />
              Void
            </button>
          </div>

          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle className="text-base">
                {isVoidTab ? "Riwayat Void" : "Riwayat Pengadaan"}
              </CardTitle>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative sm:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari bahan, supplier, atau batch..."
                    className="pl-9"
                  />
                </div>

                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                />

                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {hasSearch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-fit"
                  onClick={handleResetFilter}
                >
                  Reset Filter
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <RestockSkeleton />
            ) : error ? (
              <RestockErrorState
                message={error}
                onRetry={() => {
                  void fetchRestocks(
                    page,
                    tab,
                    debouncedSearch,
                    dateFrom,
                    dateTo,
                    { showRefreshing: true }
                  );
                }}
              />
            ) : restocks.length === 0 ? (
              <RestockEmptyState
                hasSearch={hasSearch}
                isVoidTab={isVoidTab}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-6 py-3 text-left font-medium">
                          Bahan
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Batch
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Unit Cost
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Total
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Supplier
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          {isVoidTab ? "Di-void" : "Tanggal"}
                        </th>
                        <th className="w-16 px-4 py-3" />
                      </tr>
                    </thead>

                    <tbody>
                      {restocks.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b last:border-b-0 hover:bg-muted/30"
                        >
                          <td className="px-6 py-4">
                            <div className="font-medium">
                              {r.inventoryItem.name}
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {r.inventoryItem.unit}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              {r.batch.batchCode}
                            </Badge>
                          </td>

                          <td className="px-4 py-4 text-right font-medium">
                            {formatNumber(r.quantity)}
                          </td>

                          <td className="px-4 py-4 text-right text-muted-foreground">
                            {formatRupiah(r.unitCost)}
                          </td>

                          <td className="px-4 py-4 text-right font-semibold">
                            {formatRupiah(r.totalCost)}
                          </td>

                          <td className="px-4 py-4 text-muted-foreground">
                            {r.supplierName ?? "-"}
                          </td>

                          <td className="px-4 py-4">
                            {r.status === "VOIDED" ? (
                              <Badge variant="destructive">VOIDED</Badge>
                            ) : (
                              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                                Aktif
                              </Badge>
                            )}
                          </td>

                          <td className="px-4 py-4 text-muted-foreground">
                            {isVoidTab && r.voidedAt
                              ? formatDateTime(r.voidedAt)
                              : formatDateTime(r.createdAt)}
                          </td>

                          <td className="px-4 py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                type="button"
                                className="inline-flex size-8 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={`Aksi ${r.inventoryItem.name}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </DropdownMenuTrigger>

                              <DropdownMenuContent
                                align="end"
                                className="min-w-48"
                              >
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(
                                      `/inventory/restocks/${r.id}`
                                    )
                                  }
                                >
                                  <Eye className="mr-2 size-4" />
                                  Lihat Detail
                                </DropdownMenuItem>

                                {r.canVoid && (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => openVoidDialog(r)}
                                  >
                                    <Ban className="mr-2 size-4" />
                                    Void Restock
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    {pagination?.total ?? 0} transaksi
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() =>
                        setPage((current) => Math.max(1, current - 1))
                      }
                    >
                      <ChevronLeft className="mr-1 size-4" />
                      Sebelumnya
                    </Button>

                    <span className="min-w-20 text-center text-sm">
                      Halaman {page} dari {totalPages || 1}
                    </span>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={totalPages === 0 || page >= totalPages}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Berikutnya
                      <ChevronRight className="ml-1 size-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================= VOID DIALOG ================= */}
      <Dialog
        open={voidTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeVoidDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Void Restock?</DialogTitle>
            <DialogDescription>
              Restock{" "}
              <strong>{voidTarget?.inventoryItem.name}</strong> batch{" "}
              <strong className="font-mono">
                {voidTarget?.batch.batchCode}
              </strong>{" "}
              akan di-void. Stok batch akan dikosongkan, tapi riwayat
              tetap tersimpan di tab Void.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Ringkasan */}
            {voidTarget && (
              <div className="rounded-md border bg-muted/40 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-medium">
                    {formatNumber(voidTarget.quantity)}{" "}
                    {voidTarget.inventoryItem.unit}
                  </span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-muted-foreground">
                    Total Biaya
                  </span>
                  <span className="font-medium">
                    {formatRupiah(voidTarget.totalCost)}
                  </span>
                </div>
              </div>
            )}

            {/* Konfirmasi batch code */}
            <div className="grid gap-2">
              <Label htmlFor="void-batch">
                Konfirmasi Batch Code{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="void-batch"
                value={voidBatchInput}
                onChange={(e) => setVoidBatchInput(e.target.value)}
                placeholder={`Masukan batch code diatas`}
                autoComplete="off"
                disabled={isVoiding}
                className={cn(
                  voidBatchInput.length > 0 &&
                    (batchMatch
                      ? "border-green-500 focus-visible:ring-green-500/30"
                      : "border-red-500 focus-visible:ring-red-500/30")
                )}
              />
              {voidBatchInput.length > 0 && (
                <p
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    batchMatch
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {batchMatch ? (
                    <>
                      <CheckCircle2 className="size-3.5" />
                      Batch code cocok
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="size-3.5" />
                      Batch code belum cocok
                    </>
                  )}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Ketik batch code persis sama untuk mengaktifkan tombol
                void.
              </p>
            </div>

            {/* Catatan alasan (optional) */}
            <div className="grid gap-2">
              <Label htmlFor="void-note">
                Alasan Void{" "}
                <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <textarea
                id="void-note"
                value={voidNote}
                onChange={(e) => setVoidNote(e.target.value)}
                placeholder="Contoh: Salah input quantity, supplier salah kirim, dsb."
                disabled={isVoiding}
                maxLength={500}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                {voidNote.length}/500 karakter
              </p>
            </div>
          </div>

          {voidError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {voidError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeVoidDialog}
              disabled={isVoiding}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleVoid()}
              disabled={isVoiding || !batchMatch}
            >
              {isVoiding ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Ban className="mr-2 size-4" />
                  Void Restock
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}