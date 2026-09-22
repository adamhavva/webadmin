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

type InventoryOption = {
  id: string
  name: string
  type: string
  unit: "ML" | "PCS"
  isActive: boolean
}

type RecipeItem = {
  id: string
  inventoryItemId: string
  inventoryItemName: string
  inventoryItemType: string
  unit: string
  quantity: string
  inventoryItemIsActive: boolean
}

type Recipe = {
  id: string
  productId: string
  productName: string
  version: number
  ingredientCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  items: RecipeItem[]
}

type DetailResponse = {
  success: boolean
  data?: {
    recipe: Recipe
  }
  message?: string
}

type OptionsResponse = {
  success: boolean
  data?: {
    inventoryItems: InventoryOption[]
  }
  message?: string
}

type Row = {
  id: string
  inventoryItemId: string
  quantity: string
}

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default function EditRecipePage({
  params,
}: PageProps) {
  const [
    recipeId,
    setRecipeId,
  ] = React.useState("")

  const [
    recipe,
    setRecipe,
  ] = React.useState<
    Recipe | undefined
  >()

  const [
    inventoryItems,
    setInventoryItems,
  ] = React.useState<
    InventoryOption[]
  >([])

  const [
    rows,
    setRows,
  ] = React.useState<Row[]>(
    [],
  )

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

  const load =
    React.useCallback(
      async (id: string) => {
        try {
          setLoading(true)
          setError("")

          const [
            recipeResponse,
            optionsResponse,
          ] = await Promise.all([
            fetch(
              `/api/inventory/recipes/${id}`,
              {
                cache: "no-store",
              },
            ),
            fetch(
              "/api/inventory/recipes?options=true",
              {
                cache: "no-store",
              },
            ),
          ])

          const recipeResult =
            (await recipeResponse.json()) as DetailResponse

          const optionsResult =
            (await optionsResponse.json()) as OptionsResponse

          if (
            !recipeResponse.ok ||
            !recipeResult.success ||
            !recipeResult.data
          ) {
            throw new Error(
              recipeResult.message ??
                "Gagal mengambil resep.",
            )
          }

          if (
            !optionsResponse.ok ||
            !optionsResult.success ||
            !optionsResult.data
          ) {
            throw new Error(
              optionsResult.message ??
                "Gagal mengambil pilihan bahan.",
            )
          }

          const loadedRecipe =
            recipeResult.data
              .recipe

          setRecipe(
            loadedRecipe,
          )

          setInventoryItems(
            optionsResult.data
              .inventoryItems,
          )

          setRows(
            loadedRecipe.items.map(
              (item) => ({
                id:
                  crypto.randomUUID(),
                inventoryItemId:
                  item.inventoryItemId,
                quantity:
                  item.quantity,
              }),
            ),
          )
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal mengambil data resep.",
          )
        } finally {
          setLoading(false)
        }
      },
      [],
    )

  React.useEffect(() => {
    const resolve =
      async () => {
        const { id } =
          await params

        setRecipeId(id)

        void load(id)
      }

    void resolve()
  }, [load, params])

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
          {
            id: crypto.randomUUID(),
            inventoryItemId: "",
            quantity: "",
          },
        ],
      )
    }

  const removeRow =
    (rowId: string) => {
      setRows(
        (current) => {
          if (
            current.length ===
            1
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

        if (!recipeId) {
          setError(
            "ID resep tidak valid.",
          )
          return
        }

        if (
          !recipe?.isActive
        ) {
          setError(
            "Hanya resep aktif yang dapat diedit.",
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

          if (!item) {
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
            `/api/inventory/recipes/${recipeId}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
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
              "Gagal menyimpan perubahan resep.",
          )
        }

        window.location.href =
          `/inventory/recipes/${result.data?.id}`
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Gagal menyimpan perubahan resep.",
        )
      } finally {
        setSaving(false)
      }
    }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (
    error &&
    !recipe
  ) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="font-medium">
          Gagal mengambil resep
        </p>

        <p className="text-sm text-muted-foreground">
          {error}
        </p>

        <Button
          variant="outline"
          onClick={() => {
            if (recipeId) {
              void load(
                recipeId,
              )
            }
          }}
        >
          Coba Lagi
        </Button>
      </div>
    )
  }

  if (!recipe) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Inventory / Resep
          </p>

          <h1 className="text-2xl font-semibold tracking-tight">
            Edit Resep
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {recipe.productName} · v
            {recipe.version}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            window.location.href =
              `/inventory/recipes/${recipe.id}`
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

      <Card>
        <CardHeader>
          <CardTitle>
            Produk
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Produk
              </p>

              <p className="mt-1 font-medium">
                {
                  recipe.productName
                }
              </p>
            </div>

            <Badge>
              Active · v
              {
                recipe.version
              }
            </Badge>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Menyimpan perubahan akan membuat version baru. Version lama tetap tersimpan sebagai history.
          </p>
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
            disabled={saving}
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
              disabled={saving}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving
                ? "Menyimpan..."
                : "Simpan & Buat Version Baru"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}