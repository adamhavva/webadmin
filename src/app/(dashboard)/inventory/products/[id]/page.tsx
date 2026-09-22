"use client"

import * as React from "react"

import {
  AlertTriangle,
  ArrowLeft,
  Edit,
  Package,
  RefreshCw,
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

type ProductDetail = {
  id: string
  name: string
  sellingPrice: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  recipes: Array<{
    id: string
    version: number
    isActive: boolean
    createdAt: string
    updatedAt: string
    items: Array<{
      id: string
      quantity: string
      inventoryItem: {
        id: string
        name: string
        type: string
        unit: string
        isActive: boolean
      }
    }>
  }>
}

type ProductResponse = {
  success: boolean
  data?: ProductDetail
  message?: string
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(value))
}

function formatCurrency(value: string) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return "-"
  }

  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    },
  ).format(number)
}

function ProductDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map(
          (item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-lg bg-muted"
            />
          ),
        )}
      </div>
      <div className="h-72 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{
    id: string
  }>
}) {
  const [product, setProduct] =
    React.useState<ProductDetail | null>(
      null,
    )

  const [isLoading, setIsLoading] =
    React.useState(true)

  const [error, setError] =
    React.useState<string | null>(null)

  const loadProduct =
    React.useCallback(
      async () => {
        try {
          setIsLoading(true)
          setError(null)

          const { id } =
            await params

          const response =
            await fetch(
              `/api/inventory/products/${encodeURIComponent(
                id,
              )}`,
              {
                method: "GET",
                headers: {
                  Accept:
                    "application/json",
                },
                cache: "no-store",
              },
            )

          const result =
            (await response.json()) as ProductResponse

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ??
                "Gagal mengambil detail produk.",
            )
          }

          if (!result.data) {
            throw new Error(
              "Data produk tidak ditemukan.",
            )
          }

          setProduct(
            result.data,
          )
        } catch (error) {
          console.error(
            "[ProductDetailPage] load:",
            error,
          )

          setError(
            error instanceof Error
              ? error.message
              : "Gagal mengambil detail produk.",
          )
        } finally {
          setIsLoading(false)
        }
      },
      [params],
    )

  React.useEffect(() => {
    void loadProduct()
  }, [loadProduct])

  if (isLoading) {
    return (
      <ProductDetailSkeleton />
    )
  }

  if (error || !product) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-5 text-destructive" />
        </div>

        <h3 className="mt-4 text-sm font-semibold">
          Gagal memuat produk
        </h3>

        <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
          {error ??
            "Produk tidak ditemukan."}
        </p>

        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              window.location.href =
                "/inventory/products"
            }}
          >
            <ArrowLeft className="mr-2 size-4" />
            Kembali
          </Button>

          <Button
            type="button"
            onClick={() => {
              void loadProduct()
            }}
          >
            <RefreshCw className="mr-2 size-4" />
            Coba Lagi
          </Button>
        </div>
      </div>
    )
  }

  const activeRecipe =
    product.recipes.find(
      (recipe) => recipe.isActive,
    ) ?? null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              window.location.href =
                "/inventory/products"
            }}
          >
            <ArrowLeft className="size-4" />
          </Button>

          <div>
            <p className="text-sm text-muted-foreground">
              Persediaan / Produk
            </p>

            <h1 className="text-2xl font-semibold tracking-tight">
              {product.name}
            </h1>

            <div className="mt-2">
              <Badge
                variant={
                  product.isActive
                    ? "default"
                    : "secondary"
                }
              >
                {product.isActive
                  ? "Aktif"
                  : "Tidak Aktif"}
              </Badge>
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => {
            window.location.href =
              `/inventory/products/${encodeURIComponent(
                product.id,
              )}/edit`
          }}
        >
          <Edit className="mr-2 size-4" />
          Edit Produk
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Harga Jual
            </p>

            <p className="mt-2 text-xl font-semibold">
              {formatCurrency(
                product.sellingPrice,
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Recipe Aktif
            </p>

            <p className="mt-2 text-xl font-semibold">
              {activeRecipe
                ? `v${activeRecipe.version}`
                : "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Jumlah Bahan
            </p>

            <p className="mt-2 text-xl font-semibold">
              {activeRecipe
                ? activeRecipe.items
                    .length
                : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Recipe Aktif
          </CardTitle>
        </CardHeader>

        <CardContent>
          {!activeRecipe ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Package className="size-5 text-muted-foreground" />
              </div>

              <h3 className="mt-4 text-sm font-semibold">
                Belum ada Recipe
              </h3>

              <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                Produk ini belum memiliki recipe
                aktif.
              </p>

              {product.isActive ? (
                <Button
                  type="button"
                  className="mt-4"
                  onClick={() => {
                    window.location.href =
                      "/inventory/recipes/new"
                  }}
                >
                  Tambah Recipe
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
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
                  {activeRecipe.items.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="border-b last:border-0"
                      >
                        <td className="px-4 py-3 font-medium">
                          {
                            item
                              .inventoryItem
                              .name
                          }
                        </td>

                        <td className="px-4 py-3 text-muted-foreground">
                          {
                            item
                              .inventoryItem
                              .type
                          }
                        </td>

                        <td className="px-4 py-3">
                          {
                            item.quantity
                          }
                        </td>

                        <td className="px-4 py-3">
                          {
                            item
                              .inventoryItem
                              .unit
                          }
                        </td>

                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              item
                                .inventoryItem
                                .isActive
                                ? "default"
                                : "secondary"
                            }
                          >
                            {item
                              .inventoryItem
                              .isActive
                              ? "Aktif"
                              : "Tidak Aktif"}
                          </Badge>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Riwayat Recipe
          </CardTitle>
        </CardHeader>

        <CardContent>
          {product.recipes
            .length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada riwayat recipe.
            </p>
          ) : (
            <div className="space-y-4">
              {product.recipes.map(
                (recipe, index) => (
                  <React.Fragment
                    key={recipe.id}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">
                          Recipe v
                          {
                            recipe.version
                          }
                        </p>

                        <p className="text-sm text-muted-foreground">
                          {
                            recipe.items
                              .length
                          }{" "}
                          bahan · Dibuat{" "}
                          {formatDate(
                            recipe.createdAt,
                          )}
                        </p>
                      </div>

                      <Badge
                        variant={
                          recipe.isActive
                            ? "default"
                            : "secondary"
                        }
                      >
                        {recipe.isActive
                          ? "Aktif"
                          : "Tidak Aktif"}
                      </Badge>
                    </div>

                    {index <
                    product.recipes
                      .length -
                      1 ? (
                      <Separator />
                    ) : null}
                  </React.Fragment>
                ),
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        Dibuat:{" "}
        {formatDate(
          product.createdAt,
        )}{" "}
        · Diperbarui:{" "}
        {formatDate(
          product.updatedAt,
        )}
      </div>
    </div>
  )
}