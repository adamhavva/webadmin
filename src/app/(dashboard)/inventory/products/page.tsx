"use client"

import * as React from "react"

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

type Product = {
  id: string
  name: string
  sellingPrice: string
  isActive: boolean
  activeRecipe: {
    version: number
    ingredientCount: number
  } | null
  createdAt: string
  updatedAt: string
}

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

type ProductsResponse = {
  success: boolean
  data?: Product[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary?: {
    totalProducts: number
    activeProducts: number
    inactiveProducts: number
  }
  message?: string
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
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

function ProductSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[1, 2, 3, 4, 5].map(
        (item) => (
          <div
            key={item}
            className="flex animate-pulse items-center gap-4"
          >
            <div className="size-10 rounded-lg bg-muted" />

            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>

            <div className="h-4 w-28 rounded bg-muted" />

            <div className="h-6 w-20 rounded-full bg-muted" />

            <div className="size-8 rounded bg-muted" />
          </div>
        ),
      )}
    </div>
  )
}

function ProductErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">
        Gagal memuat produk
      </h3>

      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>

      <Button
        type="button"
        variant="outline"
        className="mt-4"
        onClick={onRetry}
      >
        <RefreshCw className="mr-2 size-4" />
        Coba Lagi
      </Button>
    </div>
  )
}

function ProductEmptyState({
  hasSearch,
  onClearSearch,
}: {
  hasSearch: boolean
  onClearSearch: () => void
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Package className="size-5 text-muted-foreground" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">
        {hasSearch
          ? "Produk tidak ditemukan"
          : "Belum ada produk"}
      </h3>

      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
        {hasSearch
          ? "Tidak ada produk yang cocok dengan pencarian."
          : "Belum ada produk yang terdaftar."}
      </p>

      {hasSearch ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={onClearSearch}
        >
          <X className="mr-2 size-4" />
          Hapus Pencarian
        </Button>
      ) : (
        <Button
          type="button"
          className="mt-4"
          onClick={() => {
            window.location.href =
              "/inventory/products/new"
          }}
        >
          <Plus className="mr-2 size-4" />
          Tambah Produk
        </Button>
      )}
    </div>
  )
}

export default function ProductsPage() {
  const [products, setProducts] =
    React.useState<Product[]>([])

  const [search, setSearch] =
    React.useState("")

  const [status, setStatus] =
    React.useState<
      "ALL" | "ACTIVE" | "INACTIVE"
    >("ALL")

  const [page, setPage] =
    React.useState(1)

  const [pagination, setPagination] =
    React.useState({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    })

  const [isLoading, setIsLoading] =
    React.useState(true)

  const [isRefreshing, setIsRefreshing] =
    React.useState(false)

  const [error, setError] =
    React.useState<string | null>(null)

  const [viewProduct, setViewProduct] =
    React.useState<
      ProductDetail | undefined
    >(undefined)

  const [isViewLoading, setIsViewLoading] =
    React.useState(false)

  const [viewError, setViewError] =
    React.useState<string | null>(null)

  const [deleteProduct, setDeleteProduct] =
    React.useState<Product | null>(null)

  const [isDeleting, setIsDeleting] =
    React.useState(false)

  const [deleteError, setDeleteError] =
    React.useState<string | null>(null)

  const fetchProducts =
    React.useCallback(
      async ({
        showLoading = false,
        showRefreshing = false,
        requestedPage = page,
        requestedSearch = search,
        requestedStatus = status,
      }: {
        showLoading?: boolean
        showRefreshing?: boolean
        requestedPage?: number
        requestedSearch?: string
        requestedStatus?:
          | "ALL"
          | "ACTIVE"
          | "INACTIVE"
      } = {}) => {
        try {
          if (showLoading) {
            setIsLoading(true)
          }

          if (showRefreshing) {
            setIsRefreshing(true)
          }

          setError(null)

          const params =
            new URLSearchParams()

          params.set(
            "page",
            String(requestedPage),
          )

          params.set(
            "limit",
            "10",
          )

          if (
            requestedSearch.trim()
          ) {
            params.set(
              "search",
              requestedSearch.trim(),
            )
          }

          if (
            requestedStatus ===
            "ACTIVE"
          ) {
            params.set(
              "isActive",
              "true",
            )
          }

          if (
            requestedStatus ===
            "INACTIVE"
          ) {
            params.set(
              "isActive",
              "false",
            )
          }

          const response =
            await fetch(
              `/api/inventory/products?${params.toString()}`,
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
            (await response.json()) as ProductsResponse

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ??
                "Gagal mengambil data produk.",
            )
          }

          setProducts(
            result.data ?? [],
          )

          setPagination(
            result.pagination ?? {
              page: requestedPage,
              limit: 10,
              total: 0,
              totalPages: 1,
            },
          )
        } catch (error) {
          console.error(
            "[ProductsPage] fetch products:",
            error,
          )

          setError(
            error instanceof Error
              ? error.message
              : "Gagal mengambil data produk.",
          )
        } finally {
          if (showLoading) {
            setIsLoading(false)
          }

          if (showRefreshing) {
            setIsRefreshing(false)
          }
        }
      },
      [page, search, status],
    )

  React.useEffect(() => {
    void fetchProducts({
      showLoading: true,
    })
  }, [fetchProducts])

  React.useEffect(() => {
    const timer =
      window.setTimeout(() => {
        if (page !== 1) {
          setPage(1)
          return
        }

        void fetchProducts({
          showLoading: true,
          requestedPage: 1,
          requestedSearch: search,
          requestedStatus: status,
        })
      }, 400)

    return () => {
      window.clearTimeout(timer)
    }
  }, [search, status])

  function handleRefresh() {
    void fetchProducts({
      showRefreshing: true,
    })
  }

  function handlePreviousPage() {
    if (page <= 1) {
      return
    }

    setPage(
      (current) => current - 1,
    )
  }

  function handleNextPage() {
    if (
      page >=
      pagination.totalPages
    ) {
      return
    }

    setPage(
      (current) => current + 1,
    )
  }

  async function handleView(
    product: Product,
  ) {
    setViewProduct(undefined)
    setViewError(null)
    setIsViewLoading(true)

    try {
      const response =
        await fetch(
          `/api/inventory/products/${encodeURIComponent(
            product.id,
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
          "Detail produk tidak ditemukan.",
        )
      }

      setViewProduct(
        result.data,
      )
    } catch (error) {
      console.error(
        "[ProductsPage] view product:",
        error,
      )

      setViewError(
        error instanceof Error
          ? error.message
          : "Gagal mengambil detail produk.",
      )
    } finally {
      setIsViewLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteProduct) {
      return
    }

    try {
      setIsDeleting(true)
      setDeleteError(null)

      const response =
        await fetch(
          `/api/inventory/products/${encodeURIComponent(
            deleteProduct.id,
          )}`,
          {
            method: "DELETE",
            headers: {
              Accept:
                "application/json",
            },
          },
        )

      const result =
        (await response.json()) as {
          success: boolean
          message?: string
        }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Gagal menonaktifkan produk.",
        )
      }

      setDeleteProduct(null)

      await fetchProducts({
        showRefreshing: true,
      })
    } catch (error) {
      console.error(
        "[ProductsPage] delete product:",
        error,
      )

      setDeleteError(
        error instanceof Error
          ? error.message
          : "Gagal menonaktifkan produk.",
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Persediaan
          </p>

          <h1 className="text-2xl font-semibold tracking-tight">
            Produk
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Kelola produk yang dijual kepada customer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={
                isRefreshing
                  ? "mr-2 size-4 animate-spin"
                  : "mr-2 size-4"
              }
            />
            Refresh
          </Button>

          <Button
            type="button"
            onClick={() => {
              window.location.href =
                "/inventory/products/new"
            }}
          >
            <Plus className="mr-2 size-4" />
            Tambah Produk
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Daftar Produk
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => {
                  setSearch(
                    event.target.value,
                  )
                }}
                placeholder="Cari nama produk..."
                className="pl-9"
              />
            </div>

            <select
              value={status}
              onChange={(event) => {
                setStatus(
                  event.target.value as
                    | "ALL"
                    | "ACTIVE"
                    | "INACTIVE",
                )
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ALL">
                Semua Status
              </option>

              <option value="ACTIVE">
                Aktif
              </option>

              <option value="INACTIVE">
                Tidak Aktif
              </option>
            </select>
          </div>

          <Separator className="my-4" />

          {isLoading ? (
            <ProductSkeleton />
          ) : error ? (
            <ProductErrorState
              message={error}
              onRetry={() =>
                fetchProducts({
                  showLoading: true,
                })
              }
            />
          ) : products.length ===
            0 ? (
            <ProductEmptyState
              hasSearch={
                search.trim().length >
                  0 ||
                status !== "ALL"
              }
              onClearSearch={() => {
                setSearch("")
                setStatus("ALL")
                setPage(1)
              }}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">
                        Produk
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Harga Jual
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Recipe
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Status
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Dibuat
                      </th>

                      <th className="w-12 px-4 py-3" />
                    </tr>
                  </thead>

                  <tbody>
                    {products.map(
                      (product) => (
                        <tr
                          key={
                            product.id
                          }
                          className="border-b last:border-0"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                                <Package className="size-4 text-muted-foreground" />
                              </div>

                              <div>
                                <p className="font-medium">
                                  {
                                    product.name
                                  }
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  {
                                    product.id
                                  }
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 font-medium">
                            {formatCurrency(
                              product.sellingPrice,
                            )}
                          </td>

                          <td className="px-4 py-4">
                            {product.activeRecipe ? (
                              <div>
                                <p className="font-medium">
                                  v
                                  {
                                    product
                                      .activeRecipe
                                      .version
                                  }
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  {
                                    product
                                      .activeRecipe
                                      .ingredientCount
                                  }{" "}
                                  bahan
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                Belum ada
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4">
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
                          </td>

                          <td className="px-4 py-4 text-muted-foreground">
                            {formatDate(
                              product.createdAt,
                            )}
                          </td>

                          <td className="px-4 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleView(
                                      product,
                                    )
                                  }
                                >
                                  <Eye className="mr-2 size-4" />
                                  Lihat Detail
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => {
                                    window.location.href =
                                      `/inventory/products/${encodeURIComponent(
                                        product.id,
                                      )}/edit`
                                  }}
                                >
                                  Edit
                                </DropdownMenuItem>

                                {product.isActive ? (
                                  <>
                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => {
                                        setDeleteError(
                                          null,
                                        )
                                        setDeleteProduct(
                                          product,
                                        )
                                      }}
                                    >
                                      Nonaktifkan
                                    </DropdownMenuItem>
                                  </>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {pagination.total}{" "}
                  produk
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={
                      handlePreviousPage
                    }
                    disabled={
                      page <= 1
                    }
                  >
                    <ChevronLeft className="mr-1 size-4" />
                    Sebelumnya
                  </Button>

                  <span className="min-w-24 text-center text-sm text-muted-foreground">
                    Halaman {page} dari{" "}
                    {
                      pagination.totalPages
                    }
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={
                      handleNextPage
                    }
                    disabled={
                      page >=
                      pagination.totalPages
                    }
                  >
                    Berikutnya
                    <ChevronRight className="ml-1 size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={
          viewProduct !== undefined ||
          isViewLoading ||
          viewError !== null
        }
        onOpenChange={(open) => {
          if (!open) {
            setViewProduct(undefined)
            setViewError(null)
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Detail Produk
            </DialogTitle>

            <DialogDescription>
              Informasi produk dan recipe yang
              terkait.
            </DialogDescription>
          </DialogHeader>

          {isViewLoading ? (
            <div className="space-y-4 py-6">
              <div className="h-5 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-32 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : viewError ? (
            <div className="py-6 text-sm text-destructive">
              {viewError}
            </div>
          ) : viewProduct ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Produk
                  </p>

                  <p className="mt-1 font-medium">
                    {
                      viewProduct.name
                    }
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Harga Jual
                  </p>

                  <p className="mt-1 font-medium">
                    {formatCurrency(
                      viewProduct.sellingPrice,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Status
                  </p>

                  <div className="mt-1">
                    <Badge
                      variant={
                        viewProduct.isActive
                          ? "default"
                          : "secondary"
                      }
                    >
                      {viewProduct.isActive
                        ? "Aktif"
                        : "Tidak Aktif"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold">
                  Recipe
                </h3>

                <div className="mt-3 space-y-3">
                  {viewProduct.recipes
                    .length === 0 ? (
                    <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                      Produk belum memiliki
                      recipe.
                    </div>
                  ) : (
                    viewProduct.recipes.map(
                      (recipe) => (
                        <div
                          key={
                            recipe.id
                          }
                          className="rounded-lg border"
                        >
                          <div className="flex items-center justify-between border-b px-4 py-3">
                            <div>
                              <p className="font-medium">
                                Recipe v
                                {
                                  recipe.version
                                }
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {
                                  recipe
                                    .items
                                    .length
                                }{" "}
                                bahan
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

                          <div className="divide-y">
                            {recipe.items.map(
                              (item) => (
                                <div
                                  key={
                                    item.id
                                  }
                                  className="flex items-center justify-between px-4 py-3"
                                >
                                  <div>
                                    <p className="text-sm font-medium">
                                      {
                                        item
                                          .inventoryItem
                                          .name
                                      }
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                      {
                                        item
                                          .inventoryItem
                                          .type
                                      }
                                    </p>
                                  </div>

                                  <p className="text-sm font-medium">
                                    {
                                      item.quantity
                                    }{" "}
                                    {
                                      item
                                        .inventoryItem
                                        .unit
                                    }
                                  </p>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      ),
                    )
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            {viewProduct ? (
              <Button
                type="button"
                onClick={() => {
                  window.location.href =
                    `/inventory/products/${encodeURIComponent(
                      viewProduct.id,
                    )}`
                }}
              >
                Buka Detail
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={
          deleteProduct !== null
        }
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteProduct(null)
            setDeleteError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Nonaktifkan Produk
            </DialogTitle>

            <DialogDescription>
              Produk tidak akan dihapus dari
              database. Produk hanya dibuat tidak
              aktif.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border p-4">
            <p className="font-medium">
              {deleteProduct?.name}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Produk yang tidak aktif tidak dapat
              digunakan untuk recipe baru.
            </p>
          </div>

          {deleteError ? (
            <p className="text-sm text-destructive">
              {deleteError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => {
                setDeleteProduct(null)
                setDeleteError(null)
              }}
            >
              Batal
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting
                ? "Memproses..."
                : "Nonaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}