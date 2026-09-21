"use client"

import * as React from "react"

import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
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
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

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
  createdAt: string
  updatedAt: string
}

type InventoryItemsResponse = {
  success: boolean
  data?: InventoryItem[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary?: {
    totalItems: number
    semiFinished: number
    directUse: number
    activeItems: number
  }
  message?: string
}

type InventoryItemDetail =
  InventoryItem & {
    _count?: {
      batches: number
      recipeItems: number
      restocks: number
      productions: number
    }
  }

type InventoryItemResponse = {
  success: boolean
  data?: InventoryItemDetail
  message?: string
}

const typeOptions: {
  value: InventoryItemType
  label: string
  description: string
}[] = [
    {
      value: "SEMI_FINISHED",
      label: "Semi Finished",
      description:
        "Bahan hasil proses produksi.",
    },
    {
      value: "DIRECT_USE",
      label: "Direct Use",
      description:
        "Bahan yang digunakan langsung.",
    },
  ]

const unitOptions: {
  value: InventoryUnit
  label: string
  description: string
}[] = [
    {
      value: "ML",
      label: "ML",
      description:
        "Untuk bahan berbentuk cair.",
    },
    {
      value: "PCS",
      label: "PCS",
      description:
        "Untuk bahan yang dihitung per unit.",
    },
  ]

function getTypeLabel(
  type: InventoryItemType,
) {
  if (type === "SEMI_FINISHED") {
    return "Semi Finished"
  }

  return "Direct Use"
}

function getTypeDescription(
  type: InventoryItemType,
) {
  if (type === "SEMI_FINISHED") {
    return "Bahan hasil produksi"
  }

  return "Bahan pemakaian langsung"
}

function getTypeIcon(
  type: InventoryItemType,
) {
  if (type === "SEMI_FINISHED") {
    return PackageCheck
  }

  return Sparkles
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(new Date(value))
}

function InventorySkeleton() {
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

            <div className="h-6 w-28 rounded-full bg-muted" />

            <div className="h-6 w-12 rounded bg-muted" />

            <div className="size-8 rounded bg-muted" />
          </div>
        ),
      )}
    </div>
  )
}

function InventoryErrorState({
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
        Gagal memuat bahan
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

function InventoryEmptyState({
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
          ? "Bahan tidak ditemukan"
          : "Belum ada bahan"}
      </h3>

      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
        {hasSearch
          ? "Tidak ada bahan yang cocok dengan pencarian."
          : "Belum ada master bahan yang terdaftar di inventory."}
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
              "/inventory/items/new"
          }}
        >
          <Plus className="mr-2 size-4" />
          Tambah Bahan
        </Button>
      )}
    </div>
  )
}

export default function InventoryItemsPage() {
  const [items, setItems] =
    React.useState<InventoryItem[]>([])

  const [search, setSearch] =
    React.useState("")

  const [page, setPage] =
    React.useState(1)

  const [pagination, setPagination] =
    React.useState({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    })

  const [summary, setSummary] =
    React.useState({
      totalItems: 0,
      semiFinished: 0,
      directUse: 0,
      activeItems: 0,
    })

  const [isLoading, setIsLoading] =
    React.useState(true)

  const [isRefreshing, setIsRefreshing] =
    React.useState(false)

  const [error, setError] =
    React.useState<string | null>(null)

  const [viewItem, setViewItem] =
    React.useState<InventoryItemDetail | null>(
      null,
    )

  const [isViewLoading, setIsViewLoading] =
    React.useState(false)

  const [viewError, setViewError] =
    React.useState<string | null>(null)

  const [editItem, setEditItem] =
    React.useState<InventoryItem | null>(
      null,
    )

  const [editForm, setEditForm] =
    React.useState({
      name: "",
      type:
        "" as InventoryItemType | "",
      unit:
        "" as InventoryUnit | "",
      isActive: true,
    })

  const [editError, setEditError] =
    React.useState<string | null>(null)

  const [isEditing, setIsEditing] =
    React.useState(false)

  const [deleteItem, setDeleteItem] =
    React.useState<InventoryItem | null>(
      null,
    )

  const [
    deleteConfirmation,
    setDeleteConfirmation,
  ] = React.useState("")

  const [deleteError, setDeleteError] =
    React.useState<string | null>(null)

  const [isDeleting, setIsDeleting] =
    React.useState(false)

  const deleteConfirmationIsValid =
    deleteItem !== null &&
    deleteConfirmation ===
    deleteItem.id

  /*
    Mengambil data inventory item dari backend.
  */
  const fetchItems =
    React.useCallback(
      async ({
        showLoading = false,
        showRefreshing = false,
        requestedPage = page,
        requestedSearch = search,
      }: {
        showLoading?: boolean
        showRefreshing?: boolean
        requestedPage?: number
        requestedSearch?: string
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

          const response =
            await fetch(
              `/api/inventory/items?${params.toString()}`,
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
            (await response.json()) as InventoryItemsResponse

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ??
              "Gagal mengambil data bahan.",
            )
          }

          setItems(
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

          setSummary(
            result.summary ?? {
              totalItems: 0,
              semiFinished: 0,
              directUse: 0,
              activeItems: 0,
            },
          )
        } catch (error) {
          console.error(
            "[InventoryItemsPage] fetch items:",
            error,
          )

          setError(
            error instanceof Error
              ? error.message
              : "Gagal mengambil data bahan.",
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
      [page, search],
    )

  React.useEffect(() => {
    void fetchItems({
      showLoading: page === 1,
    })
  }, [page, fetchItems])

  /*
    Memberi jeda pada pencarian supaya
    API tidak dipanggil pada setiap ketikan.
  */
  React.useEffect(() => {
    const timer =
      window.setTimeout(() => {
        if (page !== 1) {
          setPage(1)
          return
        }

        void fetchItems({
          showLoading: true,
          requestedPage: 1,
          requestedSearch: search,
        })
      }, 400)

    return () => {
      window.clearTimeout(timer)
    }
  }, [search])

  function handleRefresh() {
    void fetchItems({
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

  /*
    Mengambil detail item untuk dialog View.
  */
  async function handleView(
    item: InventoryItem,
  ) {
    setViewItem(null)
    setViewError(null)
    setIsViewLoading(true)

    try {
      const response =
        await fetch(
          `/api/inventory/items/${encodeURIComponent(
            item.id,
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
        (await response.json()) as InventoryItemResponse

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
          "Gagal mengambil detail bahan.",
        )
      }

      setViewItem(
        result.data ?? null,
      )
    } catch (error) {
      console.error(
        "[InventoryItemsPage] view item:",
        error,
      )

      setViewError(
        error instanceof Error
          ? error.message
          : "Gagal mengambil detail bahan.",
      )
    } finally {
      setIsViewLoading(false)
    }
  }

  function handleOpenEdit(
    item: InventoryItem,
  ) {
    setEditItem(item)

    setEditForm({
      name: item.name,
      type: item.type,
      unit: item.unit,
      isActive: item.isActive,
    })

    setEditError(null)
  }

  function handleCloseEdit() {
    if (isEditing) {
      return
    }

    setEditItem(null)
    setEditError(null)
  }

  /*
    Menyimpan perubahan master item
    menggunakan endpoint PUT.
  */
  async function handleUpdate() {
    if (!editItem) {
      return
    }

    const name =
      editForm.name.trim()

    if (!name) {
      setEditError(
        "Nama bahan wajib diisi.",
      )
      return
    }

    if (!editForm.type) {
      setEditError(
        "Tipe bahan wajib dipilih.",
      )
      return
    }

    if (!editForm.unit) {
      setEditError(
        "Unit bahan wajib dipilih.",
      )
      return
    }

    try {
      setIsEditing(true)
      setEditError(null)

      const response =
        await fetch(
          `/api/inventory/items/${encodeURIComponent(
            editItem.id,
          )}`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body: JSON.stringify({
              name,
              type: editForm.type,
              unit: editForm.unit,
              isActive:
                editForm.isActive,
            }),
          },
        )

      const result =
        (await response.json()) as InventoryItemResponse

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
          "Gagal memperbarui bahan.",
        )
      }

      setEditItem(null)

      await fetchItems({
        requestedPage: page,
        requestedSearch: search,
      })
    } catch (error) {
      console.error(
        "[InventoryItemsPage] update item:",
        error,
      )

      setEditError(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui bahan.",
      )
    } finally {
      setIsEditing(false)
    }
  }

  function handleOpenDelete(
    item: InventoryItem,
  ) {
    setDeleteItem(item)
    setDeleteConfirmation("")
    setDeleteError(null)
  }

  function handleCloseDelete() {
    if (isDeleting) {
      return
    }

    setDeleteItem(null)
    setDeleteConfirmation("")
    setDeleteError(null)
  }

  /*
    Menghapus item setelah ID diketik
    sebagai konfirmasi.
  */
  async function handleDelete() {
    if (
      !deleteItem ||
      !deleteConfirmationIsValid ||
      isDeleting
    ) {
      return
    }

    try {
      setIsDeleting(true)
      setDeleteError(null)

      const response =
        await fetch(
          `/api/inventory/items/${encodeURIComponent(
            deleteItem.id,
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
        (await response.json()) as InventoryItemResponse

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
          "Gagal menghapus bahan.",
        )
      }

      const shouldGoBack =
        items.length === 1 &&
        page > 1

      setDeleteItem(null)
      setDeleteConfirmation("")

      if (shouldGoBack) {
        setPage(
          (current) => current - 1,
        )
      } else {
        await fetchItems({
          requestedPage: page,
          requestedSearch: search,
        })
      }
    } catch (error) {
      console.error(
        "[InventoryItemsPage] delete item:",
        error,
      )

      setDeleteError(
        error instanceof Error
          ? error.message
          : "Gagal menghapus bahan.",
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Persediaan
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Bahan
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Kelola master bahan yang digunakan ASCEND.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={
                isRefreshing ||
                isLoading
              }
            >
              <RefreshCw
                className={[
                  "mr-2 size-4",
                  isRefreshing
                    ? "animate-spin"
                    : "",
                ].join(" ")}
              />

              Refresh
            </Button>

            <Button
              type="button"
              onClick={() => {
                window.location.href =
                  "/inventory/items/new"
              }}
            >
              <Plus className="mr-2 size-4" />
              Tambah Bahan
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Bahan
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-2xl font-semibold">
                {summary.totalItems}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Semi Finished
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-2xl font-semibold">
                {summary.semiFinished}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Direct Use
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-2xl font-semibold">
                {summary.directUse}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bahan Aktif
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-2xl font-semibold">
                {summary.activeItems}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>
                  Daftar Bahan
                </CardTitle>

                <p className="mt-1 text-sm text-muted-foreground">
                  Master bahan tanpa quantity dan HPP batch.
                </p>
              </div>

              <div className="relative w-full md:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(
                      event.target.value,
                    )
                  }}
                  placeholder="Cari bahan..."
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>

          <Separator />

          {isLoading ? (
            <InventorySkeleton />
          ) : error ? (
            <InventoryErrorState
              message={error}
              onRetry={() =>
                void fetchItems({
                  showLoading: true,
                })
              }
            />
          ) : items.length === 0 ? (
            <InventoryEmptyState
              hasSearch={Boolean(
                search.trim(),
              )}
              onClearSearch={() =>
                setSearch("")
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                        Bahan
                      </th>

                      <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                        Tipe
                      </th>

                      <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                        Unit
                      </th>

                      <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                        Status
                      </th>

                      <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                        Dibuat
                      </th>

                      <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map(
                      (item) => {
                        const Icon =
                          getTypeIcon(
                            item.type,
                          )

                        return (
                          <tr
                            key={item.id}
                            className="border-b last:border-0"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
                                  <Icon className="size-4" />
                                </div>

                                <div className="min-w-0">
                                  <p
                                    onClick={() =>
                                      void handleView(
                                        item,
                                      )
                                    } className="font-medium underline underline-offset-4 hover:text-primary hover:cursor-pointer">
                                    {item.name}
                                  </p>

                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {getTypeDescription(
                                      item.type,
                                    )}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <Badge variant="outline">
                                {getTypeLabel(
                                  item.type,
                                )}
                              </Badge>
                            </td>

                            <td className="px-6 py-4">
                              <span className="font-mono text-xs font-medium">
                                {item.unit}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              {item.isActive ? (
                                <Badge>
                                  Aktif
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  Nonaktif
                                </Badge>
                              )}
                            </td>

                            <td className="px-6 py-4 text-muted-foreground">
                              {formatDate(
                                item.createdAt,
                              )}
                            </td>

                            <td className="px-6 py-4 text-right">
                              <DropdownMenu>
                                {/*
                                  Trigger menggunakan button bawaan
                                  DropdownMenu. Tidak menggunakan asChild
                                  dan tidak membungkusnya dengan Button.
                                */}
                                <DropdownMenuTrigger
                                  type="button"
                                  className="inline-flex size-8 items-center justify-center rounded-md text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                                  aria-label={`Action ${item.name}`}
                                >
                                  <MoreHorizontal className="size-4" />
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      void handleView(
                                        item,
                                      )
                                    }
                                  >
                                    <Eye className="mr-2 size-4" />
                                    View
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleOpenEdit(
                                        item,
                                      )
                                    }
                                  >
                                    <Package className="mr-2 size-4" />
                                    Edit
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() =>
                                      handleOpenDelete(
                                        item,
                                      )
                                    }
                                  >
                                    <Trash2 className="mr-2 size-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        )
                      },
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Menampilkan{" "}
                  <span className="font-medium text-foreground">
                    {items.length}
                  </span>{" "}
                  dari{" "}
                  <span className="font-medium text-foreground">
                    {pagination.total}
                  </span>{" "}
                  bahan
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={
                      handlePreviousPage
                    }
                  >
                    <ChevronLeft className="mr-1 size-4" />
                    Sebelumnya
                  </Button>

                  <div className="min-w-24 text-center text-sm text-muted-foreground">
                    Halaman{" "}
                    <span className="font-medium text-foreground">
                      {page}
                    </span>{" "}
                    /{" "}
                    <span className="font-medium text-foreground">
                      {
                        pagination.totalPages
                      }
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      page >=
                      pagination.totalPages
                    }
                    onClick={
                      handleNextPage
                    }
                  >
                    Berikutnya
                    <ChevronRight className="ml-1 size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <Dialog
        open={
          Boolean(viewItem) ||
          isViewLoading ||
          Boolean(viewError)
        }
        onOpenChange={(open) => {
          if (!open) {
            setViewItem(null)
            setViewError(null)
          }
        }}
      >
        <DialogContent >
          <DialogHeader>
            <DialogTitle>
              Detail Bahan
            </DialogTitle>

            <DialogDescription>
              Informasi master inventory item.
            </DialogDescription>
          </DialogHeader>

          {isViewLoading ? (
            <div className="space-y-4 py-4">
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          ) : viewError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">
                Gagal mengambil detail
              </p>

              <p className="mt-1 text-sm text-destructive/80">
                {viewError}
              </p>
            </div>
          ) : viewItem ? (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl border bg-muted/30">
                  <Package className="size-5" />
                </div>

                <div>
                  <p className="font-semibold">
                    {viewItem.name}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    Inventory Item
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Tipe
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {getTypeLabel(
                      viewItem.type,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Unit
                  </p>

                  <p className="mt-1 font-mono text-sm font-medium">
                    {viewItem.unit}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Status
                  </p>

                  <div className="mt-1">
                    {viewItem.isActive ? (
                      <Badge>
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Nonaktif
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Dibuat
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDate(
                      viewItem.createdAt,
                    )}
                  </p>
                </div>
              </div>

              {viewItem._count ? (
                <>
                  <Separator />

                  <div>
                    <p className="text-sm font-medium">
                      Penggunaan Data
                    </p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">
                          Batch
                        </p>

                        <p className="mt-1 text-lg font-semibold">
                          {
                            viewItem._count
                              .batches
                          }
                        </p>
                      </div>

                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">
                          Recipe
                        </p>

                        <p className="mt-1 text-lg font-semibold">
                          {
                            viewItem._count
                              .recipeItems
                          }
                        </p>
                      </div>

                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">
                          Restock
                        </p>

                        <p className="mt-1 text-lg font-semibold">
                          {
                            viewItem._count
                              .restocks
                          }
                        </p>
                      </div>

                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">
                          Production
                        </p>

                        <p className="mt-1 text-lg font-semibold">
                          {
                            viewItem._count
                              .productions
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setViewItem(null)
                setViewError(null)
              }}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editItem)}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseEdit()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Bahan
            </DialogTitle>

            <DialogDescription>
              Perbarui informasi master bahan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                Nama Bahan
              </Label>

              <Input
                id="edit-name"
                value={editForm.name}
                disabled={isEditing}
                onChange={(event) =>
                  setEditForm(
                    (current) => ({
                      ...current,
                      name: event.target.value,
                    }),
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label>
                Tipe Bahan
              </Label>

              <div className="grid gap-2 sm:grid-cols-2">
                {typeOptions.map(
                  (option) => {
                    const selected =
                      editForm.type ===
                      option.value

                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={
                          isEditing
                        }
                        onClick={() =>
                          setEditForm(
                            (current) => ({
                              ...current,
                              type: option.value,
                            }),
                          )
                        }
                        className={[
                          "rounded-lg border p-3 text-left transition-colors",
                          selected
                            ? "border-foreground bg-muted"
                            : "hover:bg-muted/50",
                        ].join(" ")}
                      >
                        <p className="text-sm font-medium">
                          {
                            option.label
                          }
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {
                            option.description
                          }
                        </p>
                      </button>
                    )
                  },
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Unit
              </Label>

              <div className="grid gap-2 sm:grid-cols-2">
                {unitOptions.map(
                  (option) => {
                    const selected =
                      editForm.unit ===
                      option.value

                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={
                          isEditing
                        }
                        onClick={() =>
                          setEditForm(
                            (current) => ({
                              ...current,
                              unit: option.value,
                            }),
                          )
                        }
                        className={[
                          "rounded-lg border p-3 text-left transition-colors",
                          selected
                            ? "border-foreground bg-muted"
                            : "hover:bg-muted/50",
                        ].join(" ")}
                      >
                        <p className="font-mono text-sm font-semibold">
                          {
                            option.label
                          }
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {
                            option.description
                          }
                        </p>
                      </button>
                    )
                  },
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">
                  Status
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Tentukan apakah bahan masih aktif.
                </p>
              </div>

              <Button
                type="button"
                variant={
                  editForm.isActive
                    ? "default"
                    : "outline"
                }
                size="sm"
                disabled={isEditing}
                onClick={() =>
                  setEditForm(
                    (current) => ({
                      ...current,
                      isActive:
                        !current.isActive,
                    }),
                  )
                }
              >
                {editForm.isActive
                  ? "Aktif"
                  : "Nonaktif"}
              </Button>
            </div>

            {editError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm text-destructive">
                  {editError}
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isEditing}
              onClick={
                handleCloseEdit
              }
            >
              Batal
            </Button>

            <Button
              type="button"
              disabled={isEditing}
              onClick={() =>
                void handleUpdate()
              }
            >
              {isEditing ? (
                "Menyimpan..."
              ) : (
                <>
                  <Check className="mr-2 size-4" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteItem)}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDelete()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Hapus Bahan
            </DialogTitle>

            <DialogDescription>
              Bahan yang sudah memiliki histori
              tidak dapat dihapus.
            </DialogDescription>
          </DialogHeader>

          {deleteItem ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">
                  Bahan yang akan dihapus
                </p>

                <p className="mt-1 font-medium">
                  {deleteItem.name}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-confirmation">
                  Ketik ID bahan untuk konfirmasi
                </Label>

                <Input
                  id="delete-confirmation"
                  value={
                    deleteConfirmation
                  }
                  disabled={isDeleting}
                  onChange={(event) =>
                    setDeleteConfirmation(
                      event.target.value,
                    )
                  }
                  placeholder={
                    deleteItem.id
                  }
                />

                <p className="text-xs text-muted-foreground">
                  ID:{" "}
                  <span className="font-mono">
                    {deleteItem.id}
                  </span>
                </p>
              </div>

              {deleteError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive">
                    {deleteError}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={
                handleCloseDelete
              }
            >
              Batal
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={
                !deleteConfirmationIsValid ||
                isDeleting
              }
              onClick={() =>
                void handleDelete()
              }
            >
              {isDeleting ? (
                "Menghapus..."
              ) : (
                <>
                  <Trash2 className="mr-2 size-4" />
                  Hapus Bahan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}