"use client"

import * as React from "react"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers3,
  RefreshCw,
  Search,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
}

type Batch = {
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
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

type Summary = {
  totalBatches: number
  restockBatches: number
  productionBatches: number
  availableBatches: number
}

type ApiResponse = {
  success: boolean
  data?: Batch[]
  pagination?: Pagination
  summary?: Summary
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

export default function BatchesPage() {
  const [batches, setBatches] = React.useState<Batch[]>([])
  const [pagination, setPagination] =
    React.useState<Pagination>({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    })

  const [summary, setSummary] = React.useState<Summary>({
    totalBatches: 0,
    restockBatches: 0,
    productionBatches: 0,
    availableBatches: 0,
  })

  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] =
    React.useState("")

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPagination((current) => ({
        ...current,
        page: 1,
      }))
    }, 400)

    return () => {
      window.clearTimeout(timer)
    }
  }, [search])

  const fetchBatches = React.useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      const params = new URLSearchParams()

      params.set("page", String(pagination.page))
      params.set("limit", String(pagination.limit))

      if (debouncedSearch) {
        params.set("search", debouncedSearch)
      }

      const response = await fetch(
        `/api/inventory/batches?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        },
      )

      const result: ApiResponse = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengambil data batch.",
        )
      }

      setBatches(result.data ?? [])

      if (result.pagination) {
        setPagination(result.pagination)
      }

      if (result.summary) {
        setSummary(result.summary)
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengambil data batch.",
      )
    } finally {
      setLoading(false)
    }
  }, [
    debouncedSearch,
    pagination.limit,
    pagination.page,
  ])

  React.useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  const canPreviousPage = pagination.page > 1
  const canNextPage =
    pagination.page < pagination.totalPages

  const handlePreviousPage = () => {
    if (!canPreviousPage || loading) {
      return
    }

    setPagination((current) => ({
      ...current,
      page: current.page - 1,
    }))
  }

  const handleNextPage = () => {
    if (!canNextPage || loading) {
      return
    }

    setPagination((current) => ({
      ...current,
      page: current.page + 1,
    }))
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header halaman dibuat ringkas karena fungsi utama halaman ini adalah melihat ledger batch. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Batch
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Daftar batch persediaan yang terbentuk dari restock
            dan produksi.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={fetchBatches}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 size-4 ${
              loading ? "animate-spin" : ""
            }`}
          />
          Refresh
        </Button>
      </div>

      {/* Ringkasan dibuat sederhana supaya fokus tetap pada data batch. */}
      <div className="grid grid-cols-2 divide-x rounded-xl border bg-background sm:grid-cols-4">
        <div className="px-4 py-4">
          <p className="text-xs text-muted-foreground">
            Total Batch
          </p>
          <p className="mt-1 text-xl font-semibold">
            {summary.totalBatches}
          </p>
        </div>

        <div className="px-4 py-4">
          <p className="text-xs text-muted-foreground">
            Restock
          </p>
          <p className="mt-1 text-xl font-semibold">
            {summary.restockBatches}
          </p>
        </div>

        <div className="border-t px-4 py-4 sm:border-t-0">
          <p className="text-xs text-muted-foreground">
            Produksi
          </p>
          <p className="mt-1 text-xl font-semibold">
            {summary.productionBatches}
          </p>
        </div>

        <div className="border-t px-4 py-4 sm:border-t-0">
          <p className="text-xs text-muted-foreground">
            Masih Tersedia
          </p>
          <p className="mt-1 text-xl font-semibold">
            {summary.availableBatches}
          </p>
        </div>
      </div>

      {/* Search hanya melakukan pencarian terhadap batch yang dikembalikan API. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode batch atau bahan..."
            className="pl-9"
          />
        </div>
      </div>

      {error ? (
        <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
          <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-destructive/10">
            <Layers3 className="size-5 text-destructive" />
          </div>

          <h2 className="text-sm font-semibold">
            Gagal memuat batch
          </h2>

          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {error}
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={fetchBatches}
          >
            <RefreshCw className="mr-2 size-4" />
            Coba Lagi
          </Button>
        </div>
      ) : loading ? (
        <div className="overflow-hidden rounded-xl border">
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-6 gap-4 border-b px-5 py-4 last:border-b-0"
              >
                {Array.from({ length: 6 }).map(
                  (_, columnIndex) => (
                    <div
                      key={columnIndex}
                      className="h-5 animate-pulse rounded bg-muted"
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      ) : batches.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
          <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
            <Layers3 className="size-5 text-muted-foreground" />
          </div>

          <h2 className="text-sm font-semibold">
            {debouncedSearch
              ? "Batch tidak ditemukan"
              : "Belum ada batch"}
          </h2>

          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {debouncedSearch
              ? "Coba gunakan kata kunci pencarian yang berbeda."
              : "Batch akan muncul otomatis setelah proses restock atau produksi dibuat."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-background">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">
                      Batch
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">
                      Bahan
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">
                      Sumber
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">
                      Jumlah
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">
                      Sisa
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">
                      HPP / Unit
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">
                      Dibuat
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {batches.map((batch) => {
                    const remainingQuantity = Number(
                      batch.remainingQuantity,
                    )

                    const isEmpty = remainingQuantity <= 0

                    return (
                      <tr
                        key={batch.id}
                        className="border-b last:border-b-0"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-mono text-sm font-medium">
                              {batch.batchCode}
                            </p>

                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {batch.id}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div>
                            <p className="text-sm font-medium">
                              {batch.inventoryItem.name}
                            </p>

                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {batch.inventoryItem.unit}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
                            {getSourceLabel(
                              batch.sourceType,
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right text-sm">
                          {formatNumber(batch.quantity)}{" "}
                          {batch.inventoryItem.unit}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span
                            className={`text-sm font-medium ${
                              isEmpty
                                ? "text-destructive"
                                : ""
                            }`}
                          >
                            {formatNumber(
                              batch.remainingQuantity,
                            )}{" "}
                            {batch.inventoryItem.unit}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right text-sm">
                          {formatCurrency(batch.unitCost)}
                        </td>

                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {formatDate(batch.createdAt)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Button
                            
                            type="button"
                            variant="ghost"
                            size="sm"
                          >
                            <Link
                              href={`/inventory/batches/${batch.id}`}
                            >
                              <Eye className="mr-2 size-4" />
                              Lihat
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer pagination disamakan dengan pola halaman inventory lainnya. */}
          <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Menampilkan{" "}
              <span className="font-medium text-foreground">
                {batches.length}
              </span>{" "}
              dari{" "}
              <span className="font-medium text-foreground">
                {pagination.total}
              </span>{" "}
              batch
            </p>

            <div className="flex items-center gap-4">
              <p>
                Halaman{" "}
                <span className="font-medium text-foreground">
                  {pagination.page}
                </span>{" "}
                /{" "}
                <span className="font-medium text-foreground">
                  {Math.max(pagination.totalPages, 1)}
                </span>
              </p>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousPage}
                  disabled={!canPreviousPage || loading}
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleNextPage}
                  disabled={!canNextPage || loading}
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}