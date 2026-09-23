"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Eye,
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  PowerOff,
  RefreshCw,
  Search,
  Tag,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type Product = {
  id: string;
  name: string;
  description: string | null;
  sellingPrice: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  primaryImage: { id: string; url: string; isPrimary: boolean } | null;
  imageCount: number;
  metadataCount: number;
  activeRecipe: { id: string; version: number } | null;
  recipeCount: number;
  lastHpp: number | null;
  totalStock: number;
};

type ListResponse = {
  success: boolean;
  data?: {
    items: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: { message?: string };
};

type MutationResponse = {
  success: boolean;
  error?: { message?: string };
};

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

// ============================================================
// Helpers
// ============================================================

function formatRupiah(v: string | number): string {
  const n = typeof v === "string" ? Number(v) : v;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatNumber(v: string | number): string {
  const n = typeof v === "string" ? Number(v) : v;
  return new Intl.NumberFormat("id-ID").format(n);
}

function truncate(s: string | null, len: number): string {
  if (!s) return "-";
  if (s.length <= len) return s;
  return s.slice(0, len) + "...";
}

// ============================================================
// Skeleton / Error / Empty
// ============================================================

function ProductSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-4">
          <div className="size-12 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

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
      <h3 className="mt-4 text-sm font-semibold">Gagal memuat produk</h3>
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

function ProductEmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Coffee className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">
        {hasSearch ? "Produk tidak ditemukan" : "Belum ada produk"}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {hasSearch
          ? "Tidak ada produk yang cocok dengan filter."
          : "Tambahkan produk pertama untuk memulai."}
      </p>
      {!hasSearch && (
        <Link
          href="/inventory/products/new"
          className={cn(buttonVariants(), "mt-4")}
        >
          <Plus className="mr-2 size-4" />
          Tambah Produk
        </Link>
      )}
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export function ProductListPage() {
  const router = useRouter();

  const [products, setProducts] = React.useState<Product[]>([]);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<
    { total: number; totalPages: number } | undefined
  >();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [disableTarget, setDisableTarget] = React.useState<Product | null>(
    null
  );
  const [isDisabling, setIsDisabling] = React.useState(false);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchProducts = React.useCallback(
    async (
      currentPage: number,
      currentSearch: string,
      currentStatus: StatusFilter,
      options?: { showLoading?: boolean; showRefreshing?: boolean }
    ) => {
      try {
        if (options?.showLoading) setIsLoading(true);
        if (options?.showRefreshing) setIsRefreshing(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("page", String(currentPage));
        params.set("limit", "10");

        if (currentSearch) params.set("search", currentSearch);
        if (currentStatus !== "ALL") {
          params.set(
            "isActive",
            currentStatus === "ACTIVE" ? "true" : "false"
          );
        }

        const res = await fetch(
          `/api/inventory/products?${params.toString()}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );

        const json = (await res.json()) as ListResponse;

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "Gagal memuat produk.");
        }

        setProducts(json.data.items);
        setPagination(json.data.pagination);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat produk."
        );
      } finally {
        if (options?.showLoading) setIsLoading(false);
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    []
  );

  React.useEffect(() => {
    void fetchProducts(page, debouncedSearch, statusFilter, {
      showLoading: true,
    });
  }, [page, debouncedSearch, statusFilter, fetchProducts]);

  function handleRefresh() {
    void fetchProducts(page, debouncedSearch, statusFilter, {
      showRefreshing: true,
    });
  }

  async function handleDisable() {
    if (!disableTarget || isDisabling) return;

    try {
      setIsDisabling(true);
      const res = await fetch(
        `/api/inventory/products/${encodeURIComponent(disableTarget.id)}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        }
      );

      const json = (await res.json()) as MutationResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal menonaktifkan.");
      }

      setDisableTarget(null);
      await fetchProducts(page, debouncedSearch, statusFilter, {
        showRefreshing: true,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menonaktifkan."
      );
    } finally {
      setIsDisabling(false);
    }
  }

  const hasSearch = search.trim().length > 0 || statusFilter !== "ALL";
  const totalPages = pagination?.totalPages ?? 0;

  return (
    <>
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Produk</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Kelola produk yang dijual, resep, dan HPP-nya.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw
                className={cn(
                  "mr-2 size-4",
                  isRefreshing && "animate-spin"
                )}
              />
              Refresh
            </Button>

            <Link
              href="/inventory/products/new"
              className={cn(buttonVariants())}
            >
              <Plus className="mr-2 size-4" />
              Tambah Produk
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base">Daftar Produk</CardTitle>

              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama produk..."
                    className="pl-9"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as StatusFilter);
                    setPage(1);
                  }}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Nonaktif</option>
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
                    statusFilter,
                    { showRefreshing: true }
                  );
                }}
              />
            ) : products.length === 0 ? (
              <ProductEmptyState hasSearch={hasSearch} />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-6 py-3 text-left font-medium">
                          Produk
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Harga Jual
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          HPP
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Margin
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Stok
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Resep
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Status
                        </th>
                        <th className="w-16 px-4 py-3" />
                      </tr>
                    </thead>

                    <tbody>
                      {products.map((p) => {
                        const selling = Number(p.sellingPrice);
                        const hpp = p.lastHpp;
                        const margin =
                          hpp !== null && selling > 0
                            ? ((selling - hpp) / selling) * 100
                            : null;

                        return (
                          <tr
                            key={p.id}
                            className="border-b last:border-b-0 hover:bg-muted/30"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                                  {p.primaryImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={p.primaryImage.url}
                                      alt={p.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                      <ImageIcon className="size-4" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium">{p.name}</div>
                                  {p.description && (
                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                      {truncate(p.description, 40)}
                                    </div>
                                  )}
                                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{p.imageCount} gambar</span>
                                    {p.metadataCount > 0 && (
                                      <>
                                        <span>·</span>
                                        <span className="inline-flex items-center gap-1">
                                          <Tag className="size-3" />
                                          {p.metadataCount}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-right font-medium">
                              {formatRupiah(selling)}
                            </td>

                            <td className="px-4 py-4 text-right">
                              {hpp !== null ? (
                                <span className="font-medium">
                                  {formatRupiah(hpp)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Belum ada
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4 text-right">
                              {margin !== null ? (
                                <Badge
                                  className={cn(
                                    "text-xs",
                                    margin >= 50
                                      ? "bg-green-500/15 text-green-700 dark:text-green-400"
                                      : margin >= 25
                                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                        : "bg-red-500/15 text-red-700 dark:text-red-400"
                                  )}
                                >
                                  {margin.toFixed(1)}%
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  -
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4 text-right">
                              {formatNumber(p.totalStock)}
                            </td>

                            <td className="px-4 py-4">
                              {p.activeRecipe ? (
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    v{p.activeRecipe.version}
                                  </Badge>
                                  <Link
                                    href={`/inventory/recipes/${p.activeRecipe.id}/edit`}
                                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                                  >
                                    Edit
                                  </Link>
                                </div>
                              ) : (
                                <Link
                                  href={`/inventory/recipes/new?productId=${p.id}`}
                                  className={cn(
                                    buttonVariants({
                                      variant: "outline",
                                      size: "sm",
                                    }),
                                    "h-7 text-xs"
                                  )}
                                >
                                  <BookOpen className="mr-1.5 size-3" />
                                  Buat Resep
                                </Link>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              {p.isActive ? (
                                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                                  Aktif
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Nonaktif</Badge>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  type="button"
                                  className="inline-flex size-8 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                                  aria-label={`Aksi ${p.name}`}
                                >
                                  <MoreHorizontal className="size-4" />
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                  align="end"
                                  className="min-w-48"
                                >
                                  <DropdownMenuItem
                                    onClick={() =>
                                      router.push(
                                        `/inventory/products/${p.id}`
                                      )
                                    }
                                  >
                                    <Eye className="mr-2 size-4" />
                                    Lihat Detail
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() =>
                                      router.push(
                                        `/inventory/products/${p.id}/edit`
                                      )
                                    }
                                  >
                                    <Pencil className="mr-2 size-4" />
                                    Edit
                                  </DropdownMenuItem>

                                  {!p.activeRecipe && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        router.push(
                                          `/inventory/recipes/new?productId=${p.id}`
                                        )
                                      }
                                    >
                                      <BookOpen className="mr-2 size-4" />
                                      Buat Resep
                                    </DropdownMenuItem>
                                  )}

                                  {p.isActive && (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() => {
                                        setError(null);
                                        setDisableTarget(p);
                                      }}
                                    >
                                      <PowerOff className="mr-2 size-4" />
                                      Nonaktifkan
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    {pagination?.total ?? 0} produk
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() =>
                        setPage((current) => Math.max(1, current - 1))
                      }
                    >
                      <ChevronLeft className="mr-1 size-4" />
                      Sebelumnya
                    </Button>

                    <span className="min-w-20 text-center text-sm">
                      Halaman {page} dari {totalPages || 1}
                    </span>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={totalPages === 0 || page >= totalPages}
                      onClick={() => setPage((current) => current + 1)}
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
        open={disableTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDisabling) setDisableTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nonaktifkan Produk?</DialogTitle>
            <DialogDescription>
              Produk <strong>{disableTarget?.name}</strong> akan
              dinonaktifkan.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDisabling}
              onClick={() => setDisableTarget(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDisabling}
              onClick={() => void handleDisable()}
            >
              {isDisabling ? "Menonaktifkan..." : "Nonaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}