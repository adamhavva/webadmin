"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus } from "lucide-react";

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

// ============================================================
// Types
// ============================================================

type InventoryItem = {
  id: string;
  name: string;
  unit: "ML" | "PCS";
  isActive: boolean;
};

/**
 * State internal:
 * - quantity  → digit murni, contoh: "1000"      (TANPA format ribuan)
 * - totalCost → digit murni, contoh: "150000"    (diformat saat render)
 */
type Row = {
  inventoryItemId: string;
  quantity: string;
  totalCost: string;
};

type ItemsResponse = {
  success: boolean;
  data?: { items: InventoryItem[] };
  error?: { message?: string };
};

type BulkResponse = {
  success: boolean;
  data?: {
    count: number;
    items: Array<{
      restockId: string;
      batchCode: string;
      inventoryItemName: string;
      unit: string;
      quantity: number;
      unitCost: number;
      totalCost: number;
    }>;
  };
  error?: { message?: string };
};

// ============================================================
// Helpers
// ============================================================

function emptyRow(defaultItemId = ""): Row {
  return {
    inventoryItemId: defaultItemId,
    quantity: "",
    totalCost: "",
  };
}

/** Buang semua non-digit → "Rp 150.000" jadi "150000" */
function stripNonDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Format digit jadi ribuan: "150000" → "150.000" */
function formatDigits(digits: string): string {
  if (!digits) return "";
  const num = Number(digits);
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("id-ID").format(num);
}

/** Parse digit → number atau null kalau kosong */
function parseNumber(digits: string): number | null {
  const trimmed = digits.trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  if (isNaN(num) || !isFinite(num)) return null;
  return num;
}

/** Format tampilan Rupiah untuk preview (dengan presisi kecil) */
function formatRupiahDisplay(n: number): string {
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
// Main
// ============================================================

export function RestockForm() {
  const router = useRouter();

  const formId = React.useId();

  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = React.useState(true);

  const [supplierName, setSupplierName] = React.useState("");
  const [rows, setRows] = React.useState<Row[]>(() => [emptyRow()]);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ---------- Fetch items ----------
  React.useEffect(() => {
    async function loadItems() {
      try {
        setIsLoadingItems(true);
        const res = await fetch(
          "/api/inventory/items?isActive=true&limit=100",
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );
        const json = (await res.json()) as ItemsResponse;

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "Gagal memuat bahan.");
        }

        setItems(json.data.items);

        if (json.data.items.length > 0) {
          const firstId = json.data.items[0].id;
          setRows((prev) =>
            prev.map((r) =>
              r.inventoryItemId === ""
                ? { ...r, inventoryItemId: firstId }
                : r
            )
          );
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat bahan."
        );
      } finally {
        setIsLoadingItems(false);
      }
    }

    void loadItems();
  }, []);

  // ---------- Row operations ----------
  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow(items[0]?.id ?? "")]);
  }

  function removeRow(index: number) {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  // ---------- Computed ----------
  const itemMap = React.useMemo(() => {
    const m = new Map<string, InventoryItem>();
    for (const i of items) m.set(i.id, i);
    return m;
  }, [items]);

  const rowSummaries = React.useMemo(() => {
    return rows.map((r) => {
      const inv = itemMap.get(r.inventoryItemId);
      const qty = parseNumber(r.quantity);
      const cost = parseNumber(r.totalCost);

      const unitCost =
        qty !== null && qty > 0 && cost !== null && cost >= 0
          ? cost / qty
          : null;

      return { inv, qty, cost, unitCost };
    });
  }, [rows, itemMap]);

  const totalValue = rowSummaries.reduce(
    (sum, s) => sum + (s.cost ?? 0),
    0
  );

  const filledRowCount = rowSummaries.filter(
    (s) => s.qty !== null && s.qty > 0 && s.cost !== null && s.cost >= 0
  ).length;

  // ---------- Submit ----------
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError(null);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const s = rowSummaries[i];

      if (!row.inventoryItemId) {
        setError(`Baris #${i + 1}: pilih bahan terlebih dahulu.`);
        return;
      }
      if (s.qty === null || s.qty <= 0) {
        setError(
          `Baris #${i + 1}: quantity wajib diisi dan harus lebih dari 0.`
        );
        return;
      }
      if (s.cost === null) {
        setError(`Baris #${i + 1}: total biaya wajib diisi.`);
        return;
      }
      if (s.cost < 0) {
        setError(`Baris #${i + 1}: total biaya tidak boleh negatif.`);
        return;
      }
    }

    const seen = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
      const id = rows[i].inventoryItemId;
      if (seen.has(id)) {
        const inv = itemMap.get(id);
        setError(
          `Bahan "${inv?.name ?? id}" muncul lebih dari sekali. ` +
            `Gabungkan jadi satu baris atau pisahkan pengiriman.`
        );
        return;
      }
      seen.add(id);
    }

    setLoading(true);

    try {
      // Kirim ke server sebagai NUMBER murni (tanpa format)
      const payload = {
        supplierName: supplierName.trim() || undefined,
        items: rows.map((r) => ({
          inventoryItemId: r.inventoryItemId,
          quantity: Number(stripNonDigits(r.quantity)),
          totalCost: Number(stripNonDigits(r.totalCost)),
        })),
      };

      const res = await fetch("/api/inventory/restocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as BulkResponse;

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Gagal menyimpan restock.");
      }

      router.push("/inventory/restocks");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menyimpan restock."
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------- Render ----------
  return (
    <form onSubmit={handleSubmit} className="w-full">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Penerimaan Barang</CardTitle>
          <CardDescription>
            Catat satu atau beberapa bahan sekaligus. Setiap baris akan
            membuat satu batch baru.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* ============ INFO UMUM ============ */}
          <section className="space-y-5">
            <div>
              <h3 className="text-sm font-medium">Informasi Pengiriman</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Supplier berlaku untuk semua baris di bawah.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={`${formId}-supplier`}>Supplier</Label>
                <Input
                  id={`${formId}-supplier`}
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Contoh: Supplier A"
                  disabled={loading}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">Opsional.</p>
              </div>

              <div className="grid gap-2">
                <Label>Jumlah Baris</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
                  {rows.length} baris
                </div>
              </div>
            </div>
          </section>

          {/* ============ DAFTAR BARIS ============ */}
          <section className="space-y-4 border-t pt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Daftar Bahan</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Tambahkan satu baris untuk setiap jenis bahan.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
                disabled={loading || isLoadingItems}
              >
                <Plus className="mr-2 size-4" />
                Tambah Baris
              </Button>
            </div>

            <div className="space-y-3">
              {rows.map((row, index) => {
                const summary = rowSummaries[index];
                const inv = summary.inv;
                const canRemove = rows.length > 1;

                const itemId = `${formId}-item-${index}`;
                const qtyId = `${formId}-qty-${index}`;
                const costId = `${formId}-cost-${index}`;

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
                      {/* Bahan */}
                      <div className="grid gap-1.5 sm:col-span-4">
                        <Label htmlFor={itemId} className="text-xs">
                          Bahan <span className="text-destructive">*</span>
                        </Label>
                        <select
                          id={itemId}
                          value={row.inventoryItemId}
                          onChange={(e) =>
                            updateRow(index, {
                              inventoryItemId: e.target.value,
                            })
                          }
                          disabled={loading || isLoadingItems}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                        >
                          {isLoadingItems ? (
                            <option value="">Memuat...</option>
                          ) : items.length === 0 ? (
                            <option value="">Belum ada bahan aktif</option>
                          ) : (
                            items.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.name} ({i.unit})
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Quantity — DIGIT MURNI tanpa titik ribuan */}
                      <div className="grid gap-1.5 sm:col-span-3">
                        <Label htmlFor={qtyId} className="text-xs">
                          Quantity{" "}
                          <span className="text-destructive">*</span>
                          {inv && (
                            <span className="ml-1 font-normal text-muted-foreground">
                              ({inv.unit})
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
                          disabled={loading}
                          className="h-9"
                        />
                      </div>

                      {/* Total Biaya — format ribuan + prefix Rp */}
                      <div className="grid gap-1.5 sm:col-span-3">
                        <Label htmlFor={costId} className="text-xs">
                          Total Biaya{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                            Rp
                          </span>
                          <Input
                            id={costId}
                            type="text"
                            inputMode="numeric"
                            value={formatDigits(row.totalCost)}
                            onChange={(e) =>
                              updateRow(index, {
                                totalCost: stripNonDigits(
                                  e.target.value
                                ).slice(0, 15),
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
                            className="h-9 pl-8"
                          />
                        </div>
                      </div>

                      {/* Harga / Unit — preview */}
                      <div className="grid gap-1.5 sm:col-span-2">
                        <Label className="text-xs">Harga / Unit</Label>
                        <div className="flex h-9 items-center rounded-md border bg-muted/40 px-2 text-xs font-medium">
                          {summary.unitCost !== null
                            ? formatRupiahDisplay(summary.unitCost)
                            : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ============ RINGKASAN ============ */}
          <section className="rounded-lg border bg-muted/30 p-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Baris</span>
                <span className="font-medium">{rows.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Baris Terisi</span>
                <span className="font-medium">{filledRowCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Nilai</span>
                <span className="text-base font-bold">
                  {formatRupiahDisplay(totalValue)}
                </span>
              </div>
            </div>
          </section>

          {/* ============ ERROR ============ */}
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
            disabled={loading || isLoadingItems || items.length === 0}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Simpan {rows.length} Baris
          </Button>
        </div>
      </Card>
    </form>
  );
}