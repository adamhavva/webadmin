"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Database,
  Layers3,
  Package,
  RefreshCw,
  Warehouse,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"

type BatchSourceType = "RESTOCK" | "PRODUCTION"

type InventoryItem = {
  id: string
  name: string
  type: "SEMI_FINISHED" | "DIRECT_USE"
  unit: "ML" | "PCS"
}

type BatchStock = {
  id: string
  quantity: string | number
  remainingQuantity: string | number
  createdAt: string
  updatedAt: string
}

type Restock = {
  id: string
  quantity: string | number
  totalCost: string | number
  unitCost: string | number
  supplierName: string | null
  createdAt: string
}

type Production = {
  id: string
  outputQuantity: string | number
  totalCost: string | number
  unitCost: string | number
  createdAt: string
}

type BatchDetail = {
  id: string
  batchCode: string
  sourceType: BatchSourceType
  quantity: string | number
  remainingQuantity: string | number
  unitCost: string | number
  totalCost: string | number
  createdAt: string
  updatedAt: string
  inventoryItem: InventoryItem
  stock: BatchStock | null
  restock: Restock | null
  production: Production | null
}

type ApiResponse = {
  success: boolean
  data?: BatchDetail
  message?: string
}

function formatNumber(value: string | number) {
  const number = Number(value)

  if (Number.isNaN(number)) {
    return "-"
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(number)
}

function formatCurrency(value: string | number) {
  const number = Number(value)

  if (Number.isNaN(number)) {
    return "-"
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number)
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function getSourceLabel(sourceType: BatchSourceType) {
  return sourceType === "RESTOCK" ? "Restock" : "Produksi"
}

function getItemTypeLabel(type: InventoryItem["type"]) {
  return type === "SEMI_FINISHED" ? "Semi Finished" : "Direct Use"
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-6 border-b border-border/60 py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>

      <div className="text-right text-sm font-medium">
        {children}
      </div>
    </div>
  )
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
        <Icon className="size-4 text-muted-foreground" />
      </div>

      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{title}</h2>

        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function InventoryItemDialog({
  item,
  open,
  onClose,
}: {
  item: InventoryItem
  open: boolean
  onClose: () => void
}) {
  React.useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-item-dialog-title"
        className="w-full max-w-lg overflow-hidden rounded-xl border bg-background shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <div className="mb-2 flex size-9 items-center justify-center rounded-lg border bg-muted/30">
              <Package className="size-4 text-muted-foreground" />
            </div>

            <h2
              id="inventory-item-dialog-title"
              className="text-base font-semibold"
            >
              Detail Bahan
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Informasi inventory item yang terkait dengan batch ini.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="px-5 py-2">
          <DetailRow label="Nama Bahan">
            {item.name}
          </DetailRow>

          <DetailRow label="Jenis">
            {getItemTypeLabel(item.type)}
          </DetailRow>

          <DetailRow label="Satuan">
            {item.unit}
          </DetailRow>

        </div>

        <div className="flex justify-end border-t px-5 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function BatchDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [batch, setBatch] = React.useState<BatchDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [inventoryDialogOpen, setInventoryDialogOpen] = React.useState(false)

  const batchId = params.id

  const fetchBatch = React.useCallback(async () => {
    if (!batchId) {
      return
    }

    try {
      setLoading(true)
      setError("")

      const response = await fetch(`/api/inventory/batches/${batchId}`, {
        method: "GET",
        cache: "no-store",
      })

      const result: ApiResponse = await response.json()

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.message || "Gagal mengambil detail batch.",
        )
      }

      setBatch(result.data)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengambil detail batch.",
      )
    } finally {
      setLoading(false)
    }
  }, [batchId])

  React.useEffect(() => {
    fetchBatch()
  }, [fetchBatch])

  const closeInventoryDialog = React.useCallback(() => {
    setInventoryDialogOpen(false)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
          <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
        </div>

        <div className="h-32 animate-pulse rounded-xl border bg-muted/20" />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl border bg-muted/20" />
          <div className="h-64 animate-pulse rounded-xl border bg-muted/20" />
        </div>
      </div>
    )
  }

  if (error || !batch) {
    return (
      <div className="space-y-6 p-6">
        <Button
          type="button"
          variant="ghost"
          className="-ml-2"
          onClick={() => router.push("/inventory/batches")}
        >
          <ArrowLeft className="mr-2 size-4" />
          Kembali ke Batch
        </Button>

        <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
          <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-destructive/10">
            <Layers3 className="size-5 text-destructive" />
          </div>

          <h2 className="text-sm font-semibold">
            Gagal memuat detail batch
          </h2>

          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {error || "Data batch tidak ditemukan."}
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={fetchBatch}
          >
            <RefreshCw className="mr-2 size-4" />
            Coba Lagi
          </Button>
        </div>
      </div>
    )
  }

  const initialQuantity = Number(batch.quantity)
  const remainingQuantity = Number(batch.remainingQuantity)
  const usedQuantity = Math.max(
    initialQuantity - remainingQuantity,
    0,
  )

  const usagePercentage =
    initialQuantity > 0
      ? Math.min((usedQuantity / initialQuantity) * 100, 100)
      : 0

  const isEmpty = remainingQuantity <= 0
  const isPartiallyUsed =
    remainingQuantity > 0 &&
    remainingQuantity < initialQuantity

  return (
    <>
      <div className="space-y-6 p-6">
        {/* Header hanya menyediakan navigasi kembali dan refresh karena batch bersifat read-only. */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => router.push("/inventory/batches")}
            >
              <ArrowLeft className="size-4" />
              <span className="sr-only">
                Kembali ke Batch
              </span>
            </Button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">
                  {batch.batchCode}
                </h1>

                <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium">
                  {getSourceLabel(batch.sourceType)}
                </span>

                {isEmpty ? (
                  <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/5 px-2.5 py-1 text-xs font-medium text-destructive">
                    Habis
                  </span>
                ) : isPartiallyUsed ? (
                  <span className="inline-flex items-center rounded-full border bg-muted px-2.5 py-1 text-xs font-medium">
                    Sebagian Terpakai
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border bg-muted px-2.5 py-1 text-xs font-medium">
                    Belum Terpakai
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                Detail batch persediaan dan sumber pembentukannya.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={fetchBatch}
            className="self-start sm:self-auto"
          >
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </div>

        {/* Inventory item ditampilkan sebagai relasi yang bisa membuka popup detail. */}
        <section className="rounded-xl border bg-background">
          <div className="border-b px-5 py-4">
            <SectionTitle
              icon={Package}
              title="Bahan"
              description="Inventory item yang menjadi sumber batch ini."
            />
          </div>

          <div className="grid gap-0 divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <div className="px-5">
              <DetailRow label="Nama Bahan">
                <button
                  type="button"
                  onClick={() => setInventoryDialogOpen(true)}
                  className="inline-flex items-center gap-1.5 text-right font-medium underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
                >
                  {batch.inventoryItem.name}
                  <ArrowUpRight className="size-3.5" />
                </button>
              </DetailRow>

              <DetailRow label="Jenis">
                {getItemTypeLabel(batch.inventoryItem.type)}
              </DetailRow>
            </div>

            <div className="px-5">
              <DetailRow label="Satuan">
                {batch.inventoryItem.unit}
              </DetailRow>

              <DetailRow label="Inventory ID">
                <button
                  type="button"
                  onClick={() => setInventoryDialogOpen(true)}
                  className="inline-flex max-w-56 items-center gap-1.5 text-right font-mono text-xs text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 hover:text-primary hover:decoration-primary"
                >
                  <span className="truncate">
                    {batch.inventoryItem.id}
                  </span>

                  <ArrowUpRight className="size-3.5 shrink-0" />
                </button>
              </DetailRow>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Informasi batch berisi data historis yang tidak diedit dari halaman ini. */}
          <section className="rounded-xl border bg-background">
            <div className="border-b px-5 py-4">
              <SectionTitle
                icon={Database}
                title="Informasi Batch"
                description="Identitas dan nilai biaya batch."
              />
            </div>

            <div className="px-5">
              <DetailRow label="Batch ID">
                <span className="max-w-56 break-all font-mono text-xs text-muted-foreground">
                  {batch.id}
                </span>
              </DetailRow>

              <DetailRow label="Kode Batch">
                <span className="font-mono">
                  {batch.batchCode}
                </span>
              </DetailRow>

              <DetailRow label="Sumber">
                {getSourceLabel(batch.sourceType)}
              </DetailRow>

              <DetailRow label="Jumlah Awal">
                {formatNumber(batch.quantity)}{" "}
                {batch.inventoryItem.unit}
              </DetailRow>

              <DetailRow label="HPP / Unit">
                {formatCurrency(batch.unitCost)}
              </DetailRow>

              <DetailRow label="Total HPP">
                {formatCurrency(batch.totalCost)}
              </DetailRow>

              <DetailRow label="Dibuat">
                {formatDate(batch.createdAt)}
              </DetailRow>

              <DetailRow label="Terakhir Diperbarui">
                {formatDate(batch.updatedAt)}
              </DetailRow>
            </div>
          </section>

          {/* Stok batch dipisahkan supaya posisi quantity mudah dibaca. */}
          <section className="rounded-xl border bg-background">
            <div className="border-b px-5 py-4">
              <SectionTitle
                icon={Warehouse}
                title="Stok Batch"
                description="Posisi quantity batch saat ini."
              />
            </div>

            <div className="px-5">
              <DetailRow label="Jumlah Awal">
                {formatNumber(initialQuantity)}{" "}
                {batch.inventoryItem.unit}
              </DetailRow>

              <DetailRow label="Sudah Terpakai">
                {formatNumber(usedQuantity)}{" "}
                {batch.inventoryItem.unit}
              </DetailRow>

              <DetailRow label="Sisa Stok">
                <span
                  className={
                    isEmpty
                      ? "font-semibold text-destructive"
                      : "font-semibold"
                  }
                >
                  {formatNumber(remainingQuantity)}{" "}
                  {batch.inventoryItem.unit}
                </span>
              </DetailRow>

              <DetailRow label="Pemakaian">
                {formatNumber(usagePercentage)}%
              </DetailRow>

              {batch.stock ? (
                <DetailRow label="Stock Record ID">
                  <span className="max-w-56 break-all font-mono text-xs text-muted-foreground">
                    {batch.stock.id}
                  </span>
                </DetailRow>
              ) : null}

              <div className="py-4">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Terpakai</span>
                  <span>
                    {formatNumber(usagePercentage)}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground transition-all"
                    style={{
                      width: `${usagePercentage}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Record sumber ditampilkan sebagai referensi historis batch. */}
        <section className="rounded-xl border bg-background">
          <div className="border-b px-5 py-4">
            <SectionTitle
              icon={CalendarDays}
              title="Sumber Batch"
              description="Record yang membuat batch ini."
            />
          </div>

          <div className="px-5">
            {batch.sourceType === "RESTOCK" &&
            batch.restock ? (
              <>
                <DetailRow label="Restock ID">
                  <Link
                    href={`/inventory/restocks/${batch.restock.id}`}
                    className="inline-flex items-center gap-1.5 text-foreground underline decoration-muted-foreground/40 underline-offset-4 hover:text-primary hover:decoration-primary"
                  >
                    <span className="font-mono text-xs">
                      {batch.restock.id}
                    </span>

                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </DetailRow>

                <DetailRow label="Supplier">
                  {batch.restock.supplierName || "-"}
                </DetailRow>

                <DetailRow label="Quantity Restock">
                  {formatNumber(batch.restock.quantity)}{" "}
                  {batch.inventoryItem.unit}
                </DetailRow>

                <DetailRow label="Total Cost">
                  {formatCurrency(batch.restock.totalCost)}
                </DetailRow>

                <DetailRow label="Unit Cost">
                  {formatCurrency(batch.restock.unitCost)}
                </DetailRow>

                <DetailRow label="Tanggal Restock">
                  {formatDate(batch.restock.createdAt)}
                </DetailRow>

                <div className="flex justify-end py-4">
                  <Button
                    
                    variant="outline"
                    size="sm"
                  >
                    <Link
                      href={`/inventory/restocks/${batch.restock.id}`}
                    >
                      Lihat Detail Restock
                      <ArrowUpRight className="ml-1 size-4" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : null}

            {batch.sourceType === "PRODUCTION" &&
            batch.production ? (
              <>
                <DetailRow label="Production ID">
                  <Link
                    href={`/inventory/production/${batch.production.id}`}
                    className="inline-flex items-center gap-1.5 text-foreground underline decoration-muted-foreground/40 underline-offset-4 hover:text-primary hover:decoration-primary"
                  >
                    <span className="font-mono text-xs">
                      {batch.production.id}
                    </span>

                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </DetailRow>

                <DetailRow label="Output">
                  {formatNumber(
                    batch.production.outputQuantity,
                  )}{" "}
                  {batch.inventoryItem.unit}
                </DetailRow>

                <DetailRow label="Total Cost">
                  {formatCurrency(
                    batch.production.totalCost,
                  )}
                </DetailRow>

                <DetailRow label="Unit Cost">
                  {formatCurrency(
                    batch.production.unitCost,
                  )}
                </DetailRow>

                <DetailRow label="Tanggal Produksi">
                  {formatDate(batch.production.createdAt)}
                </DetailRow>

                <div className="flex justify-end py-4">
                  <Button
                    
                    variant="outline"
                    size="sm"
                  >
                    <Link
                      href={`/inventory/production/${batch.production.id}`}
                    >
                      Lihat Detail Produksi
                      <ArrowUpRight className="ml-1 size-4" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : null}

            {!batch.restock && !batch.production ? (
              <div className="py-6 text-sm text-muted-foreground">
                Data sumber batch tidak tersedia.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <InventoryItemDialog
        item={batch.inventoryItem}
        open={inventoryDialogOpen}
        onClose={closeInventoryDialog}
      />
    </>
  )
}