"use client";

import * as React from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  AlertTriangle,
  ArrowLeft,
  Pencil,
  RefreshCw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type InventoryItem = {
  id: string;
  name: string;
  type: "SEMI_FINISHED" | "DIRECT_USE";
  unit: "ML" | "PCS";
  isActive: boolean;
};

type BatchStock = {
  id: string;
  quantity: string | number;
  remainingQuantity: string | number;
  createdAt: string;
  updatedAt: string;
};

type Batch = {
  id: string;
  batchCode: string;
  sourceType: "RESTOCK" | "PRODUCTION";
  quantity: string | number;
  remainingQuantity: string | number;
  unitCost: string | number;
  totalCost: string | number;
  createdAt: string;
  updatedAt: string;
  stock: BatchStock | null;
};

type Restock = {
  id: string;
  inventoryItemId: string;
  batchId: string;
  quantity: string | number;
  totalCost: string | number;
  unitCost: string | number;
  supplierName: string | null;
  createdAt: string;
  inventoryItem: InventoryItem;
  batch: Batch;
};

type RestockResponse = {
  success: boolean;
  data?: Restock;
  message?: string;
};

function formatCurrency(value: string | number) {
  const number =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(number)) {
    return "Rp0";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatNumber(value: string | number) {
  const number =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(number);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getTypeLabel(
  type: InventoryItem["type"],
) {
  switch (type) {
    case "SEMI_FINISHED":
      return "Semi Finished";

    case "DIRECT_USE":
      return "Direct Use";
  }
}

function DetailRow({
  label,
  children,
  strong = false,
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b py-4 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-6">
      <div className="text-sm text-muted-foreground">
        {label}
      </div>

      <div
        className={
          strong
            ? "text-sm font-semibold"
            : "text-sm font-medium"
        }
      >
        {children}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <div className="size-9 animate-pulse rounded-md bg-muted" />

        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />

        <div className="rounded-lg border">
          <div className="space-y-4 p-5">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="grid gap-2 sm:grid-cols-[180px_1fr]"
              >
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RestockDetailPage() {
  const params = useParams<{
    id: string;
  }>();

  const id = params.id;

  const [restock, setRestock] =
    React.useState<Restock | null>(null);

  const [isLoading, setIsLoading] =
    React.useState(true);

  const [error, setError] =
    React.useState<string | null>(null);

  const fetchDetail = React.useCallback(
    async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/inventory/restocks/${encodeURIComponent(id)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as RestockResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ??
              "Gagal mengambil detail restock.",
          );
        }

        setRestock(result.data ?? null);
      } catch (error) {
        console.error(
          "[RestockDetailPage] fetch:",
          error,
        );

        setError(
          error instanceof Error
            ? error.message
            : "Gagal mengambil detail restock.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [id],
  );

  React.useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !restock) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-5 text-destructive" />
        </div>

        <h1 className="mt-4 text-sm font-semibold">
          Gagal memuat restock
        </h1>

        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {error ?? "Restock tidak ditemukan."}
        </p>

        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => {
            void fetchDetail();
          }}
        >
          <RefreshCw className="mr-2 size-4" />
          Coba Lagi
        </Button>
      </div>
    );
  }

  const isEditable =
    Number(restock.batch.remainingQuantity) ===
    Number(restock.batch.quantity);

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      {/* Header halaman */}
      <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/inventory/restocks">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Kembali ke restock"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Link>

          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Detail Restock
            </h1>

            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {restock.batch.batchCode}
            </p>
          </div>
        </div>

        {isEditable ? (
          <Link
            href={`/inventory/restocks/${restock.id}/edit`}
          >
            <Button type="button">
              <Pencil className="mr-2 size-4" />
              Edit Restock
            </Button>
          </Link>
        ) : (
          <Badge variant="secondary">
            Batch sudah digunakan
          </Badge>
        )}
      </div>

      {/* Informasi restock */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold">
            Informasi Restock
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Informasi pencatatan barang masuk dan biaya pembelian.
          </p>
        </div>

        <div className="rounded-lg border">
          <div className="px-5">
            <DetailRow
              label="Bahan"
              strong
            >
              {restock.inventoryItem.name}
            </DetailRow>

            <DetailRow label="Tipe Bahan">
              {getTypeLabel(
                restock.inventoryItem.type,
              )}
            </DetailRow>

            <DetailRow label="Supplier">
              {restock.supplierName || "-"}
            </DetailRow>

            <DetailRow label="Quantity">
              {formatNumber(restock.quantity)}{" "}
              {restock.inventoryItem.unit}
            </DetailRow>

            <DetailRow label="Total Cost">
              {formatCurrency(restock.totalCost)}
            </DetailRow>

            <DetailRow
              label="HPP / Unit"
              strong
            >
              <span className="text-base">
                {formatCurrency(restock.unitCost)}
              </span>{" "}
              / {restock.inventoryItem.unit}
            </DetailRow>

            <DetailRow label="Tanggal Restock">
              {formatDate(restock.createdAt)}
            </DetailRow>
          </div>
        </div>
      </section>

      {/* Informasi batch */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold">
            Inventory Batch
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Batch dibuat otomatis dari transaksi restock ini.
          </p>
        </div>

        <div className="rounded-lg border">
          <div className="px-5">
            <DetailRow
              label="Batch Code"
              strong
            >
              <span className="font-mono">
                {restock.batch.batchCode}
              </span>
            </DetailRow>

            <DetailRow label="Sumber">
              {restock.batch.sourceType === "RESTOCK"
                ? "Restock"
                : "Produksi"}
            </DetailRow>

            <DetailRow label="Quantity Awal">
              {formatNumber(
                restock.batch.quantity,
              )}{" "}
              {restock.inventoryItem.unit}
            </DetailRow>

            <DetailRow label="Sisa Quantity">
              {formatNumber(
                restock.batch.remainingQuantity,
              )}{" "}
              {restock.inventoryItem.unit}
            </DetailRow>

            <DetailRow label="HPP / Unit">
              {formatCurrency(
                restock.batch.unitCost,
              )}{" "}
              / {restock.inventoryItem.unit}
            </DetailRow>

            <DetailRow label="Total Cost">
              {formatCurrency(
                restock.batch.totalCost,
              )}
            </DetailRow>

            <DetailRow label="Status">
              {isEditable ? (
                <Badge>
                  Belum digunakan
                </Badge>
              ) : (
                <Badge variant="secondary">
                  Sudah digunakan
                </Badge>
              )}
            </DetailRow>

            <DetailRow label="Dibuat">
              {formatDate(
                restock.batch.createdAt,
              )}
            </DetailRow>
          </div>
        </div>
      </section>
    </div>
  );
}