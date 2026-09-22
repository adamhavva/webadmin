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

type RecipeStatus =
  | "ACTIVE"
  | "INACTIVE";

type Recipe = {
  id: string;
  productId: string;
  productName: string;
  version: number;
  ingredientCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type RecipeIngredient = {
  id: string;
  quantity: string | number;
  inventoryItem: {
    id: string;
    name: string;
    type: string;
    unit: string;
    isActive: boolean;
  };
};

type RecipeHistory = {
  id: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type RecipeDetail = {
  id: string;
  productId: string;
  productName: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredient[];
  history: RecipeHistory[];
};

type RecipesResponse = {
  success: boolean;
  data?: Recipe[];
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type RecipeDetailResponse = {
  success: boolean;
  data?: RecipeDetail;
  message?: string;
};

type DeleteResponse = {
  success: boolean;
  message?: string;
};

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
  Loading state untuk tabel Recipe.
*/
function RecipeSkeleton() {
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

            <div className="h-4 w-16 rounded bg-muted" />
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
function RecipeErrorState({
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
        Gagal memuat resep
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
  Empty state ketika tidak ada Recipe.
*/
function RecipeEmptyState({
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
          ? "Resep tidak ditemukan"
          : "Belum ada resep"}
      </h3>

      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {hasSearch
          ? "Tidak ada resep yang cocok dengan pencarian."
          : "Belum ada resep produk yang terdaftar."}
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
        <Link href="/inventory/recipes/new">
          <Button
            type="button"
            className="mt-4"
          >
            <Plus className="mr-2 size-4" />
            Tambah Resep
          </Button>
        </Link>
      )}
    </div>
  );
}

export default function RecipesPage() {
  const router = useRouter();

  const [recipes, setRecipes] =
    React.useState<Recipe[]>(
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
      "ALL" | RecipeStatus
    >("ALL");

  const [page, setPage] =
    React.useState(1);

  const [
    pagination,
    setPagination,
  ] = React.useState<
    RecipesResponse["pagination"]
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
    viewRecipe,
    setViewRecipe,
  ] = React.useState<
    RecipeDetail | undefined
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
    deleteRecipe,
    setDeleteRecipe,
  ] = React.useState<Recipe | null>(
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
    Mengambil daftar Recipe dari API.
  */
  const fetchRecipes =
    React.useCallback(
      async (
        currentPage: number,
        currentSearch: string,
        currentStatus:
          | "ALL"
          | RecipeStatus,
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
              `/api/inventory/recipes?${params.toString()}`,
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
            (await response.json()) as RecipesResponse;

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ??
              "Gagal mengambil data resep.",
            );
          }

          setRecipes(
            result.data ?? [],
          );

          setPagination(
            result.pagination,
          );
        } catch (error) {
          console.error(
            "[RecipesPage] fetch:",
            error,
          );

          setError(
            error instanceof Error
              ? error.message
              : "Gagal mengambil data resep.",
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
    void fetchRecipes(
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
    fetchRecipes,
  ]);

  /*
    Refresh data Recipe.
  */
  function handleRefresh() {
    void fetchRecipes(
      page,
      debouncedSearch,
      status,
      {
        showRefreshing: true,
      },
    );
  }

  /*
    Melihat detail Recipe.
  */
  async function handleView(
    recipe: Recipe,
  ) {
    try {
      setDetailError(null);
      setViewRecipe(undefined);
      setIsDetailLoading(true);

      const response =
        await fetch(
          `/api/inventory/recipes/${encodeURIComponent(
            recipe.id,
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
        (await response.json()) as RecipeDetailResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.message ??
          "Gagal mengambil detail resep.",
        );
      }

      setViewRecipe(
        result.data,
      );
    } catch (error) {
      console.error(
        "[RecipesPage] detail:",
        error,
      );

      setDetailError(
        error instanceof Error
          ? error.message
          : "Gagal mengambil detail resep.",
      );
    } finally {
      setIsDetailLoading(false);
    }
  }

  /*
    Menonaktifkan Recipe.
  */
  async function handleDelete() {
    if (
      !deleteRecipe ||
      isDeleting
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);

      const response =
        await fetch(
          `/api/inventory/recipes/${encodeURIComponent(
            deleteRecipe.id,
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
          "Gagal menonaktifkan resep.",
        );
      }

      setDeleteRecipe(null);

      await fetchRecipes(
        page,
        debouncedSearch,
        status,
        {
          showRefreshing: true,
        },
      );
    } catch (error) {
      console.error(
        "[RecipesPage] delete:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Gagal menonaktifkan resep.",
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
              Resep
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Kelola komposisi bahan dan versi resep setiap produk.
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

            <Link href="/inventory/recipes/new">
              <Button type="button">
                <Plus className="mr-2 size-4" />
                Tambah Resep
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base">
                Daftar Resep
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
                        | RecipeStatus,
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
              <RecipeSkeleton />
            ) : error ? (
              <RecipeErrorState
                message={error}
                onRetry={() => {
                  void fetchRecipes(
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
            ) : recipes.length ===
              0 ? (
              <RecipeEmptyState
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

                        <th className="px-4 py-3 text-center font-medium">
                          Versi
                        </th>

                        <th className="px-4 py-3 text-center font-medium">
                          Jumlah Bahan
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
                      {recipes.map(
                        (
                          recipe,
                        ) => {
                          return (
                            <tr
                              key={
                                recipe.id
                              }
                              className="border-b last:border-b-0 hover:bg-muted/30"
                            >
                              <td className="px-6 py-4">
                                <div className="font-medium">
                                  {
                                    recipe.productName
                                  }
                                </div>

                                <div className="mt-1 font-mono text-xs text-muted-foreground">
                                  {
                                    recipe.productId
                                  }
                                </div>
                              </td>

                              <td className="px-4 py-4 text-center">
                                <Badge variant="outline">
                                  v
                                  {
                                    recipe.version
                                  }
                                </Badge>
                              </td>

                              <td className="px-4 py-4 text-center">
                                {
                                  recipe.ingredientCount
                                }{" "}
                                bahan
                              </td>

                              <td className="px-4 py-4">
                                {recipe.isActive ? (
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
                                  recipe.createdAt,
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    type="button"
                                    className="inline-flex size-8 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label={`Aksi ${recipe.productName} v${recipe.version}`}
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
                                          recipe,
                                        );
                                      }}
                                    >
                                      <Eye className="mr-2 size-4" />
                                      Lihat Detail
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => {
                                        router.push(
                                          `/inventory/recipes/${encodeURIComponent(
                                            recipe.id,
                                          )}/edit`,
                                        );
                                      }}
                                    >
                                      <Pencil className="mr-2 size-4" />
                                      Edit
                                    </DropdownMenuItem>

                                    {recipe.isActive ? (
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => {
                                          setError(
                                            null,
                                          );

                                          setDeleteRecipe(
                                            recipe,
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
                    resep
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
          viewRecipe !==
            undefined ||
          isDetailLoading ||
          detailError !== null
        }
        onOpenChange={(
          open,
        ) => {
          if (!open) {
            setViewRecipe(
              undefined,
            );

            setDetailError(
              null,
            );

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
                  Detail Resep
                </DialogTitle>

                <DialogDescription>
                  Memuat detail resep...
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
                    setViewRecipe(
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
          ) : viewRecipe ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {viewRecipe.productName}
                </DialogTitle>

                <DialogDescription>
                  Detail resep v
                  {
                    viewRecipe.version
                  } dan riwayat versinya.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">
                      Produk
                    </p>

                    <p className="mt-1 font-semibold">
                      {
                        viewRecipe.productName
                      }
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">
                      Versi
                    </p>

                    <p className="mt-1 font-semibold">
                      v
                      {
                        viewRecipe.version
                      }
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">
                      Status
                    </p>

                    <div className="mt-2">
                      {viewRecipe.isActive ? (
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
                      Bahan Resep
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Komposisi bahan untuk satu unit produk.
                    </p>
                  </div>

                  {viewRecipe.ingredients
                    .length ===
                  0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Tidak ada bahan.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-lg border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/40">
                            <th className="px-4 py-3 text-left font-medium">
                              Bahan
                            </th>

                            <th className="px-4 py-3 text-left font-medium">
                              Tipe
                            </th>

                            <th className="px-4 py-3 text-right font-medium">
                              Quantity
                            </th>

                            <th className="px-4 py-3 text-left font-medium">
                              Unit
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {viewRecipe.ingredients.map(
                            (
                              ingredient,
                            ) => (
                              <tr
                                key={
                                  ingredient.id
                                }
                                className="border-b last:border-b-0"
                              >
                                <td className="px-4 py-3">
                                  <div className="font-medium">
                                    {
                                      ingredient
                                        .inventoryItem
                                        .name
                                    }
                                  </div>
                                </td>

                                <td className="px-4 py-3 text-muted-foreground">
                                  {
                                    ingredient
                                      .inventoryItem
                                      .type
                                  }
                                </td>

                                <td className="px-4 py-3 text-right font-medium">
                                  {
                                    ingredient.quantity
                                  }
                                </td>

                                <td className="px-4 py-3">
                                  {
                                    ingredient
                                      .inventoryItem
                                      .unit
                                  }
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold">
                      Riwayat Versi
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Perubahan resep disimpan sebagai versi baru.
                    </p>
                  </div>

                  {viewRecipe.history
                    .length ===
                  0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Belum ada riwayat versi.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {viewRecipe.history.map(
                        (
                          history,
                        ) => (
                          <div
                            key={
                              history.id
                            }
                            className="flex items-center justify-between rounded-lg border px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                Resep v
                                {
                                  history.version
                                }
                              </p>

                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatDate(
                                  history.createdAt,
                                )}
                              </p>
                            </div>

                            {history.isActive ? (
                              <Badge>
                                Aktif
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Nonaktif
                              </Badge>
                            )}
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
                    setViewRecipe(
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
          deleteRecipe !== null
        }
        onOpenChange={(
          open,
        ) => {
          if (
            !open &&
            !isDeleting
          ) {
            setDeleteRecipe(
              null,
            );
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Nonaktifkan Resep?
            </DialogTitle>

            <DialogDescription>
              Resep{" "}
              <strong>
                {deleteRecipe?.productName}
              </strong>{" "}
              versi{" "}
              <strong>
                v
                {
                  deleteRecipe?.version
                }
              </strong>{" "}
              akan dinonaktifkan. Riwayat resep tetap dipertahankan.
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
                setDeleteRecipe(
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