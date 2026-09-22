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

type Product = {
  id: string;
  name: string;
  sellingPrice: string | number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  activeRecipe: {
    id: string;
    version: number;
    ingredientCount: number;
  } | null;
};

type ProductDetail = {
  id: string;
  name: string;
  sellingPrice: string | number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  recipes: Array<{
    id: string;
    version: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    items: Array<{
      id: string;
      quantity: string | number;
      inventoryItem: {
        id: string;
        name: string;
        type: string;
        unit: string;
        isActive: boolean;
      };
    }>;
  }>;
};

type ProductsResponse = {
  success: boolean;
  data?: Product[];
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ProductDetailResponse = {
  success: boolean;
  data?: ProductDetail;
  message?: string;
};

type DeleteResponse = {
  success: boolean;
  message?: string;
};

/*
  Memformat harga menjadi Rupiah.
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
  Loading state untuk tabel Product.
*/
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
            <div className="h-4 w-20 rounded bg-muted" />
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
function ProductErrorState({
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
  );
}

/*
  Empty state ketika tidak ada Product.
*/
function ProductEmptyState({
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
          ? "Produk tidak ditemukan"
          : "Belum ada produk"}
      </h3>

      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
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
          Hapus Pencarian
        </Button>
      ) : (
        <Link href="/inventory/products/new">
          <Button
            type="button"
            className="mt-4"
          >
            <Plus className="mr-2 size-4" />
            Tambah Produk
          </Button>
        </Link>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts] =
    React.useState<Product[]>(
      [],
    );

  const [search, setSearch] =
    React.useState("");

  const [
    debouncedSearch,
    setDebouncedSearch,
  ] = React.useState("");

  const [status, setStatus] =
    React.useState<
      "ALL" | "ACTIVE" | "INACTIVE"
    >("ALL");

  const [page, setPage] =
    React.useState(1);

  const [
    pagination,
    setPagination,
  ] = React.useState<
    ProductsResponse["pagination"]
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
    viewProduct,
    setViewProduct,
  ] = React.useState<
    ProductDetail | undefined
  >(undefined);

  const [
    isDetailLoading,
    setIsDetailLoading,
  ] = React.useState(false);

  const [
    detailError,
    setDetailError,
  ] = React.useState<
    string | null
  >(null);

  const [
    deleteProduct,
    setDeleteProduct,
  ] = React.useState<Product | null>(
    null,
  );

  const [
    isDeleting,
    setIsDeleting,
  ] = React.useState(false);

  /*
    Debounce pencarian.
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
    Mengambil daftar Product dari API.
  */
  const fetchProducts =
    React.useCallback(
      async (
        currentPage: number,
        currentSearch: string,
        currentStatus:
          | "ALL"
          | "ACTIVE"
          | "INACTIVE",
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

          if (
            currentStatus !==
            "ALL"
          ) {
            params.set(
              "isActive",
              currentStatus ===
                "ACTIVE"
                ? "true"
                : "false",
            );
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
            );

          const result =
            (await response.json()) as ProductsResponse;

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ??
              "Gagal mengambil data produk.",
            );
          }

          setProducts(
            result.data ?? [],
          );

          setPagination(
            result.pagination,
          );
        } catch (error) {
          console.error(
            "[ProductsPage] fetch:",
            error,
          );

          setError(
            error instanceof Error
              ? error.message
              : "Gagal mengambil data produk.",
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
    void fetchProducts(
      page,
      debouncedSearch,
      status,
      {
        showLoading: true,
      },
    );
  }, [
    page,
    debouncedSearch,
    status,
    fetchProducts,
  ]);

  /*
    Refresh data Product.
  */
  function handleRefresh() {
    void fetchProducts(
      page,
      debouncedSearch,
      status,
      {
        showRefreshing: true,
      },
    );
  }

  /*
    Melihat detail Product.
  */
  async function handleView(
    product: Product,
  ) {
    try {
      setDetailError(null);
      setViewProduct(undefined);
      setIsDetailLoading(true);

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
        );

      const result =
        (await response.json()) as ProductDetailResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.message ??
          "Gagal mengambil detail produk.",
        );
      }

      setViewProduct(
        result.data,
      );
    } catch (error) {
      console.error(
        "[ProductsPage] detail:",
        error,
      );

      setDetailError(
        error instanceof Error
          ? error.message
          : "Gagal mengambil detail produk.",
      );
    } finally {
      setIsDetailLoading(false);
    }
  }

  /*
    Menonaktifkan Product.
  */
  async function handleDelete() {
    if (
      !deleteProduct ||
      isDeleting
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);

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
        );

      const result =
        (await response.json()) as DeleteResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
          "Gagal menonaktifkan produk.",
        );
      }

      setDeleteProduct(null);

      await fetchProducts(
        page,
        debouncedSearch,
        status,
        {
          showRefreshing: true,
        },
      );
    } catch (error) {
      console.error(
        "[ProductsPage] delete:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Gagal menonaktifkan produk.",
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
              Produk
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Kelola produk yang dijual dan resep produknya.
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

            <Link href="/inventory/products/new">
              <Button type="button">
                <Plus className="mr-2 size-4" />
                Tambah Produk
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base">
                Daftar Produk
              </CardTitle>

              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                <div className="relative w-full sm:w-80">
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
                    placeholder="Cari produk..."
                    className="pl-9"
                  />
                </div>

                <select
                  value={status}
                  onChange={(
                    event,
                  ) => {
                    setStatus(
                      event.target
                        .value as
                        | "ALL"
                        | "ACTIVE"
                        | "INACTIVE",
                    );

                    setPage(1);
                  }}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="ALL">
                    Semua Status
                  </option>

                  <option value="ACTIVE">
                    Aktif
                  </option>

                  <option value="INACTIVE">
                    Nonaktif
                  </option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <ProductSkeleton />
            ) : error ? (
              <ProductErrorState
                message={error}
                onRetry={() => {
                  void fetchProducts(
                    page,
                    debouncedSearch,
                    status,
                    {
                      showRefreshing:
                        true,
                    },
                  );
                }}
              />
            ) : products.length ===
              0 ? (
              <ProductEmptyState
                hasSearch={hasSearch}
                onClearSearch={() => {
                  setSearch("");
                }}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-6 py-3 text-left font-medium">
                          Produk
                        </th>

                        <th className="px-4 py-3 text-right font-medium">
                          Harga Jual
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          Resep Aktif
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          Status
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          Dibuat
                        </th>

                        <th className="w-16 px-4 py-3" />
                      </tr>
                    </thead>

                    <tbody>
                      {products.map(
                        (
                          product,
                        ) => {
                          return (
                            <tr
                              key={
                                product.id
                              }
                              className="border-b last:border-b-0 hover:bg-muted/30"
                            >
                              <td className="px-6 py-4">
                                <div className="font-medium">
                                  {
                                    product.name
                                  }
                                </div>
                              </td>

                              <td className="px-4 py-4 text-right font-medium">
                                {formatCurrency(
                                  product.sellingPrice,
                                )}
                              </td>

                              <td className="px-4 py-4">
                                {product.activeRecipe ? (
                                  <div>
                                    <div className="font-medium">
                                      v
                                      {
                                        product
                                          .activeRecipe
                                          .version
                                      }
                                    </div>

                                    <div className="mt-1 text-xs text-muted-foreground">
                                      {
                                        product
                                          .activeRecipe
                                          .ingredientCount
                                      }{" "}
                                      bahan
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    Belum ada
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-4">
                                {product.isActive ? (
                                  <Badge>
                                    Aktif
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    Nonaktif
                                  </Badge>
                                )}
                              </td>

                              <td className="px-4 py-4 text-muted-foreground">
                                {formatDate(
                                  product.createdAt,
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    type="button"
                                    className="inline-flex size-8 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label={`Aksi ${product.name}`}
                                  >
                                    <MoreHorizontal className="size-4" />
                                  </DropdownMenuTrigger>

                                  <DropdownMenuContent
                                    align="end"
                                    className="min-w-44"
                                  >
                                    <DropdownMenuItem
                                      onClick={() => {
                                        void handleView(
                                          product,
                                        );
                                      }}
                                    >
                                      <Eye className="mr-2 size-4" />
                                      Lihat Detail
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => {
                                        router.push(
                                          `/inventory/products/${encodeURIComponent(
                                            product.id,
                                          )}/edit`,
                                        );
                                      }}
                                    >
                                      <Pencil className="mr-2 size-4" />
                                      Edit
                                    </DropdownMenuItem>

                                    {product.isActive ? (
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => {
                                          setError(
                                            null,
                                          );

                                          setDeleteProduct(
                                            product,
                                          );
                                        }}
                                      >
                                        <Trash2 className="mr-2 size-4" />
                                        Nonaktifkan
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
                    produk
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
          viewProduct !==
          undefined ||
          isDetailLoading ||
          detailError !== null
        }
        onOpenChange={(
          open,
        ) => {
          if (!open) {
            setViewProduct(
              undefined,
            );
            setDetailError(null);
            setIsDetailLoading(
              false,
            );
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {isDetailLoading ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Detail Produk
                </DialogTitle>

                <DialogDescription>
                  Memuat detail produk...
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-4">
                <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-24 animate-pulse rounded-lg bg-muted" />
              </div>
            </>
          ) : detailError ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Gagal Memuat Detail
                </DialogTitle>

                <DialogDescription>
                  {detailError}
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setViewProduct(
                      undefined,
                    );
                    setDetailError(
                      null,
                    );
                  }}
                >
                  Tutup
                </Button>
              </DialogFooter>
            </>
          ) : viewProduct ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {viewProduct.name}
                </DialogTitle>

                <DialogDescription>
                  Detail produk dan riwayat resep.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">
                      Harga Jual
                    </p>

                    <p className="mt-1 font-semibold">
                      {formatCurrency(
                        viewProduct.sellingPrice,
                      )}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">
                      Status
                    </p>

                    <div className="mt-2">
                      {viewProduct.isActive ? (
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
                </div>

                <div>
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold">
                      Riwayat Resep
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Semua versi resep produk ini.
                    </p>
                  </div>

                  {viewProduct.recipes
                    .length ===
                  0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Belum ada resep.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {viewProduct.recipes.map(
                        (
                          recipe,
                        ) => (
                          <div
                            key={
                              recipe.id
                            }
                            className="rounded-lg border"
                          >
                            <div className="flex items-center justify-between border-b px-4 py-3">
                              <div>
                                <p className="font-medium">
                                  Resep v
                                  {
                                    recipe.version
                                  }
                                </p>

                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatDate(
                                    recipe.createdAt,
                                  )}
                                </p>
                              </div>

                              {recipe.isActive ? (
                                <Badge>
                                  Aktif
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  Nonaktif
                                </Badge>
                              )}
                            </div>

                            <div className="divide-y">
                              {recipe.items
                                .length ===
                              0 ? (
                                <div className="px-4 py-4 text-sm text-muted-foreground">
                                  Tidak ada bahan.
                                </div>
                              ) : (
                                recipe.items.map(
                                  (
                                    item,
                                  ) => (
                                    <div
                                      key={
                                        item.id
                                      }
                                      className="flex items-center justify-between gap-4 px-4 py-3"
                                    >
                                      <div>
                                        <p className="text-sm font-medium">
                                          {
                                            item
                                              .inventoryItem
                                              .name
                                          }
                                        </p>

                                        <p className="mt-1 text-xs text-muted-foreground">
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
                                )
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setViewProduct(
                      undefined,
                    );
                  }}
                >
                  Tutup
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={
          deleteProduct !== null
        }
        onOpenChange={(
          open,
        ) => {
          if (
            !open &&
            !isDeleting
          ) {
            setDeleteProduct(
              null,
            );
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Nonaktifkan Produk?
            </DialogTitle>

            <DialogDescription>
              Produk{" "}
              <strong>
                {
                  deleteProduct?.name
                }
              </strong>{" "}
              akan dinonaktifkan. Data produk dan
              riwayat resep tetap dipertahankan.
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
                setDeleteProduct(
                  null,
                );
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
                ? "Menonaktifkan..."
                : "Nonaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}