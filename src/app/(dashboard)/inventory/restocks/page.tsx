"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

type InventoryUnit =
  | "ML"
  | "PCS";

type InventoryItemType =
  | "SEMI_FINISHED"
  | "DIRECT_USE";

type InventoryItem = {
  id: string;
  name: string;
  type: InventoryItemType;
  unit: InventoryUnit;
  isActive: boolean;
};

type InventoryBatch = {
  id: string;
  batchCode: string;
  sourceType:
    | "RESTOCK"
    | "PRODUCTION";
  quantity: string | number;
  remainingQuantity: string | number;
  unitCost: string | number;
  totalCost: string | number;
  createdAt: string;
  updatedAt: string;
};

type Restock = {
  id: string;
  inventoryItemId: string;
  batchId: string;
  quantity: string | number;
  totalCost: string | number;
  unitCost: string | number;
  supplierName: string | null;
  createdAt: string;
  inventoryItem: InventoryItem;
  batch: InventoryBatch;
};

type RestocksResponse = {
  success: boolean;
  data?: Restock[];
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type DeleteResponse = {
  success: boolean;
  message?: string;
};

/*
  Memformat angka menjadi Rupiah.
*/
function formatCurrency(
  value: string | number,
) {
  const number =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(number)) {
    return "Rp0";
  }

  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    },
  ).format(number);
}

/*
  Memformat quantity.
*/
function formatNumber(
  value: string | number,
) {
  const number =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat(
    "id-ID",
    {
      maximumFractionDigits: 2,
    },
  ).format(number);
}

/*
  Memformat tanggal.
*/
function formatDate(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

/*
  Loading state untuk tabel Restock.
*/
function RestockSkeleton() {
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
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-48 rounded bg-muted" />
            </div>

            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="size-8 rounded bg-muted" />
          </div>
        ),
      )}
    </div>
  );
}

/*
  Error state ketika API gagal.
*/
function RestockErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">
        Gagal memuat restock
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
  );
}

/*
  Empty state ketika tidak ada Restock.
*/
function RestockEmptyState({
  hasSearch,
  onClearSearch,
}: {
  hasSearch: boolean;
  onClearSearch: () => void;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Package className="size-5 text-muted-foreground" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">
        {hasSearch
          ? "Restock tidak ditemukan"
          : "Belum ada restock"}
      </h3>

      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {hasSearch
          ? "Tidak ada histori restock yang cocok dengan pencarian."
          : "Belum ada histori restock yang tercatat."}
      </p>

      {hasSearch ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={onClearSearch}
        >
          Hapus Pencarian
        </Button>
      ) : (
        <Link href="/inventory/restocks/new">
          <Button
            type="button"
            className="mt-4"
          >
            <Plus className="mr-2 size-4" />
            Input Restock
          </Button>
        </Link>
      )}
    </div>
  );
}

export default function RestocksPage() {
  const router = useRouter();

  const [restocks, setRestocks] =
    React.useState<Restock[]>(
      [],
    );

  const [search, setSearch] =
    React.useState("");

  const [
    debouncedSearch,
    setDebouncedSearch,
  ] = React.useState("");

  const [page, setPage] =
    React.useState(1);

  const [
    pagination,
    setPagination,
  ] = React.useState<
    RestocksResponse["pagination"]
  >();

  const [
    isLoading,
    setIsLoading,
  ] = React.useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = React.useState(false);

  const [error, setError] =
    React.useState<string | null>(
      null,
    );

  const [
    deleteItem,
    setDeleteItem,
  ] = React.useState<Restock | null>(
    null,
  );

  const [
    isDeleting,
    setIsDeleting,
  ] = React.useState(false);

  /*
    Debounce pencarian agar API tidak dipanggil
    pada setiap karakter yang diketik.
  */
  React.useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setDebouncedSearch(
          search.trim(),
        );

        setPage(1);
      }, 400);

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [search]);

  /*
    Mengambil data Restock dari API.
  */
  const fetchRestocks =
    React.useCallback(
      async (
        currentPage: number,
        currentSearch: string,
        options?: {
          showLoading?: boolean;
          showRefreshing?: boolean;
        },
      ) => {
        try {
          if (
            options?.showLoading
          ) {
            setIsLoading(true);
          }

          if (
            options?.showRefreshing
          ) {
            setIsRefreshing(true);
          }

          setError(null);

          const params =
            new URLSearchParams();

          params.set(
            "page",
            String(currentPage),
          );

          params.set(
            "limit",
            "10",
          );

          if (currentSearch) {
            params.set(
              "search",
              currentSearch,
            );
          }

          const response =
            await fetch(
              `/api/inventory/restocks?${params.toString()}`,
              {
                method: "GET",
                headers: {
                  Accept:
                    "application/json",
                },
                cache: "no-store",
              },
            );

          const result =
            (await response.json()) as RestocksResponse;

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ??
                "Gagal mengambil data restock.",
            );
          }

          setRestocks(
            result.data ?? [],
          );

          setPagination(
            result.pagination,
          );
        } catch (error) {
          console.error(
            "[RestocksPage] fetch:",
            error,
          );

          setError(
            error instanceof Error
              ? error.message
              : "Gagal mengambil data restock.",
          );
        } finally {
          if (
            options?.showLoading
          ) {
            setIsLoading(false);
          }

          if (
            options?.showRefreshing
          ) {
            setIsRefreshing(false);
          }
        }
      },
      [],
    );

  React.useEffect(() => {
    void fetchRestocks(
      page,
      debouncedSearch,
      {
        showLoading: true,
      },
    );
  }, [
    page,
    debouncedSearch,
    fetchRestocks,
  ]);

  /*
    Refresh data Restock.
  */
  function handleRefresh() {
    void fetchRestocks(
      page,
      debouncedSearch,
      {
        showRefreshing: true,
      },
    );
  }

  /*
    Menghapus Restock.
  */
  async function handleDelete() {
    if (
      !deleteItem ||
      isDeleting
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);

      const response =
        await fetch(
          `/api/inventory/restocks/${encodeURIComponent(
            deleteItem.id,
          )}`,
          {
            method: "DELETE",
            headers: {
              Accept:
                "application/json",
            },
          },
        );

      const result =
        (await response.json()) as DeleteResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Gagal menghapus restock.",
        );
      }

      setDeleteItem(null);

      await fetchRestocks(
        page,
        debouncedSearch,
        {
          showRefreshing: true,
        },
      );
    } catch (error) {
      console.error(
        "[RestocksPage] delete:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Gagal menghapus restock.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const hasSearch =
    search.trim().length > 0;

  const totalPages =
    pagination?.totalPages ?? 0;

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Restock
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Catat stok masuk dan harga pembelian material.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={
                handleRefresh
              }
              disabled={
                isLoading ||
                isRefreshing
              }
            >
              <RefreshCw
                className={`mr-2 size-4 ${
                  isRefreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh
            </Button>

            <Link href="/inventory/restocks/new">
              <Button type="button">
                <Plus className="mr-2 size-4" />
                Input Restock
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base">
                Histori Restock
              </CardTitle>

              <div className="relative w-full md:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(
                    event,
                  ) => {
                    setSearch(
                      event.target.value,
                    );
                  }}
                  placeholder="Cari bahan, supplier, batch..."
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <RestockSkeleton />
            ) : error ? (
              <RestockErrorState
                message={error}
                onRetry={() => {
                  void fetchRestocks(
                    page,
                    debouncedSearch,
                    {
                      showRefreshing:
                        true,
                    },
                  );
                }}
              />
            ) : restocks.length ===
              0 ? (
              <RestockEmptyState
                hasSearch={hasSearch}
                onClearSearch={() => {
                  setSearch("");
                }}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-6 py-3 text-left font-medium">
                          Bahan
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          Batch
                        </th>

                        <th className="px-4 py-3 text-right font-medium">
                          Quantity
                        </th>

                        <th className="px-4 py-3 text-right font-medium">
                          Total Cost
                        </th>

                        <th className="px-4 py-3 text-right font-medium">
                          HPP / Unit
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          Supplier
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          Tanggal
                        </th>

                        <th className="w-16 px-4 py-3" />
                      </tr>
                    </thead>

                    <tbody>
                      {restocks.map(
                        (
                          restock,
                        ) => {
                          /*
                            Edit dan hapus hanya tersedia apabila
                            seluruh stok batch masih tersisa.
                          */
                          const isEditable =
                            Number(
                              restock
                                .batch
                                .remainingQuantity,
                            ) ===
                            Number(
                              restock
                                .batch
                                .quantity,
                            );

                          return (
                            <tr
                              key={
                                restock.id
                              }
                              className="border-b last:border-b-0 hover:bg-muted/30"
                            >
                              <td className="px-6 py-4">
                                <div className="font-medium">
                                  {
                                    restock
                                      .inventoryItem
                                      .name
                                  }
                                </div>

                                <div className="mt-1 text-xs text-muted-foreground">
                                  {
                                    restock
                                      .inventoryItem
                                      .unit
                                  }
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <div className="font-mono text-xs">
                                  {
                                    restock
                                      .batch
                                      .batchCode
                                  }
                                </div>

                                <Badge
                                  variant="secondary"
                                  className="mt-1"
                                >
                                  RESTOCK
                                </Badge>
                              </td>

                              <td className="px-4 py-4 text-right">
                                {formatNumber(
                                  restock.quantity,
                                )}{" "}
                                {
                                  restock
                                    .inventoryItem
                                    .unit
                                }
                              </td>

                              <td className="px-4 py-4 text-right">
                                {formatCurrency(
                                  restock.totalCost,
                                )}
                              </td>

                              <td className="px-4 py-4 text-right font-medium">
                                {formatCurrency(
                                  restock.unitCost,
                                )}
                                /
                                {
                                  restock
                                    .inventoryItem
                                    .unit
                                }
                              </td>

                              <td className="px-4 py-4">
                                {restock.supplierName ||
                                  "-"}
                              </td>

                              <td className="px-4 py-4 text-muted-foreground">
                                {formatDate(
                                  restock.createdAt,
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    type="button"
                                    className="inline-flex size-8 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label={`Aksi ${restock.inventoryItem.name}`}
                                  >
                                    <MoreHorizontal className="size-4" />
                                  </DropdownMenuTrigger>

                                  <DropdownMenuContent
                                    align="end"
                                    className="min-w-44"
                                  >
                                    <DropdownMenuItem
                                      onClick={() => {
                                        router.push(
                                          `/inventory/restocks/${encodeURIComponent(
                                            restock.id,
                                          )}`,
                                        );
                                      }}
                                    >
                                      <Eye className="mr-2 size-4" />
                                      Lihat Detail
                                    </DropdownMenuItem>

                                    {isEditable ? (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          router.push(
                                            `/inventory/restocks/${encodeURIComponent(
                                              restock.id,
                                            )}/edit`,
                                          );
                                        }}
                                      >
                                        <Pencil className="mr-2 size-4" />
                                        Edit
                                      </DropdownMenuItem>
                                    ) : null}

                                    {isEditable ? (
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => {
                                          setDeleteItem(
                                            restock,
                                          );
                                        }}
                                      >
                                        <Trash2 className="mr-2 size-4" />
                                        Hapus
                                      </DropdownMenuItem>
                                    ) : null}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    {pagination?.total ??
                      0}{" "}
                    restock
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        page <= 1
                      }
                      onClick={() => {
                        setPage(
                          (current) =>
                            Math.max(
                              1,
                              current -
                                1,
                            ),
                        );
                      }}
                    >
                      <ChevronLeft className="mr-1 size-4" />
                      Sebelumnya
                    </Button>

                    <span className="min-w-20 text-center text-sm">
                      Halaman{" "}
                      {page}{" "}
                      dari{" "}
                      {totalPages ||
                        1}
                    </span>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        totalPages ===
                          0 ||
                        page >=
                          totalPages
                      }
                      onClick={() => {
                        setPage(
                          (current) =>
                            current +
                            1,
                        );
                      }}
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
      </div>

      <Dialog
        open={
          deleteItem !== null
        }
        onOpenChange={(
          open,
        ) => {
          if (
            !open &&
            !isDeleting
          ) {
            setDeleteItem(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Hapus Restock?
            </DialogTitle>

            <DialogDescription>
              Restock{" "}
              <strong>
                {
                  deleteItem
                    ?.batch
                    .batchCode
                }
              </strong>{" "}
              akan dihapus beserta batch dan stok
              batch tersebut.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={
                isDeleting
              }
              onClick={() => {
                setDeleteItem(null);
              }}
            >
              Batal
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={
                isDeleting
              }
              onClick={() => {
                void handleDelete();
              }}
            >
              {isDeleting
                ? "Menghapus..."
                : "Hapus Restock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}