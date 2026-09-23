"use client";

import * as React from "react";
import { Filter, RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

export type ReportFilterValue = {
  productId: string;
  isActive: "all" | "true" | "false";
  dateFrom: string;
  dateTo: string;
};

type ProductOption = {
  id: string;
  name: string;
};

type PresetKey =
  | "today"
  | "7d"
  | "30d"
  | "thisMonth"
  | "lastMonth"
  | "custom";

type ReportFilterProps = {
  value: ReportFilterValue;
  onChange: (value: ReportFilterValue) => void;
  products: ProductOption[];
  onReset?: () => void;
  /** Hide date range (untuk tab snapshot: Master Produk, Analisis Margin) */
  hideDate?: boolean;
  disabled?: boolean;
};

// ============================================================
// Preset helper
// ============================================================

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getPresetRange(preset: PresetKey): { from: string; to: string } {
  const now = new Date();
  const today = formatDateInput(now);

  if (preset === "today") {
    return { from: today, to: today };
  }
  if (preset === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: formatDateInput(d), to: today };
  }
  if (preset === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return { from: formatDateInput(d), to: today };
  }
  if (preset === "thisMonth") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: formatDateInput(from), to: today };
  }
  if (preset === "lastMonth") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: formatDateInput(from), to: formatDateInput(to) };
  }
  return { from: "", to: "" };
}

// ============================================================
// Component
// ============================================================

export function ReportFilter({
  value,
  onChange,
  products,
  onReset,
  hideDate = false,
  disabled = false,
}: ReportFilterProps) {
  const [preset, setPreset] = React.useState<PresetKey>("30d");

  // Init preset → set range saat mount
  React.useEffect(() => {
    if (hideDate) return;
    const range = getPresetRange("30d");
    onChange({
      ...value,
      dateFrom: range.from,
      dateTo: range.to,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideDate]);

  function applyPreset(p: PresetKey) {
    setPreset(p);
    if (p === "custom") return;
    const range = getPresetRange(p);
    onChange({ ...value, dateFrom: range.from, dateTo: range.to });
  }

  function update(patch: Partial<ReportFilterValue>) {
    onChange({ ...value, ...patch });
  }

  function handleReset() {
    setPreset("30d");
    const range = getPresetRange("30d");
    const resetValue: ReportFilterValue = {
      productId: "",
      isActive: "all",
      dateFrom: hideDate ? "" : range.from,
      dateTo: hideDate ? "" : range.to,
    };
    onChange(resetValue);
    onReset?.();
  }

  const isFiltered =
    value.productId !== "" ||
    value.isActive !== "all" ||
    (!hideDate && (value.dateFrom !== "" || value.dateTo !== ""));

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter</span>
          {isFiltered && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Aktif
            </span>
          )}
        </div>

        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={disabled}
          >
            <X className="mr-1 size-3.5" />
            Reset
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Produk */}
        <div className="grid gap-1.5">
          <Label htmlFor="rf-product" className="text-xs">
            Produk
          </Label>
          <select
            id="rf-product"
            value={value.productId}
            onChange={(e) => update({ productId: e.target.value })}
            disabled={disabled}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <option value="">Semua Produk</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="grid gap-1.5">
          <Label htmlFor="rf-status" className="text-xs">
            Status
          </Label>
          <select
            id="rf-status"
            value={value.isActive}
            onChange={(e) =>
              update({
                isActive: e.target.value as "all" | "true" | "false",
              })
            }
            disabled={disabled}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <option value="all">Semua Status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        </div>

        {/* Preset (kalau ada date filter) */}
        {!hideDate && (
          <div className="grid gap-1.5 sm:col-span-2 lg:col-span-2">
            <Label className="text-xs">Preset Periode</Label>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["today", "Hari Ini"],
                  ["7d", "7 Hari"],
                  ["30d", "30 Hari"],
                  ["thisMonth", "Bulan Ini"],
                  ["lastMonth", "Bulan Lalu"],
                  ["custom", "Custom"],
                ] as Array<[PresetKey, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  disabled={disabled}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    preset === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input bg-background text-muted-foreground hover:bg-muted",
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date From / To (kalau custom atau preset apapun, tetap tampil) */}
        {!hideDate && (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="rf-from" className="text-xs">
                Dari
              </Label>
              <Input
                id="rf-from"
                type="date"
                value={value.dateFrom}
                onChange={(e) => {
                  setPreset("custom");
                  update({ dateFrom: e.target.value });
                }}
                disabled={disabled}
                className="h-9"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="rf-to" className="text-xs">
                Sampai
              </Label>
              <Input
                id="rf-to"
                type="date"
                value={value.dateTo}
                onChange={(e) => {
                  setPreset("custom");
                  update({ dateTo: e.target.value });
                }}
                disabled={disabled}
                className="h-9"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Helper untuk formatting label filter (dipakai di export)
// ============================================================

export function formatFilterLabels(
  value: ReportFilterValue,
  products: ProductOption[],
  hideDate: boolean
): {
  product: string;
  status: string;
  period: string;
} {
  const productLabel = value.productId
    ? (products.find((p) => p.id === value.productId)?.name ?? "—")
    : "Semua Produk";

  const statusLabel =
    value.isActive === "all"
      ? "Semua Status"
      : value.isActive === "true"
        ? "Aktif"
        : "Nonaktif";

  const periodLabel = hideDate
    ? "Snapshot (tanpa periode)"
    : value.dateFrom && value.dateTo
      ? `${value.dateFrom} — ${value.dateTo}`
      : value.dateFrom
        ? `≥ ${value.dateFrom}`
        : value.dateTo
          ? `≤ ${value.dateTo}`
          : "Semua Periode";

  return {
    product: productLabel,
    status: statusLabel,
    period: periodLabel,
  };
}

export { getPresetRange };