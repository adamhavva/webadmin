"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  XCircle,
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
import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/ui/searchable-select";

// ============================================================
// Types
// ============================================================

type FifoAllocation = {
  batchId: string;
  batchCode: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
};

type PreviewItem = {
  inventoryItemId: string;
  inventoryItemName: string;
  unit: string;
  quantity: number;
  unitCost: number | null;
  subtotal: number | null;
  availableStock: number;
  fulfilled: boolean;
  shortage: number;
  allocations: FifoAllocation[];
};

type PreviewResponse = {
  success: boolean;
  data?: {
    items: PreviewItem[];
    totalHpp: number;
    totalFulfilled: boolean;
    unavailableItems: string[];
  };
  error?: { message?: string };
};

type RecipeDetailResponse = {
  success: boolean;
  data?: {
    id: string;
    productId: string;
    version: number;
    isActive: boolean;
    canEdit: boolean;
    usedInProduction: boolean;
    product: { id: string; name: string };
    items: Array<{
      id: string;
      inventoryItemId: string;
      inventoryItemName: string;
      unit: string;
      quantity: number;
    }>;
  };
  error?: { message?: string };
};

type MutationResponse = {
  success: boolean;
  error?: { message?: string };
};

type Row = {
  inventoryItemId: string;
  inventoryItemName: string;
  unit: string;
  quantity: string;
};

// ============================================================
// Helpers
// ============================================================

function emptyRow(): Row {
  return {
    inventoryItemId: "",
    inventoryItemName: "",
    unit: "",
    quantity: "",
  };
}

function stripNonDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function parseNumber(digits: string): number | null {
  const trimmed = digits.trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  if (isNaN(num) || !isFinite(num)) return null;
  return num;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatUnitCost(n: number): string {
  if (Math.abs(n) >= 1) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(n);
}

// ============================================================
// API fetchers
// ============================================================

async function fetchProducts(
  query: string,
  signal: AbortSignal
): Promise<SearchableOption[]> {
  const params = new URLSearchParams();
  params.set("isActive", "true");
  params.set("limit", "20");
  if (query) params.set("search", query);

  const res = await fetch(`/api/inventory/products?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const json = await res.json();

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? "Gagal memuat produk");
  }

  return (json.data.items as Array<{ id: string; name: string }>).map(
    (p) => ({
      value: p.id,
      label: p.name,
    })
  );
}

async function fetchInventoryItems(
  query: string,
  signal: AbortSignal
): Promise<SearchableOption[]> {
  const params = new URLSearchParams();
  params.set("isActive", "true");
  params.set("limit", "20");
  if (query) params.set("search", query);

  const res = await fetch(`/api/inventory/items?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const json = await res.json();

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? "Gagal memuat bahan");
  }

  return (
    json.data.items as Array<{ id: string; name: string; unit: string }>
  ).map((i) => ({
    value: i.id,
    label: i.name,
    sublabel: i.unit,
  }));
}

// ============================================================
// Skeleton / Error
// ============================================================

function FormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-24 animate-pulse rounded-lg border bg-muted/30" />
        <div className="h-32 animate-pulse rounded-lg border bg-muted/30" />
      </CardContent>
    </Card>
  );
}

function FormError({
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

// ============================================================
// Props
// ============================================================

type RecipeFormProps = {
  mode: "create" | "edit";
  recipeId?: string;
  initialProductId?: string;
};

// ============================================================
// Main
// ============================================================

export function RecipeForm({
  mode,
  recipeId,
  initialProductId,
}: RecipeFormProps) {
  const router = useRouter();
  const formId = React.useId();

  const isEdit = mode === "edit";

  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [productId, setProductId] = React.useState(initialProductId ?? "");
  const [lockedProductName, setLockedProductName] = React.useState<
    string | null
  >(null);
  const [rows, setRows] = React.useState<Row[]>(() => [emptyRow()]);

  const [recipeMeta, setRecipeMeta] = React.useState<{
    version: number;
    isActive: boolean;
    canEdit: boolean;
    usedInProduction: boolean;
  } | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Preview FIFO
  const [preview, setPreview] = React.useState<
    PreviewResponse["data"] | null
  >(null);
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);

  // ---------- Load data ----------
  const loadData = React.useCallback(async () => {
    try {
      setIsLoadingData(true);
      setLoadError(null);

      if (isEdit && recipeId) {
        const recipeRes = await fetch(
          `/api/inventory/recipes/${encodeURIComponent(recipeId)}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );
        const recipeJson = (await recipeRes.json()) as RecipeDetailResponse;
        if (!recipeRes.ok || !recipeJson.success || !recipeJson.data) {
          throw new Error(
            recipeJson.error?.message ?? "Gagal memuat detail resep."
          );
        }
        const r = recipeJson.data;
        setProductId(r.productId);
        setLockedProductName(r.product.name);
        setRecipeMeta({
          version: r.version,
          isActive: r.isActive,
          canEdit: r.canEdit,
          usedInProduction: r.usedInProduction,
        });
        setRows(
          r.items.length > 0
            ? r.items.map((it) => ({
                inventoryItemId: it.inventoryItemId,
                inventoryItemName: it.inventoryItemName,
                unit: it.unit,
                quantity: String(it.quantity),
              }))
            : [emptyRow()]
        );
      } else if (initialProductId) {
        const prodRes = await fetch(
          `/api/inventory/products/${encodeURIComponent(initialProductId)}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );
        const prodJson = await prodRes.json();
        if (!prodRes.ok || !prodJson.success || !prodJson.data) {
          throw new Error(
            prodJson.error?.message ?? "Gagal memuat produk."
          );
        }
        setLockedProductName(prodJson.data.name);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Gagal memuat data."
      );
    } finally {
      setIsLoadingData(false);
    }
  }, [isEdit, recipeId, initialProductId]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  // ---------- Preview FIFO (debounced) ----------
  React.useEffect(() => {
    const validRows = rows.filter((r) => {
      const qty = parseNumber(r.quantity);
      return r.inventoryItemId && qty !== null && qty > 0;
    });

    if (validRows.length === 0) {
      setPreview(null);
      return;
    }

    const controller = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        setIsPreviewLoading(true);
        const res = await fetch("/api/inventory/recipes/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: validRows.map((r) => ({
              inventoryItemId: r.inventoryItemId,
              quantity: Number(stripNonDigits(r.quantity)),
            })),
          }),
          signal: controller.signal,
        });
        const json = (await res.json()) as PreviewResponse;
        if (res.ok && json.success && json.data) {
          setPreview(json.data);
        } else {
          setPreview(null);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setPreview(null);
      } finally {
        setIsPreviewLoading(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [rows]);

  // ---------- Row operations ----------
  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  // ---------- Preview map ----------
  const previewMap = React.useMemo(() => {
    const m = new Map<string, PreviewItem>();
    if (preview) {
      for (const it of preview.items) {
        m.set(it.inventoryItemId, it);
      }
    }
    return m;
  }, [preview]);

  // ---------- Submit ----------
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError(null);

    if (!productId) {
      setError("Produk wajib dipilih.");
      return;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const qty = parseNumber(row.quantity);

      if (!row.inventoryItemId) {
        setError(`Baris #${i + 1}: pilih bahan terlebih dahulu.`);
        return;
      }
      if (qty === null || qty <= 0) {
        setError(
          `Baris #${i + 1}: quantity wajib diisi dan harus lebih dari 0.`
        );
        return;
      }
    }

    const seen = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
      const id = rows[i].inventoryItemId;
      if (seen.has(id)) {
        const name = rows[i].inventoryItemName || id;
        setError(
          `Bahan "${name}" muncul lebih dari sekali. ` +
            `Gabungkan jadi satu baris.`
        );
        return;
      }
      seen.add(id);
    }

    setLoading(true);

    try {
      const payload = {
        items: rows.map((r) => ({
          inventoryItemId: r.inventoryItemId,
          quantity: Number(stripNonDigits(r.quantity)),
        })),
      };

      let res: Response;
      if (isEdit && recipeId) {
        res = await fetch(
          `/api/inventory/recipes/${encodeURIComponent(recipeId)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
      } else {
        res = await fetch("/api/inventory/recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, productId }),
        });
      }

      const json = (await res.json()) as MutationResponse;

      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message ??
            (isEdit ? "Gagal menyimpan resep." : "Gagal membuat resep.")
        );
      }

      if (isEdit) {
        router.push(`/inventory/recipes/${recipeId}`);
      } else {
        router.push(`/inventory/products/${productId}`);
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menyimpan resep."
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------- Render ----------
  if (isLoadingData) return <FormSkeleton />;
  if (loadError)
    return <FormError message={loadError} onRetry={() => void loadData()} />;

  const isProductLocked = Boolean(initialProductId) || isEdit;
  const isFormDisabled = loading || (isEdit && !recipeMeta?.canEdit);

  const filledRowCount = rows.filter((r) => {
    const qty = parseNumber(r.quantity);
    return r.inventoryItemId && qty !== null && qty > 0;
  }).length;

  const totalHpp = preview?.totalHpp ?? 0;
  const totalFulfilled = preview?.totalFulfilled ?? true;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            {isEdit ? "Edit Resep" : "Buat Resep Baru"}
          </CardTitle>
          <CardDescription>
            {isEdit
              ? "Ubah komposisi bahan. Perubahan tidak bisa dilakukan jika resep sudah pernah dipakai produksi."
              : "Tentukan bahan dan quantity untuk membuat satu batch produk."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* WARNING */}
          {isEdit && recipeMeta?.usedInProduction && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Resep tidak dapat diedit</p>
                <p className="mt-1 text-xs">
                  Resep ini sudah pernah dipakai di produksi. Untuk
                  mengubah komposisi, buat versi baru dari halaman detail
                  produk.
                </p>
              </div>
            </div>
          )}

          {/* PRODUK */}
          <section className="space-y-5">
            <div>
              <h3 className="text-sm font-medium">Produk</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isProductLocked
                  ? "Produk tidak dapat diubah."
                  : "Pilih produk yang akan dibuatkan resep."}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={`${formId}-product`}>Produk</Label>
                {isProductLocked ? (
                  <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
                    {lockedProductName ?? "Memuat..."}
                    {isEdit && recipeMeta?.isActive && (
                      <Badge className="ml-2 bg-green-500/15 text-green-700 dark:text-green-400">
                        Aktif
                      </Badge>
                    )}
                  </div>
                ) : (
                  <SearchableSelect
                    value={productId}
                    onChange={(val) => setProductId(val)}
                    fetcher={fetchProducts}
                    placeholder="Pilih produk..."
                    searchPlaceholder="Cari produk..."
                    emptyText="Produk tidak ditemukan"
                    disabled={loading}
                  />
                )}
              </div>

              <div className="grid gap-2">
                <Label>Jumlah Bahan</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
                  {rows.length} baris
                </div>
              </div>
            </div>
          </section>

          {/* DAFTAR BAHAN */}
          <section className="space-y-4 border-t pt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Komposisi Bahan</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  HPP dihitung FIFO berdasarkan batch yang tersedia.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
                disabled={isFormDisabled}
              >
                <Plus className="mr-2 size-4" />
                Tambah Baris
              </Button>
            </div>

            <div className="space-y-3">
              {rows.map((row, index) => {
                const canRemove = rows.length > 1;
                const qtyId = `${formId}-qty-${index}`;
                const previewItem = previewMap.get(row.inventoryItemId);

                return (
                  <div
                    key={index}
                    className="rounded-lg border bg-muted/20 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Baris #{index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeRow(index)}
                        disabled={isFormDisabled || !canRemove}
                        aria-label={`Hapus baris #${index + 1}`}
                      >
                        <Minus className="size-3.5" />
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-12">
                      <div className="grid gap-1.5 sm:col-span-6">
                        <Label className="text-xs">
                          Bahan{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <SearchableSelect
                          value={row.inventoryItemId}
                          initialOption={
                            row.inventoryItemId && row.inventoryItemName
                              ? {
                                  value: row.inventoryItemId,
                                  label: row.inventoryItemName,
                                  sublabel: row.unit,
                                }
                              : null
                          }
                          onChange={(val, opt) =>
                            updateRow(index, {
                              inventoryItemId: val,
                              inventoryItemName: opt?.label ?? "",
                              unit: opt?.sublabel ?? "",
                            })
                          }
                          fetcher={fetchInventoryItems}
                          placeholder="Pilih bahan..."
                          searchPlaceholder="Cari bahan..."
                          emptyText="Bahan tidak ditemukan"
                          disabled={isFormDisabled}
                        />
                      </div>

                      <div className="grid gap-1.5 sm:col-span-4">
                        <Label htmlFor={qtyId} className="text-xs">
                          Quantity{" "}
                          <span className="text-destructive">*</span>
                          {row.unit && (
                            <span className="ml-1 font-normal text-muted-foreground">
                              ({row.unit})
                            </span>
                          )}
                        </Label>
                        <Input
                          id={qtyId}
                          type="text"
                          inputMode="numeric"
                          value={row.quantity}
                          onChange={(e) =>
                            updateRow(index, {
                              quantity: stripNonDigits(
                                e.target.value
                              ).slice(0, 12),
                            })
                          }
                          onKeyDown={(e) => {
                            if (
                              e.key === "-" ||
                              e.key === "+" ||
                              e.key === "e" ||
                              e.key === "E" ||
                              e.key === "," ||
                              e.key === "."
                            ) {
                              e.preventDefault();
                            }
                          }}
                          placeholder="0"
                          disabled={isFormDisabled}
                          className="h-9"
                        />
                      </div>

                      <div className="grid gap-1.5 sm:col-span-2">
                        <Label className="text-xs">Satuan</Label>
                        <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-xs font-medium">
                          {row.unit || "—"}
                        </div>
                      </div>
                    </div>

                    {/* FIFO Preview */}
                    {previewItem && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-12">
                        <div className="grid gap-1.5 sm:col-span-6">
                          <Label className="text-xs">
                            HPP / Unit (FIFO)
                          </Label>
                          <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-xs font-medium">
                            {previewItem.unitCost !== null ? (
                              <>
                                {formatUnitCost(previewItem.unitCost)}
                                {previewItem.unit && (
                                  <span className="ml-1 text-muted-foreground">
                                    / {previewItem.unit}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground">
                                Stok kosong
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-1.5 sm:col-span-6">
                          <Label className="text-xs">Subtotal</Label>
                          <div className="flex h-9 items-center justify-between rounded-md border bg-muted/40 px-3 text-sm font-semibold">
                            <span>
                              {previewItem.subtotal !== null
                                ? formatRupiah(previewItem.subtotal)
                                : "—"}
                            </span>
                            {previewItem.fulfilled ? (
                              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                                <CheckCircle2 className="mr-1 size-3" />
                                Cukup
                              </Badge>
                            ) : (
                              <Badge
                                variant="destructive"
                                title={`Kurang ${formatNumber(
                                  previewItem.shortage
                                )} ${previewItem.unit}`}
                              >
                                <XCircle className="mr-1 size-3" />
                                Kurang{" "}
                                {formatNumber(previewItem.shortage)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* RINGKASAN */}
          <section
            className={
              totalFulfilled
                ? "rounded-lg border bg-muted/30 p-4"
                : "rounded-lg border border-red-500/30 bg-red-500/5 p-4"
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Baris</span>
                <span className="font-medium">{rows.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Baris Terisi</span>
                <span className="font-medium">{filledRowCount}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                <span className="text-sm text-muted-foreground">
                  {isPreviewLoading ? "Menghitung..." : "Estimasi HPP"}
                </span>
                <span className="text-base font-bold">
                  {formatRupiah(totalHpp)}
                </span>
              </div>
            </div>

            {preview && !totalFulfilled && (
              <div className="mt-3 flex items-start gap-2 border-t pt-3 text-xs text-red-600 dark:text-red-400">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Stok tidak cukup untuk:{" "}
                  <strong>{preview.unavailableItems.join(", ")}</strong>.
                  Resep tetap bisa disimpan, tapi produksi akan gagal sampai
                  stok ditambah.
                </span>
              </div>
            )}
          </section>

          {/* ERROR */}
          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </div>
          )}
        </CardContent>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={
              loading ||
              isLoadingData ||
              (isEdit && !recipeMeta?.canEdit)
            }
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEdit ? "Simpan Perubahan" : "Buat Resep"}
          </Button>
        </div>
      </Card>
    </form>
  );
}