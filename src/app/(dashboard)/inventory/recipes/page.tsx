"use client"

import * as React from "react"

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

type RecipeStatus =
  | "ACTIVE"
  | "INACTIVE"

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

type ApiResponse = {
  success: boolean
  data?: Recipe[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  message?: string
}

type DetailResponse = {
  success: boolean
  data?: {
    recipe: Recipe
    history: RecipeHistory[]
  }
  message?: string
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

function RecipeSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({
        length: 6,
      }).map((_, index) => (
        <div
          key={index}
          className="h-14 animate-pulse rounded-md bg-muted"
        />
      ))}
    </div>
  )
}

function RecipeErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" />

      <div>
        <p className="font-medium">
          Gagal mengambil data resep
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          {message}
        </p>
      </div>

      <Button
        variant="outline"
        onClick={onRetry}
      >
        Coba Lagi
      </Button>
    </div>
  )
}

function RecipeEmptyState({
  search,
}: {
  search: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Search className="mb-3 h-10 w-10 text-muted-foreground" />

      <p className="font-medium">
        Tidak ada resep
      </p>

      <p className="mt-1 text-sm text-muted-foreground">
        {search
          ? "Tidak ada resep yang sesuai dengan pencarian."
          : "Belum ada resep yang dibuat."}
      </p>
    </div>
  )
}

export default function RecipesPage() {
  const [
    recipes,
    setRecipes,
  ] = React.useState<Recipe[]>(
    [],
  )

  const [
    loading,
    setLoading,
  ] = React.useState(true)

  const [
    error,
    setError,
  ] = React.useState("")

  const [
    search,
    setSearch,
  ] = React.useState("")

  const [
    status,
    setStatus,
  ] =
    React.useState<RecipeStatus | "">(
      "",
    )

  const [
    page,
    setPage,
  ] = React.useState(1)

  const [
    pagination,
    setPagination,
  ] = React.useState<
    ApiResponse["pagination"]
  >()

  const [
    detail,
    setDetail,
  ] = React.useState<
    DetailResponse["data"]
  >()

  const [
    detailLoading,
    setDetailLoading,
  ] = React.useState(false)

  const [
    detailError,
    setDetailError,
  ] = React.useState("")

  const [
    detailOpen,
    setDetailOpen,
  ] = React.useState(false)

  const [
    searchInput,
    setSearchInput,
  ] = React.useState("")

  const fetchRecipes =
    React.useCallback(
      async (
        currentPage: number,
        currentSearch: string,
        currentStatus:
          | RecipeStatus
          | "",
      ) => {
        try {
          setLoading(true)
          setError("")

          const params =
            new URLSearchParams()

          params.set(
            "page",
            String(currentPage),
          )

          params.set("limit", "10")

          if (currentSearch) {
            params.set(
              "search",
              currentSearch,
            )
          }

          if (currentStatus) {
            params.set(
              "status",
              currentStatus,
            )
          }

          const response =
            await fetch(
              `/api/inventory/recipes?${params.toString()}`,
              {
                cache: "no-store",
              },
            )

          const result =
            (await response.json()) as ApiResponse

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ??
                "Gagal mengambil data resep.",
            )
          }

          setRecipes(
            result.data ?? [],
          )

          setPagination(
            result.pagination,
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
    const timeout =
      window.setTimeout(() => {
        setSearch(
          searchInput.trim(),
        )

        setPage(1)
      }, 400)

    return () =>
      window.clearTimeout(
        timeout,
      )
  }, [searchInput])

  React.useEffect(() => {
    void fetchRecipes(
      page,
      search,
      status,
    )
  }, [
    fetchRecipes,
    page,
    search,
    status,
  ])

  const handleRefresh =
    () => {
      void fetchRecipes(
        page,
        search,
        status,
      )
    }

  const handleView =
    async (id: string) => {
      try {
        setDetailLoading(true)
        setDetailError("")
        setDetail(undefined)
        setDetailOpen(true)

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

        setDetail(
          result.data,
        )
      } catch (err) {
        setDetailError(
          err instanceof Error
            ? err.message
            : "Gagal mengambil detail resep.",
        )
      } finally {
        setDetailLoading(false)
      }
    }

  const totalPages =
    pagination?.totalPages ?? 1

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Inventory / Resep
          </p>

          <h1 className="text-2xl font-semibold tracking-tight">
            Resep
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Kelola komposisi bahan dan versi resep produk.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={
              handleRefresh
            }
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button
            onClick={() => {
              window.location.href =
                "/inventory/recipes/new"
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Resep
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Daftar Resep
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value,
                  )
                }
                placeholder="Cari nama produk..."
                className="pl-9"
              />
            </div>

            <select
              value={status}
              onChange={(event) => {
                setStatus(
                  event.target
                    .value as
                    | RecipeStatus
                    | "",
                )
                setPage(1)
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">
                Semua Status
              </option>
              <option value="ACTIVE">
                Active
              </option>
              <option value="INACTIVE">
                Inactive
              </option>
            </select>
          </div>

          <Separator />

          {loading ? (
            <RecipeSkeleton />
          ) : error ? (
            <RecipeErrorState
              message={error}
              onRetry={
                handleRefresh
              }
            />
          ) : recipes.length ===
            0 ? (
            <RecipeEmptyState
              search={search}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-3 font-medium">
                      Produk
                    </th>
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
                    <th className="w-[60px] px-4 py-3" />
                  </tr>
                </thead>

                <tbody>
                  {recipes.map(
                    (recipe) => (
                      <tr
                        key={
                          recipe.id
                        }
                        className="border-b last:border-0"
                      >
                        <td className="px-4 py-3 font-medium">
                          {
                            recipe.productName
                          }
                        </td>

                        <td className="px-4 py-3">
                          v
                          {
                            recipe.version
                          }
                        </td>

                        <td className="px-4 py-3">
                          {
                            recipe.ingredientCount
                          }{" "}
                          bahan
                        </td>

                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              recipe.isActive
                                ? "default"
                                : "secondary"
                            }
                          >
                            {recipe.isActive
                              ? "Active"
                              : "Inactive"}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(
                            recipe.createdAt,
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <Button
                                variant="ghost"
                                size="icon"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">
                                  Actions
                                </span>
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  void handleView(
                                    recipe.id,
                                  )
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Lihat
                              </DropdownMenuItem>

                              {recipe.isActive && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    window.location.href =
                                      `/inventory/recipes/${recipe.id}/edit`
                                  }}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading &&
            !error &&
            pagination &&
            pagination.total >
              0 && (
              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Menampilkan{" "}
                  {(pagination.page -
                    1) *
                    pagination.limit +
                    1}{" "}
                  -{" "}
                  {Math.min(
                    pagination.page *
                      pagination.limit,
                    pagination.total,
                  )}{" "}
                  dari{" "}
                  {pagination.total}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      pagination.page <=
                      1
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.max(
                            1,
                            current -
                              1,
                          ),
                      )
                    }
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>

                  <span className="text-sm">
                    Page{" "}
                    {
                      pagination.page
                    }{" "}
                    of{" "}
                    {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      pagination.page >=
                      totalPages
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.min(
                            totalPages,
                            current +
                              1,
                          ),
                      )
                    }
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      <Dialog
        open={detailOpen}
        onOpenChange={
          setDetailOpen
        }
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Detail Resep
            </DialogTitle>

            <DialogDescription>
              Informasi bahan dan riwayat versi resep.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <RecipeSkeleton />
          ) : detailError ? (
            <RecipeErrorState
              message={
                detailError
              }
              onRetry={() => {
                if (
                  detail?.recipe.id
                ) {
                  void handleView(
                    detail.recipe.id,
                  )
                }
              }}
            />
          ) : detail ? (
            <div className="space-y-6">
              <div className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Produk
                    </p>

                    <p className="font-semibold">
                      {
                        detail.recipe
                          .productName
                      }
                    </p>
                  </div>

                  <Badge
                    variant={
                      detail.recipe
                        .isActive
                        ? "default"
                        : "secondary"
                    }
                  >
                    v
                    {
                      detail.recipe
                        .version
                    }{" "}
                    ·{" "}
                    {detail.recipe
                      .isActive
                      ? "Active"
                      : "Inactive"}
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">
                  Bahan
                </h3>

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
                      </tr>
                    </thead>

                    <tbody>
                      {detail.recipe.items.map(
                        (item) => (
                          <tr
                            key={
                              item.id
                            }
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
                              {
                                item.unit
                              }
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">
                  Riwayat Version
                </h3>

                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        <th className="px-4 py-3 font-medium">
                          Version
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Bahan
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
                      {detail.history.map(
                        (item) => (
                          <tr
                            key={
                              item.id
                            }
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
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDetailOpen(
                  false,
                )
              }
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}