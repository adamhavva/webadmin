"use client"

import * as React from "react"

import {
  AlertTriangle,
  ArrowLeft,
  Pencil,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

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

type RecipeHistory = {
  id: string
  version: number
  isActive: boolean
  ingredientCount: number
  createdAt: string
  updatedAt: string
}

type DetailResponse = {
  success: boolean
  data?: {
    recipe: Recipe
    history: RecipeHistory[]
  }
  message?: string
}

type PageProps = {
  params: Promise<{
    id: string
  }>
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value))
}

export default function RecipeDetailPage({
  params,
}: PageProps) {
  const [
    recipeId,
    setRecipeId,
  ] = React.useState("")

  const [
    data,
    setData,
  ] = React.useState<
    DetailResponse["data"]
  >()

  const [
    loading,
    setLoading,
  ] = React.useState(true)

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

          const response =
            await fetch(
              `/api/inventory/recipes/${id}`,
              {
                cache: "no-store",
              },
            )

          const result =
            (await response.json()) as DetailResponse

          if (
            !response.ok ||
            !result.success ||
            !result.data
          ) {
            throw new Error(
              result.message ??
                "Gagal mengambil detail resep.",
            )
          }

          setData(
            result.data,
          )
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal mengambil detail resep.",
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />

        <div>
          <p className="font-medium">
            Gagal mengambil resep
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {error}
          </p>
        </div>

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

  if (!data) {
    return null
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>


          <h1 className="text-2xl font-semibold tracking-tight">
            {data.recipe.productName}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Detail komposisi dan riwayat versi resep.
          </p>
        </div>

        <div className="flex gap-2">
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

          {data.recipe
            .isActive && (
            <Button
              onClick={() => {
                window.location.href =
                  `/inventory/recipes/${data.recipe.id}/edit`
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Informasi Resep
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-6 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Produk
              </p>

              <p className="mt-1 font-medium">
                {
                  data.recipe
                    .productName
                }
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Version
              </p>

              <p className="mt-1 font-medium">
                v
                {
                  data.recipe
                    .version
                }
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Jumlah Bahan
              </p>

              <p className="mt-1 font-medium">
                {
                  data.recipe
                    .ingredientCount
                }
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Status
              </p>

              <div className="mt-1">
                <Badge
                  variant={
                    data.recipe
                      .isActive
                      ? "default"
                      : "secondary"
                  }
                >
                  {data.recipe
                    .isActive
                    ? "Active"
                    : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">
                Dibuat
              </p>

              <p className="mt-1 text-sm">
                {formatDate(
                  data.recipe
                    .createdAt,
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Terakhir diubah
              </p>

              <p className="mt-1 text-sm">
                {formatDate(
                  data.recipe
                    .updatedAt,
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Bahan Resep
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium">
                    Bahan
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Tipe
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Quantity
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Unit
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.recipe.items.map(
                  (item) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">
                        {
                          item.inventoryItemName
                        }
                      </td>

                      <td className="px-4 py-3">
                        {
                          item.inventoryItemType
                        }
                      </td>

                      <td className="px-4 py-3">
                        {
                          item.quantity
                        }
                      </td>

                      <td className="px-4 py-3">
                        {item.unit}
                      </td>

                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            item.inventoryItemIsActive
                              ? "default"
                              : "secondary"
                          }
                        >
                          {item.inventoryItemIsActive
                            ? "Active"
                            : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Riwayat Version
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium">
                    Version
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Jumlah Bahan
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Status
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Dibuat
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.history.map(
                  (item) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">
                        v
                        {
                          item.version
                        }
                      </td>

                      <td className="px-4 py-3">
                        {
                          item.ingredientCount
                        }
                      </td>

                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            item.isActive
                              ? "default"
                              : "secondary"
                          }
                        >
                          {item.isActive
                            ? "Active"
                            : "Inactive"}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(
                          item.createdAt,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}