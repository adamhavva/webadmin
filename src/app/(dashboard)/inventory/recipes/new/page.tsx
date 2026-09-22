"use client"

import * as React from "react"

import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
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
import { Separator } from "@/components/ui/separator"

type ProductOption = {
  id: string
  name: string
}

type InventoryOption = {
  id: string
  name: string
  type: string
  unit: "ML" | "PCS"
  isActive: boolean
}

type OptionsResponse = {
  success: boolean
  data?: {
    products: ProductOption[]
    inventoryItems: InventoryOption[]
  }
  message?: string
}

type RecipeRow = {
  id: string
  inventoryItemId: string
  quantity: string
}

function createRow(): RecipeRow {
  return {
    id: crypto.randomUUID(),
    inventoryItemId: "",
    quantity: "",
  }
}

export default function NewRecipePage() {
  const [
    products,
    setProducts,
  ] = React.useState<
    ProductOption[]
  >([])

  const [
    inventoryItems,
    setInventoryItems,
  ] = React.useState<
    InventoryOption[]
  >([])

  const [
    productId,
    setProductId,
  ] = React.useState("")

  const [
    rows,
    setRows,
  ] = React.useState<
    RecipeRow[]
  >([createRow()])

  const [
    loading,
    setLoading,
  ] = React.useState(true)

  const [
    saving,
    setSaving,
  ] = React.useState(false)

  const [
    error,
    setError,
  ] = React.useState("")

  const [
    success,
    setSuccess,
  ] = React.useState("")

  React.useEffect(() => {
    const loadOptions =
      async () => {
        try {
          setLoading(true)
          setError("")

          const response =
            await fetch(
              "/api/inventory/recipes?options=true",
              {
                cache: "no-store",
              },
            )

          const result =
            (await response.json()) as OptionsResponse

          if (
            !response.ok ||
            !result.success ||
            !result.data
          ) {
            throw new Error(
              result.message ??
                "Gagal mengambil pilihan resep.",
            )
          }

          setProducts(
            result.data.products,
          )

          setInventoryItems(
            result.data.inventoryItems,
          )
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal mengambil pilihan resep.",
          )
        } finally {
          setLoading(false)
        }
      }

    void loadOptions()
  }, [])

  const updateRow =
    (
      rowId: string,
      field:
        | "inventoryItemId"
        | "quantity",
      value: string,
    ) => {
      setRows(
        (current) =>
          current.map(
            (row) =>
              row.id === rowId
                ? {
                    ...row,
                    [field]:
                      value,
                  }
                : row,
          ),
      )
    }

  const addRow =
    () => {
      setRows(
        (current) => [
          ...current,
          createRow(),
        ],
      )
    }

  const removeRow =
    (rowId: string) => {
      setRows(
        (current) => {
          if (
            current.length === 1
          ) {
            return current
          }

          return current.filter(
            (row) =>
              row.id !== rowId,
          )
        },
      )
    }

  const handleSave =
    async () => {
      try {
        setError("")
        setSuccess("")

        if (!productId) {
          setError(
            "Produk wajib dipilih.",
          )
          return
        }

        if (
          rows.length === 0
        ) {
          setError(
            "Minimal satu bahan harus ditambahkan.",
          )
          return
        }

        const seen =
          new Set<string>()

        for (
          let index = 0;
          index < rows.length;
          index += 1
        ) {
          const row =
            rows[index]

          if (
            !row.inventoryItemId
          ) {
            setError(
              `Bahan pada baris ${index + 1} wajib dipilih.`,
            )
            return
          }

          if (
            seen.has(
              row.inventoryItemId,
            )
          ) {
            setError(
              "Bahan yang sama tidak boleh digunakan lebih dari satu kali.",
            )
            return
          }

          seen.add(
            row.inventoryItemId,
          )

          const quantity =
            Number(
              row.quantity,
            )

          if (
            !Number.isFinite(
              quantity,
            ) ||
            quantity <= 0
          ) {
            setError(
              `Quantity pada baris ${index + 1} harus lebih dari 0.`,
            )
            return
          }

          const item =
            inventoryItems.find(
              (inventoryItem) =>
                inventoryItem.id ===
                row.inventoryItemId,
            )

          if (
            !item
          ) {
            setError(
              "Bahan yang dipilih tidak ditemukan.",
            )
            return
          }

          if (
            item.unit ===
              "PCS" &&
            !Number.isInteger(
              quantity,
            )
          ) {
            setError(
              `Quantity "${item.name}" harus berupa bilangan bulat karena unitnya PCS.`,
            )
            return
          }
        }

        setSaving(true)

        const response =
          await fetch(
            "/api/inventory/recipes",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                productId,
                items: rows.map(
                  (row) => ({
                    inventoryItemId:
                      row.inventoryItemId,
                    quantity:
                      row.quantity,
                  }),
                ),
              }),
            },
          )

        const result =
          (await response.json()) as {
            success: boolean
            data?: {
              id: string
            }
            message?: string
          }

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ??
              "Gagal menyimpan resep.",
          )
        }

        setSuccess(
          "Resep berhasil dibuat.",
        )

        window.location.href =
          `/inventory/recipes/${result.data?.id}`
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Gagal menyimpan resep.",
        )
      } finally {
        setSaving(false)
      }
    }

  const selectedProduct =
    products.find(
      (product) =>
        product.id === productId,
    )

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tambah Resep
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Buat resep baru untuk satu produk.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            window.location.href =
              "/inventory/recipes"
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border px-4 py-3 text-sm">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Informasi Produk
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="h-10 animate-pulse rounded-md bg-muted" />
          ) : (
            <div className="space-y-2">
              <label
                htmlFor="product"
                className="text-sm font-medium"
              >
                Produk
              </label>

              <select
                id="product"
                value={productId}
                onChange={(event) =>
                  setProductId(
                    event.target.value,
                  )
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={saving}
              >
                <option value="">
                  Pilih produk
                </option>

                {products.map(
                  (product) => (
                    <option
                      key={
                        product.id
                      }
                      value={
                        product.id
                      }
                    >
                      {
                        product.name
                      }
                    </option>
                  ),
                )}
              </select>

              {selectedProduct && (
                <p className="text-xs text-muted-foreground">
                  Recipe akan dibuat untuk{" "}
                  <span className="font-medium">
                    {
                      selectedProduct.name
                    }
                  </span>
                  . Backend menentukan version secara otomatis.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              Bahan Resep
            </CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Unit mengikuti master bahan.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={addRow}
            disabled={
              loading || saving
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Bahan
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {rows.map(
            (row, index) => {
              const selected =
                inventoryItems.find(
                  (item) =>
                    item.id ===
                    row.inventoryItemId,
                )

              return (
                <div
                  key={row.id}
                  className="rounded-lg border p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Bahan{" "}
                      {index + 1}
                    </p>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        removeRow(
                          row.id,
                        )
                      }
                      disabled={
                        saving ||
                        rows.length ===
                          1
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1fr_180px_100px]">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Bahan
                      </label>

                      <select
                        value={
                          row.inventoryItemId
                        }
                        onChange={(
                          event,
                        ) =>
                          updateRow(
                            row.id,
                            "inventoryItemId",
                            event.target
                              .value,
                          )
                        }
                        disabled={
                          saving
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">
                          Pilih bahan
                        </option>

                        {inventoryItems.map(
                          (
                            item,
                          ) => (
                            <option
                              key={
                                item.id
                              }
                              value={
                                item.id
                              }
                            >
                              {
                                item.name
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Quantity
                      </label>

                      <Input
                        type="number"
                        min="0"
                        step={
                          selected?.unit ===
                          "PCS"
                            ? "1"
                            : "any"
                        }
                        value={
                          row.quantity
                        }
                        onChange={(
                          event,
                        ) =>
                          updateRow(
                            row.id,
                            "quantity",
                            event.target
                              .value,
                          )
                        }
                        disabled={
                          saving
                        }
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Unit
                      </label>

                      <div className="flex h-10 items-center">
                        {selected ? (
                          <Badge variant="secondary">
                            {
                              selected.unit
                            }
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {selected && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {selected.type} · Unit{" "}
                      {
                        selected.unit
                      }{" "}
                      berasal dari master bahan.
                    </p>
                  )}
                </div>
              )
            },
          )}

          <Separator />

          <div className="flex justify-end">
            <Button
              onClick={
                handleSave
              }
              disabled={
                loading ||
                saving
              }
            >
              <Save className="mr-2 h-4 w-4" />
              {saving
                ? "Menyimpan..."
                : "Simpan Resep"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}