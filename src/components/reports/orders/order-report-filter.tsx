"use client";

import * as React from "react";
import { Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type OrderReportFilterValue = {
  status: string;
  channel: "all" | "ONLINE" | "OFFLINE";
  paymentMethodCode: string;
  baristaId: string;
  search: string;
  dateFrom: string;
  dateTo: string;
};

type Option = { value: string; label: string };

type Props = {
  value: OrderReportFilterValue;
  onChange: (v: OrderReportFilterValue) => void;
  paymentMethods: Option[];
  baristas: Option[];
  disabled?: boolean;
};

type PresetKey = "today" | "7d" | "30d" | "thisMonth" | "lastMonth" | "custom";

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getPreset(p: PresetKey): { from: string; to: string } {
  const now = new Date();
  const today = fmt(now);
  if (p === "today") return { from: today, to: today };
  if (p === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: fmt(d), to: today };
  }
  if (p === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return { from: fmt(d), to: today };
  }
  if (p === "thisMonth") {
    return {
      from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: today,
    };
  }
  if (p === "lastMonth") {
    return {
      from: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: fmt(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  return { from: "", to: "" };
}

export function OrderReportFilter({
  value,
  onChange,
  paymentMethods,
  baristas,
  disabled,
}: Props) {
  const [preset, setPreset] = React.useState<PresetKey>("30d");

  React.useEffect(() => {
    const range = getPreset("30d");
    onChange({ ...value, dateFrom: range.from, dateTo: range.to });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyPreset(p: PresetKey) {
    setPreset(p);
    if (p === "custom") return;
    const range = getPreset(p);
    onChange({ ...value, dateFrom: range.from, dateTo: range.to });
  }

  function update(patch: Partial<OrderReportFilterValue>) {
    onChange({ ...value, ...patch });
  }

  function handleReset() {
    setPreset("30d");
    const range = getPreset("30d");
    onChange({
      status: "all",
      channel: "all",
      paymentMethodCode: "",
      baristaId: "",
      search: "",
      dateFrom: range.from,
      dateTo: range.to,
    });
  }

  const isFiltered =
    value.status !== "all" ||
    value.channel !== "all" ||
    value.paymentMethodCode !== "" ||
    value.baristaId !== "" ||
    value.search !== "";

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter</span>
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
        <div className="grid gap-1.5">
          <Label className="text-xs">Status</Label>
          <select
            value={value.status}
            onChange={(e) => update({ status: e.target.value })}
            disabled={disabled}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <option value="all">Semua Status</option>
            <option value="COMPLETED">Selesai</option>
            <option value="CANCELLED">Dibatalkan</option>
            <option value="PENDING">Pending</option>
            <option value="SEARCHING">Cari Barista</option>
            <option value="ASSIGNED">Ditugaskan</option>
            <option value="ACCEPTED">Diterima</option>
            <option value="DELIVERING">Diantar</option>
            <option value="ARRIVED">Sampai</option>
            <option value="FAILED">Gagal</option>
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs">Channel</Label>
          <select
            value={value.channel}
            onChange={(e) =>
              update({ channel: e.target.value as "all" | "ONLINE" | "OFFLINE" })
            }
            disabled={disabled}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <option value="all">Semua Channel</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs">Payment Method</Label>
          <select
            value={value.paymentMethodCode}
            onChange={(e) => update({ paymentMethodCode: e.target.value })}
            disabled={disabled}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <option value="">Semua Method</option>
            {paymentMethods.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs">Barista</Label>
          <select
            value={value.baristaId}
            onChange={(e) => update({ baristaId: e.target.value })}
            disabled={disabled}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <option value="">Semua Barista</option>
            {baristas.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <Label className="text-xs">Cari</Label>
          <Input
            value={value.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Order #, nama customer, telepon..."
            disabled={disabled}
            className="h-9"
          />
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
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
                    : "border-input bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs">Dari</Label>
          <Input
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
          <Label className="text-xs">Sampai</Label>
          <Input
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
      </div>
    </div>
  );
}