"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  Minus,
  Package,
  Plus,
  RefreshCw,
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

type Barista = {
  id: string;
  name: string;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE";
};

type AvailableProduct = {
  productId: string;
  productName: string;
  sellingPrice: number;
  availableStock: number;
};

type Row = {
  productId: string;
  productName: string;
  availableStock: number;
  quantity: string;
};

type BaristaListResponse = {
  success: boolean;
  data?: { items: Barista[] };
  error?: { message?: string };
};

type ProductsResponse = {
  success: boolean;
  data?: { items: AvailableProduct[] };
  error?: { message?: string };
};

type MutationResponse = {
  success: boolean;
  data?: {
    success: boolean;
    restockId: string;
    totalItems: number;
  };
  error?: { message?: string };
};

// ============================================================
// Helpers
// ============================================================

function emptyRow(): Row {
  return {
    productId: "",
    productName: "",
    availableStock: 0,
    quantity: "",
  };
}

function stripNonDigits(v: string): string {
  return v.replace(/\D/g, "");
}

function parseNumber(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  if (isNaN(n) || !isFinite(n)) return null;
  return n;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

// ============================================================
// Skeleton
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

// ============================================================
// Main
// ============================================================

export function BaristaRestockForm() {
  const router = useRouter();
  const formId = React.useId();

  const [baristas, setBaristas] = React.useState<Barista[]>([]);
  const [products, setProducts] = React.useState<AvailableProduct[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [baristaId, setBaristaId] = React.useState("");
  const [rows, setRows] = React.useState<Row[]>([emptyRow()]);
  const [note, setNote] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ---------- Load data ----------
  const loadData = React.useCallback(async () => {
    try {
      setIsLoadingData(true);
      setLoadError(null);

      const [baristasRes, productsRes] = await Promise.all([
        fetch("/api/users?role=BARISTA&status=ACTIVE&limit=100", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }),
        fetch("/api/barista-stock/available-products", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }),
      ]);

      const baristasJson = (await baristasRes.json()) as BaristaListResponse;
      const productsJson = (await productsRes.json()) as ProductsResponse;

      if (!baristasRes.ok || !baristasJson.success || !baristasJson.data) {
        throw new Error(
          baristasJson.error?.message ?? "Gagal memuat daftar barista."
        );
      }
      if (!productsRes.ok || !productsJson.success || !productsJson.data) {
        throw new Error(
          productsJson.error?.message ?? "Gagal memuat daftar produk."
        );
      }

      setBaristas(baristasJson.data.items);
      setProducts(productsJson.data.items);

      if (baristasJson.data.items.length > 0) {
        setBaristaId(baristasJson.data.items[0].id);
      }

      if (productsJson.data.items.length > 0) {
        const first = productsJson.data.items[0];
        setRows([
          {
            productId: first.productId,
            productName: first.productName,
            availableStock: first.availableStock,
            quantity: "",
          },
        ]);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Gagal memuat data."
      );
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  // ---------- Row ops ----------
  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
  }

  function addRow() {
    const first = products[0];
    setRows((prev) => [
      ...prev,
      first
        ? {
            productId: first.productId,
            productName: first.productName,
            availableStock: first.availableStock,
            quantity: "",
          }
        : emptyRow(),
    ]);
  }

  function removeRow(index: number) {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleProductChange(index: number, productId: string) {
    const p = products.find((x) => x.productId === productId);
    if (!p) return;
    updateRow(index, {
      productId: p.productId,
      productName: p.productName,
      availableStock: p.availableStock,
      quantity: "",
    });
  }

  // ---------- Computed ----------
  const filledCount = rows.filter((r) => {
    const q = parseNumber(r.quantity);
    return r.productId && q !== null && q > 0;
  }).length;

  const totalQuantity = rows.reduce((sum, r) => {
    const q = parseNumber(r.quantity);
    return sum + (q && q > 0 ? q : 0);
  }, 0);

  // ---------- Submit ----------
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError(null);

    if (!baristaId) {
      setError("Pilih barista terlebih dahulu.");
      return;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const q = parseNumber(row.quantity);

      if (!row.productId) {
        setError(`Baris #${i + 1}: pilih produk terlebih dahulu.`);
        return;
      }
      if (q === null || q <= 0) {
        setError(
          `Baris #${i + 1}: quantity wajib diisi dan harus lebih dari 0.`
        );
        return;
      }
      if (q > row.availableStock) {
        setError(
          `Baris #${i + 1}: quantity melebihi stok pusat (${formatNumber(
            row.availableStock
          )}).`
        );
        return;
      }
    }

    const seen = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
      const id = rows[i].productId;
      if (seen.has(id)) {
        setError(
          `Produk "${rows[i].productName}" muncul lebih dari sekali. ` +
            `Gabungkan jadi satu baris.`
        );
        return;
      }
      seen.add(id);
    }

    setLoading(true);

    try {
      const payload = {
        baristaId,
        items: rows.map((r) => ({
          productId: r.productId,
          quantity: Number(stripNonDigits(r.quantity)),
        })),
        note: note.trim() || undefined,
      };

      const res = await fetch("/api/barista-stock/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as MutationResponse;

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Gagal membuat restock.");
      }

      router.push("/barista-stock");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal membuat restock."
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------- Render ----------
  if (isLoadingData) return <FormSkeleton />;

  if (loadError) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="mt-3 text-sm font-medium">Gagal memuat data</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          {loadError}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => void loadData()}
        >
          <RefreshCw className="mr-2 size-3.5" />
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Restock Barista</CardTitle>
          <CardDescription>
            Barista ambil stok produk jadi dari pusat untuk dibawa keliling.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* INFO BARISTA */}
          <section className="space-y-5">
            <div>
              <h3 className="text-sm font-medium">Info Barista</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pilih barista yang akan menerima stok.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={`${formId}-barista`}>
                  Barista <span className="text-destructive">*</span>
                </Label>
                <select
                  id={`${formId}-barista`}
                  value={baristaId}
                  onChange={(e) => setBaristaId(e.target.value)}
                  disabled={loading || baristas.length === 0}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {baristas.length === 0 ? (
                    <option value="">Belum ada barista aktif</option>
                  ) : (
                    baristas.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                        {b.phone ? ` · ${b.phone}` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid gap-2">
                <Label>Jumlah Baris</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
                  {rows.length} baris · {filledCount} terisi
                </div>
              </div>
            </div>
          </section>

          {/* DAFTAR PRODUK */}
          <section className="space-y-4 border-t pt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Produk yang Diambil</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Tambahkan satu baris untuk setiap produk.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
                disabled={loading || products.length === 0}
              >
                <Plus className="mr-2 size-4" />
                Tambah Baris
              </Button>
            </div>

            {products.length === 0 ? (
              <div className="rounded-lg border border-dashed py-12 text-center">
                <Package className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">
                  Tidak ada produk dengan stok
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Lakukan produksi terlebih dahulu di halaman Produksi.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((row, index) => {
                  const q = parseNumber(row.quantity);
                  const isOverStock =
                    q !== null && q > row.availableStock;
                  const canRemove = rows.length > 1;
                  const qtyId = `${formId}-qty-${index}`;

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
                          disabled={loading || !canRemove}
                          aria-label={`Hapus baris #${index + 1}`}
                        >
                          <Minus className="size-3.5" />
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-12">
                        <div className="grid gap-1.5 sm:col-span-6">
                          <Label className="text-xs">
                            Produk{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <select
                            value={row.productId}
                            onChange={(e) =>
                              handleProductChange(index, e.target.value)
                            }
                            disabled={loading}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                          >
                            {products.map((p) => (
                              <option
                                key={p.productId}
                                value={p.productId}
                              >
                                {p.productName} · Stok:{" "}
                                {formatNumber(p.availableStock)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid gap-1.5 sm:col-span-3">
                          <Label htmlFor={qtyId} className="text-xs">
                            Quantity{" "}
                            <span className="text-destructive">*</span>
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
                                ).slice(0, 8),
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
                            disabled={loading}
                            className={cn(
                              "h-9",
                              isOverStock &&
                                "border-red-500 focus-visible:ring-red-500/30"
                            )}
                          />
                        </div>

                        <div className="grid gap-1.5 sm:col-span-3">
                          <Label className="text-xs">Stok Pusat</Label>
                          <div
                            className={cn(
                              "flex h-9 items-center justify-between rounded-md border bg-muted/40 px-3 text-xs font-medium",
                              isOverStock &&
                                "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400"
                            )}
                          >
                            <span>{formatNumber(row.availableStock)}</span>
                            {isOverStock && (
                              <Badge
                                variant="destructive"
                                className="text-[10px]"
                              >
                                Melebihi
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* NOTE */}
          {products.length > 0 && (
            <section className="space-y-3 border-t pt-8">
              <div>
                <h3 className="text-sm font-medium">Catatan</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Opsional. Contoh: "Ambil pagi untuk shift siang".
                </p>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Catatan tambahan..."
                disabled={loading}
                maxLength={500}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                {note.length}/500 karakter
              </p>
            </section>
          )}

          {/* RINGKASAN */}
          {products.length > 0 && (
            <section className="rounded-lg border bg-muted/30 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Baris</span>
                  <span className="font-medium">{rows.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Baris Terisi</span>
                  <span className="font-medium">{filledCount}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                  <span className="text-sm text-muted-foreground">
                    Total Quantity
                  </span>
                  <span className="text-base font-bold">
                    {formatNumber(totalQuantity)}
                  </span>
                </div>
              </div>
            </section>
          )}

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
          <Button
            type="submit"
            disabled={
              loading ||
              isLoadingData ||
              products.length === 0 ||
              baristas.length === 0
            }
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Simpan Restock
          </Button>
        </div>
      </Card>
    </form>
  );
}