"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Loader2,
  Save,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type InventoryItemType =
  | "SEMI_FINISHED"
  | "DIRECT_USE"

type InventoryUnit =
  | "ML"
  | "PCS"

type InventoryItem = {
  id: string
  name: string
  type: InventoryItemType
  unit: InventoryUnit
  isActive: boolean
}

type InventoryBatch = {
  id: string
  batchCode: string
  sourceType: "RESTOCK" | "PRODUCTION"
  quantity: string | number
  remainingQuantity: string | number
  unitCost: string | number
  totalCost: string | number
  createdAt: string
}

type Restock = {
  id: string
  inventoryItemId: string
  batchId: string
  quantity: string | number
  totalCost: string | number
  unitCost: string | number
  supplierName: string | null
  createdAt: string
  inventoryItem: InventoryItem
  batch: InventoryBatch
}

type RestockResponse = {
  success: boolean
  data?: Restock
  message?: string
}

type UpdateRestockResponse = {
  success: boolean
  data?: Restock
  message?: string
}

/*
  Menampilkan nama tipe inventory agar lebih mudah dibaca.
*/
function getTypeLabel(type: InventoryItemType) {
  switch (type) {
    case "SEMI_FINISHED":
      return "Semi Finished"

    case "DIRECT_USE":
      return "Direct Use"
  }
}

/*
  Menampilkan satuan inventory.
*/
function getUnitLabel(unit: InventoryUnit) {
  switch (unit) {
    case "ML":
      return "ML"

    case "PCS":
      return "PCS"
  }
}

/*
  Mengubah nilai menjadi angka yang aman digunakan untuk
  perhitungan form.
*/
function toNumber(value: string | number | null | undefined) {
  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}

/*
  Memformat angka untuk ditampilkan sebagai nilai HPP.
*/
function formatNumber(value: string | number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(toNumber(value))
}

/*
  Memformat nominal Rupiah.
*/
function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(toNumber(value))
}

function PageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="animate-pulse space-y-2">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-4 w-80 rounded bg-muted" />
      </div>

      <Card>
        <CardHeader>
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="h-10 animate-pulse rounded bg-muted" />
          <div className="h-10 animate-pulse rounded bg-muted" />
          <div className="h-10 animate-pulse rounded bg-muted" />
          <div className="h-10 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-5 text-destructive" />
        </div>

        <h2 className="mt-4 text-sm font-semibold">
          Gagal memuat Restock
        </h2>

        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {message}
        </p>

        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={onRetry}
        >
          Coba Lagi
        </Button>
      </div>
    </div>
  )
}

export default function EditRestockPage() {
  const params = useParams()
  const router = useRouter()

  const restockId =
    typeof params.id === "string"
      ? params.id
      : ""

  const [restock, setRestock] =
    React.useState<Restock | null>(null)

  const [quantity, setQuantity] =
    React.useState("")

  const [totalCost, setTotalCost] =
    React.useState("")

  const [supplierName, setSupplierName] =
    React.useState("")

  const [isLoading, setIsLoading] =
    React.useState(true)

  const [isSubmitting, setIsSubmitting] =
    React.useState(false)

  const [error, setError] =
    React.useState<string | null>(null)

  const [success, setSuccess] =
    React.useState<string | null>(null)

  /*
    Mengambil data Restock berdasarkan ID dari URL.
  */
  const loadRestock = React.useCallback(async () => {
    if (!restockId) {
      setError("ID Restock tidak ditemukan.")
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(
        `/api/inventory/restocks/${encodeURIComponent(
          restockId,
        )}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        },
      )

      const result =
        (await response.json()) as RestockResponse

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.message ??
            "Gagal mengambil data Restock.",
        )
      }

      const data = result.data

      /*
        Restock hanya aman diedit ketika belum ada
        sebagian stok yang terpakai.

        Jika remainingQuantity berbeda dengan quantity awal,
        berarti sebagian stok sudah digunakan sehingga
        data historis batch tidak boleh diubah sembarangan.
      */
      const originalQuantity =
        toNumber(data.batch.quantity)

      const remainingQuantity =
        toNumber(data.batch.remainingQuantity)

      if (remainingQuantity !== originalQuantity) {
        throw new Error(
          "Restock tidak dapat diedit karena sebagian stok dari batch ini sudah digunakan.",
        )
      }

      setRestock(data)

      setQuantity(
        String(data.quantity),
      )

      setTotalCost(
        String(data.totalCost),
      )

      setSupplierName(
        data.supplierName ?? "",
      )
    } catch (error) {
      console.error(
        "[EditRestockPage] load restock:",
        error,
      )

      setError(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data Restock.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [restockId])

  React.useEffect(() => {
    void loadRestock()
  }, [loadRestock])

  /*
    HPP per unit dihitung dari total cost dibagi quantity.
    Nilai ini hanya preview di halaman edit.
  */
  const calculatedUnitCost = React.useMemo(() => {
    const quantityValue = Number(quantity)
    const totalCostValue = Number(totalCost)

    if (
      !Number.isFinite(quantityValue) ||
      !Number.isFinite(totalCostValue) ||
      quantityValue <= 0
    ) {
      return 0
    }

    return totalCostValue / quantityValue
  }, [quantity, totalCost])

  /*
    Validasi sederhana sebelum data dikirim ke backend.
  */
  const validationMessage = React.useMemo(() => {
    const quantityValue = Number(quantity)
    const totalCostValue = Number(totalCost)

    if (!quantity.trim()) {
      return "Quantity wajib diisi."
    }

    if (
      !Number.isFinite(quantityValue) ||
      quantityValue <= 0
    ) {
      return "Quantity harus lebih besar dari 0."
    }

    if (!totalCost.trim()) {
      return "Total cost wajib diisi."
    }

    if (
      !Number.isFinite(totalCostValue) ||
      totalCostValue < 0
    ) {
      return "Total cost tidak valid."
    }

    return null
  }, [quantity, totalCost])

  /*
    Menyimpan perubahan Restock.
  */
  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!restock || isSubmitting) {
      return
    }

    if (validationMessage) {
      setError(validationMessage)
      setSuccess(null)
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      setSuccess(null)

      const response = await fetch(
        `/api/inventory/restocks/${encodeURIComponent(
          restock.id,
        )}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            /*
              inventoryItemId tetap dikirim sesuai data awal.
              User tidak dapat mengubah bahan dari halaman ini.
            */
            inventoryItemId:
              restock.inventoryItemId,

            quantity: Number(quantity),
            totalCost: Number(totalCost),
            supplierName:
              supplierName.trim() || null,
          }),
        },
      )

      const result =
        (await response.json()) as UpdateRestockResponse

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ??
            "Gagal memperbarui Restock.",
        )
      }

      setSuccess(
        "Restock berhasil diperbarui.",
      )

      /*
        Setelah berhasil disimpan, kembali ke halaman
        detail Restock agar user melihat data terbaru.
      */
      window.setTimeout(() => {
        router.push(
          `/inventory/restocks/${encodeURIComponent(
            restock.id,
          )}`,
        )
        router.refresh()
      }, 700)
    } catch (error) {
      console.error(
        "[EditRestockPage] update restock:",
        error,
      )

      setError(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui Restock.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <PageSkeleton />
  }

  if (error && !restock) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          void loadRestock()
        }}
      />
    )
  }

  if (!restock) {
    return (
      <ErrorState
        message="Data Restock tidak ditemukan."
        onRetry={() => {
          void loadRestock()
        }}
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
          >
            <Link
              href={`/inventory/restocks/${encodeURIComponent(
                restock.id,
              )}`}
              aria-label="Kembali ke detail Restock"
            >
              <ArrowLeft className="size-4" />
            </Link>
          </Button>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Edit Restock
            </h1>

            <p className="text-sm text-muted-foreground">
              Perbarui data Restock yang belum digunakan.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />

            <div className="min-w-0">
              <p className="text-sm font-medium text-destructive">
                Gagal menyimpan perubahan
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {error}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/10">
              <Check className="size-4 text-emerald-600" />
            </div>

            <p className="text-sm font-medium">
              {success}
            </p>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Informasi Restock</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inventoryItem">
                  Bahan
                </Label>

                <select
                  id="inventoryItem"
                  value={restock.inventoryItemId}
                  disabled
                  className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-100"
                >
                  <option value={restock.inventoryItemId}>
                    {restock.inventoryItem.name}
                  </option>
                </select>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {getTypeLabel(
                      restock.inventoryItem.type,
                    )}
                  </Badge>

                  <Badge variant="outline">
                    {getUnitLabel(
                      restock.inventoryItem.unit,
                    )}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  Bahan tidak dapat diubah pada Restock.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="batchCode">
                  Batch
                </Label>

                <Input
                  id="batchCode"
                  value={restock.batch.batchCode}
                  disabled
                  className="bg-muted opacity-100"
                />

                <p className="text-xs text-muted-foreground">
                  Batch dibuat otomatis oleh sistem dan
                  tidak dapat diubah.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity
                </Label>

                <div className="relative">
                  <Input
                    id="quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(event.target.value)
                    }
                    disabled={isSubmitting}
                    placeholder="Masukkan quantity"
                    className="pr-14"
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {getUnitLabel(
                      restock.inventoryItem.unit,
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalCost">
                  Total Cost
                </Label>

                <Input
                  id="totalCost"
                  type="number"
                  min="0"
                  step="1"
                  value={totalCost}
                  onChange={(event) =>
                    setTotalCost(event.target.value)
                  }
                  disabled={isSubmitting}
                  placeholder="Masukkan total cost"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplierName">
                  Supplier
                </Label>

                <Input
                  id="supplierName"
                  value={supplierName}
                  onChange={(event) =>
                    setSupplierName(event.target.value)
                  }
                  disabled={isSubmitting}
                  placeholder="Nama supplier"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitCost">
                  HPP / Unit
                </Label>

                <Input
                  id="unitCost"
                  value={
                    calculatedUnitCost > 0
                      ? formatCurrency(
                          calculatedUnitCost,
                        )
                      : "-"
                  }
                  disabled
                  className="bg-muted opacity-100"
                />

                <p className="text-xs text-muted-foreground">
                  Dihitung otomatis dari total cost ÷
                  quantity.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Perubahan</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">
                  Quantity
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {quantity
                    ? `${formatNumber(quantity)} ${getUnitLabel(
                        restock.inventoryItem.unit,
                      )}`
                    : "-"}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">
                  Total Cost
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {totalCost
                    ? formatCurrency(totalCost)
                    : "-"}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">
                  HPP / Unit
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {calculatedUnitCost > 0
                    ? formatCurrency(
                        calculatedUnitCost,
                      )
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
          >
            <Link
              href={`/inventory/restocks/${encodeURIComponent(
                restock.id,
              )}`}
            >
              Batal
            </Link>
          </Button>

          <Button
            type="submit"
            disabled={
              isSubmitting ||
              Boolean(validationMessage)
            }
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}

            {isSubmitting
              ? "Menyimpan..."
              : "Simpan Perubahan"}
          </Button>
        </div>
      </form>
    </div>
  )
}