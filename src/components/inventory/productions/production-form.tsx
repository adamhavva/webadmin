"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Factory,
  Loader2,
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
  requiredQuantity: number;
  availableStock: number;
  unitCost: number | null;
  subtotal: number | null;
  fulfilled: boolean;
  shortage: number;
  allocations: FifoAllocation[];
};

type ProductionPreview = {
  product: { id: string; name: string; sellingPrice: number };
  recipe: { id: string; version: number };
  outputQuantity: number;
  items: PreviewItem[];
  totalCost: number;
  unitCost: number;
  canProduce: boolean;
  shortages: Array<{
    inventoryItemName: string;
    unit: string;
    needed: number;
    available: number;
    shortage: number;
  }>;
};

type PreviewResponse = {
  success: boolean;
  data?: ProductionPreview;
  error?: { message?: string };
};

type MutationResponse = {
  success: boolean;
  data?: {
    success: boolean;
    productionId: string;
    batchCode: string;
    outputQuantity: number;
    totalCost: number;
    unitCost: number;
  };
  error?: { message?: string };
};

// ============================================================
// Helpers
// ============================================================

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
// API fetcher — produk
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

// ============================================================
// Main
// ============================================================

export function ProductionForm() {
  const router = useRouter();
  const formId = React.useId();

  const [productId, setProductId] = React.useState("");
  const [outputQty, setOutputQty] = React.useState("");

  const [preview, setPreview] = React.useState<ProductionPreview | null>(
    null
  );
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState<string | null>(
    null
  );

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ---------- Preview (debounced) ----------
  React.useEffect(() => {
    const qty = parseNumber(outputQty);

    if (!productId || qty === null || qty <= 0) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    const controller = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        setIsPreviewLoading(true);
        setPreviewError(null);
        const res = await fetch("/api/inventory/productions/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            outputQuantity: qty,
          }),
          signal: controller.signal,
        });
        const json = (await res.json()) as PreviewResponse;
        if (res.ok && json.success && json.data) {
          setPreview(json.data);
        } else {
          setPreview(null);
          setPreviewError(json.error?.message ?? "Gagal memuat preview.");
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setPreview(null);
        setPreviewError(
          err instanceof Error ? err.message : "Gagal memuat preview."
        );
      } finally {
        setIsPreviewLoading(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [productId, outputQty]);

  // ---------- Submit ----------
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError(null);

    const qty = parseNumber(outputQty);

    if (!productId) {
      setError("Produk wajib dipilih.");
      return;
    }
    if (qty === null || qty <= 0) {
      setError("Output quantity wajib diisi dan harus lebih dari 0.");
      return;
    }
    if (!preview || !preview.canProduce) {
      setError("Stok tidak cukup. Periksa kembali ketersediaan bahan.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/inventory/productions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          outputQuantity: qty,
        }),
      });

      const json = (await res.json()) as MutationResponse;

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Gagal membuat produksi.");
      }

      router.push(`/inventory/productions/${json.data.productionId}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal membuat produksi."
      );
    } finally {
      setLoading(false);
    }
  }

  const qty = parseNumber(outputQty);
  const hasValidInput = Boolean(productId && qty !== null && qty > 0);
  const canSubmit =
    !loading && hasValidInput && preview !== null && preview.canProduce;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Produksi Baru</CardTitle>
          <CardDescription>
            Sistem otomatis mengambil bahan via FIFO, menghitung HPP, dan
            membuat batch produk jadi.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* INPUT */}
          <section className="space-y-5">
            <div>
              <h3 className="text-sm font-medium">Informasi Produksi</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pilih produk dan tentukan berapa unit yang ingin dibuat.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={`${formId}-product`}>
                  Produk <span className="text-destructive">*</span>
                </Label>
                <SearchableSelect
                  value={productId}
                  onChange={(val) => setProductId(val)}
                  fetcher={fetchProducts}
                  placeholder="Pilih produk..."
                  searchPlaceholder="Cari produk..."
                  emptyText="Produk tidak ditemukan"
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`${formId}-qty`}>
                  Output Quantity{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`${formId}-qty`}
                  type="text"
                  inputMode="numeric"
                  value={outputQty}
                  onChange={(e) =>
                    setOutputQty(
                      stripNonDigits(e.target.value).slice(0, 10)
                    )
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
                  placeholder="Contoh: 10"
                  disabled={loading}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  Jumlah unit produk jadi yang ingin diproduksi.
                </p>
              </div>
            </div>
          </section>

          {/* PREVIEW */}
          <section className="space-y-4 border-t pt-8">
            <div>
              <h3 className="text-sm font-medium">Preview Kebutuhan Bahan</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Simulasi FIFO berdasarkan batch yang tersedia.
              </p>
            </div>

            {!hasValidInput ? (
              <div className="rounded-lg border border-dashed px-6 py-12 text-center">
                <Factory className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">
                  Preview belum tersedia
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pilih produk dan isi output quantity untuk melihat simulasi
                </p>
              </div>
            ) : isPreviewLoading && !preview ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/30 px-6 py-12 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Menghitung kebutuhan...
              </div>
            ) : previewError ? (
              <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{previewError}</span>
              </div>
            ) : preview ? (
              <>
                {/* Recipe info */}
                <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
                  <Badge variant="outline" className="font-mono">
                    Resep v{preview.recipe.version}
                  </Badge>
                  <span className="text-muted-foreground">
                    Output: {formatNumber(preview.outputQuantity)} unit
                  </span>
                </div>

                {/* Items table */}
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[800px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-3 text-left font-medium">
                          Bahan
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Butuh
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Tersedia
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          HPP / Unit
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Subtotal
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.items.map((item) => (
                        <tr
                          key={item.inventoryItemId}
                          className="border-b last:border-b-0"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {item.inventoryItemName}
                            </div>
                            {item.allocations.length > 1 && (
                              <div className="mt-1 space-y-0.5">
                                {item.allocations.map((a) => (
                                  <div
                                    key={a.batchId}
                                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                                  >
                                    <span className="font-mono">
                                      {a.batchCode}
                                    </span>
                                    <span>
                                      {formatNumber(a.quantity)} {item.unit}
                                    </span>
                                    <span>×</span>
                                    <span>{formatUnitCost(a.unitCost)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.allocations.length === 1 && (
                              <div className="mt-0.5 text-[11px] text-muted-foreground">
                                via{" "}
                                <span className="font-mono">
                                  {item.allocations[0].batchCode}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatNumber(item.requiredQuantity)}{" "}
                            <span className="text-xs text-muted-foreground">
                              {item.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {formatNumber(item.availableStock)}{" "}
                            <span className="text-xs">{item.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {item.unitCost !== null
                              ? formatUnitCost(item.unitCost)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {item.subtotal !== null
                              ? formatRupiah(item.subtotal)
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {item.fulfilled ? (
                              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                                <CheckCircle2 className="mr-1 size-3" />
                                Cukup
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="mr-1 size-3" />
                                Kurang{" "}
                                {formatNumber(item.shortage)} {item.unit}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Estimasi Total Biaya
                      </span>
                      <span className="text-base font-bold">
                        {formatRupiah(preview.totalCost)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t pt-2">
                      <span className="text-xs text-muted-foreground">
                        Estimasi HPP / Unit
                      </span>
                      <span className="text-base font-bold text-primary">
                        {formatRupiah(preview.unitCost)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t pt-2">
                      <span className="text-xs text-muted-foreground">
                        Harga Jual / Unit
                      </span>
                      <span className="text-sm font-medium">
                        {formatRupiah(preview.product.sellingPrice)}
                      </span>
                    </div>
                  </div>

                  <div
                    className={
                      preview.canProduce
                        ? "flex items-start gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400"
                        : "flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400"
                    }
                  >
                    {preview.canProduce ? (
                      <>
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                        <div>
                          <p className="font-medium">
                            Siap diproduksi
                          </p>
                          <p className="mt-1 text-xs">
                            Semua bahan tersedia. Klik tombol produksi
                            untuk memproses.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                        <div>
                          <p className="font-medium">
                            Stok tidak cukup
                          </p>
                          <ul className="mt-1 space-y-0.5 text-xs">
                            {preview.shortages.map((s) => (
                              <li key={s.inventoryItemName}>
                                {s.inventoryItemName}: kurang{" "}
                                {formatNumber(s.shortage)} {s.unit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </section>

          {/* ERROR */}
          {error && (
            <div
              role="alert"
              className="whitespace-pre-line rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400"
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
          <Button type="submit" disabled={!canSubmit}>
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Factory className="mr-2 size-4" />
                Mulai Produksi
              </>
            )}
          </Button>
        </div>
      </Card>
    </form>
  );
}