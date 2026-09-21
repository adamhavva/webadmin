"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Loader2,
  PackagePlus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
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

type InventoryItemsResponse = {
  success: boolean
  data?: InventoryItem[]
  message?: string
}

type RestockResponse = {
  success: boolean
  data?: {
    id: string
    inventoryItemId: string
    batchId: string
    quantity: string
    totalCost: string
    unitCost: string
    supplierName: string | null
    batch: {
      id: string
      batchCode: string
      sourceType: "RESTOCK"
      quantity: string
      remainingQuantity: string
      unitCost: string
      totalCost: string
    }
  }
  message?: string
}

function formatRupiah(value: number) {
  if (!Number.isFinite(value)) {
    return "Rp0"
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

function getUnitLabel(unit: InventoryUnit) {
  return unit === "ML" ? "ml" : "pcs"
}

function getTypeLabel(type: InventoryItemType) {
  return type === "SEMI_FINISHED"
    ? "Semi Finished"
    : "Direct Use"
}

export default function NewRestockPage() {
  const router = useRouter()

  const [items, setItems] = React.useState<InventoryItem[]>([])
  const [inventoryItemId, setInventoryItemId] =
    React.useState("")

  const [quantity, setQuantity] = React.useState("")
  const [totalCost, setTotalCost] = React.useState("")
  const [supplierName, setSupplierName] = React.useState("")

  const [isLoadingItems, setIsLoadingItems] =
    React.useState(true)

  const [isSubmitting, setIsSubmitting] =
    React.useState(false)

  const [error, setError] =
    React.useState<string | null>(null)

  const selectedItem = React.useMemo(() => {
    return items.find(
      (item) => item.id === inventoryItemId,
    )
  }, [items, inventoryItemId])

  const quantityNumber = Number(quantity)
  const totalCostNumber = Number(totalCost)

  const estimatedUnitCost =
    quantityNumber > 0 && totalCostNumber >= 0
      ? totalCostNumber / quantityNumber
      : 0

  /*
    Mengambil semua inventory item aktif.

    Restock tidak dibatasi berdasarkan type.
    Karena SEMI_FINISHED seperti Espresso juga
    dapat masuk melalui Restock ketika stoknya
    diperoleh dari supplier atau sumber eksternal.
  */
  const fetchItems = React.useCallback(
    async () => {
      try {
        setIsLoadingItems(true)
        setError(null)

        const params = new URLSearchParams()

        params.set("isActive", "true")
        params.set("limit", "100")

        const response = await fetch(
          `/api/inventory/items?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          },
        )

        const result =
          (await response.json()) as InventoryItemsResponse

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ??
              "Gagal mengambil daftar bahan.",
          )
        }

        setItems(result.data ?? [])
      } catch (error) {
        console.error(
          "[NewRestockPage] fetch inventory items:",
          error,
        )

        setError(
          error instanceof Error
            ? error.message
            : "Gagal mengambil daftar bahan.",
        )
      } finally {
        setIsLoadingItems(false)
      }
    },
    [],
  )

  React.useEffect(() => {
    void fetchItems()
  }, [fetchItems])

  /*
    Mengirim data Restock ke backend.

    Quantity dan total cost menjadi sumber perhitungan
    unit cost. Batch dibuat otomatis oleh backend.
  */
  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setError(null)

    if (!inventoryItemId) {
      setError("Pilih bahan terlebih dahulu.")
      return
    }

    if (
      !Number.isFinite(quantityNumber) ||
      quantityNumber <= 0
    ) {
      setError("Quantity harus lebih dari 0.")
      return
    }

    if (
      !Number.isFinite(totalCostNumber) ||
      totalCostNumber < 0
    ) {
      setError("Total harga tidak valid.")
      return
    }

    try {
      setIsSubmitting(true)

      const response = await fetch(
        "/api/inventory/restocks",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            inventoryItemId,
            quantity: quantityNumber,
            totalCost: totalCostNumber,
            supplierName:
              supplierName.trim() || null,
          }),
        },
      )

      const result =
        (await response.json()) as RestockResponse

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ??
            "Gagal menyimpan Restock.",
        )
      }

      router.push(
        `/inventory/restocks/${result.data?.id}`,
      )

      router.refresh()
    } catch (error) {
      console.error(
        "[NewRestockPage] create restock:",
        error,
      )

      setError(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan Restock.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.push("/inventory/restocks")}
          aria-label="Kembali"
        >
          <ArrowLeft className="size-4" />
        </Button>

        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Tambah Restock
          </h1>

          <p className="text-sm text-muted-foreground">
            Masukkan stok dan harga pembelian bahan.
          </p>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />

          <div>
            <p className="text-sm font-medium">
              Restock gagal
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {error}
            </p>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackagePlus className="size-5" />
              Data Restock
            </CardTitle>

            <CardDescription>
              Setiap Restock akan membuat batch baru
              dengan HPP berdasarkan harga pembelian.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="inventoryItem">
                Bahan
              </Label>

              <select
                id="inventoryItem"
                value={inventoryItemId}
                onChange={(event) =>
                  setInventoryItemId(
                    event.target.value,
                  )
                }
                disabled={
                  isLoadingItems || isSubmitting
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {isLoadingItems
                    ? "Memuat bahan..."
                    : "Pilih bahan"}
                </option>

                {items.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name} —{" "}
                    {getTypeLabel(item.type)} —{" "}
                    {getUnitLabel(item.unit)}
                  </option>
                ))}
              </select>

              {selectedItem ? (
                <p className="text-xs text-muted-foreground">
                  Satuan:{" "}
                  <span className="font-medium text-foreground">
                    {getUnitLabel(
                      selectedItem.unit,
                    )}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity
                </Label>

                <div className="relative">
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    step="0.01"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(
                        event.target.value,
                      )
                    }
                    disabled={isSubmitting}
                    placeholder="Contoh: 1000"
                    className="pr-14"
                  />

                  {selectedItem ? (
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                      {getUnitLabel(
                        selectedItem.unit,
                      )}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalCost">
                  Total Harga
                </Label>

                <Input
                  id="totalCost"
                  type="number"
                  min="0"
                  step="1"
                  value={totalCost}
                  onChange={(event) =>
                    setTotalCost(
                      event.target.value,
                    )
                  }
                  disabled={isSubmitting}
                  placeholder="Contoh: 200000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierName">
                Supplier
                <span className="ml-1 text-muted-foreground">
                  (opsional)
                </span>
              </Label>

              <Input
                id="supplierName"
                value={supplierName}
                onChange={(event) =>
                  setSupplierName(
                    event.target.value,
                  )
                }
                disabled={isSubmitting}
                placeholder="Nama supplier"
              />
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">
                    HPP per {selectedItem
                      ? getUnitLabel(
                          selectedItem.unit,
                        )
                      : "unit"}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Dihitung otomatis dari total harga
                    dibagi quantity.
                  </p>
                </div>

                <p className="text-base font-semibold">
                  {formatRupiah(
                    estimatedUnitCost,
                  )}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t pt-6">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() =>
                  router.push(
                    "/inventory/restocks",
                  )
                }
              >
                Batal
              </Button>

              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  isLoadingItems ||
                  !inventoryItemId
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 size-4" />
                    Simpan Restock
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}