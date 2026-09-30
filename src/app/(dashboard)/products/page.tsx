"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Package,
  Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ProductImage = { url: string; isPrimary?: boolean };

type Product = {
  id: string;
  name: string;
  description: string;
  sellingPrice: number;
  images: string[];
  imageUrl: string | null;
  category: string;
  metadata: Record<string, string>;
  totalStock: number;
};

type ProductsResponse = {
  success: boolean;
  data?: {
    items: Product[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
  error?: { message?: string };
};

function fmtRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function ProductSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square overflow-hidden rounded-xl bg-muted" />
      <div className="mt-2 space-y-1">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
        <div className="h-3 w-1/4 rounded bg-muted" />
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [products, setProducts] = React.useState<Product[]>([]);
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = React.useState(false);

  // Debounce
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on search change
  React.useEffect(() => {
    setPage(1);
    setProducts([]);
    setHasInitialized(false);
  }, [debouncedSearch]);

  const fetchProducts = React.useCallback(
    async (pageNum: number, append = false) => {
      try {
        if (append) setIsLoadingMore(true);
        else setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({ page: String(pageNum), limit: "20" });
        if (debouncedSearch) params.set("search", debouncedSearch);

        const res = await fetch(`/api/products?${params}`);
        const json: ProductsResponse = await res.json();

        if (!res.ok || !json.success) throw new Error(json.error?.message ?? "Gagal memuat produk");

        if (json.data) {
          setProducts(prev => (append ? [...prev, ...json.data!.items] : json.data!.items));
          setPagination(json.data.pagination);
          if (!append) setHasInitialized(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [debouncedSearch]
  );

  // Initial load
  React.useEffect(() => {
    void fetchProducts(1);
  }, [fetchProducts]);

  // Infinite scroll
  React.useEffect(() => {
    if (!pagination || !hasInitialized) return;

    const loadMoreTrigger = document.getElementById('load-more-trigger');
    if (!loadMoreTrigger) return;

    const hasMore = pagination ? page < pagination.totalPages : false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && hasMore) {
          const next = page + 1;
          setPage(next);
          void fetchProducts(next, true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreTrigger);
    return () => observer.disconnect();
  }, [pagination, page, isLoadingMore, hasInitialized]);

  // Derived value for infinite scroll
  const hasMore = pagination ? page < pagination.totalPages : false;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Daftar Menu</h1>
          <Badge variant="outline" className="ml-auto font-normal">
            {pagination?.total ?? "—"} item
          </Badge>
        </div>
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertTriangle className="size-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button size="sm" onClick={() => void fetchProducts(page)}>Coba Lagi</Button>
          </div>
        ) : (
          <div className="grid min-h-[60vh] grid-cols-2 gap-3">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
            ) : products.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
                <Package className="mb-3 size-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Tidak ada produk ditemukan</p>
              </div>
            ) : (
              <>
                {products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => router.push(`/products/${p.id}`)}
                    className="group flex flex-col items-stretch text-left"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="size-10 text-muted-foreground" />
                        </div>
                      )}
                      {p.totalStock === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Badge variant="destructive">Stok Habis</Badge>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex-1">
                      <p className="line-clamp-2 text-sm font-medium leading-tight">{p.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{p.category}</p>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="font-semibold text-primary">{fmtRupiah(p.sellingPrice)}</span>
                        {p.totalStock > 0 && (
                          <span className="text-xs text-muted-foreground">Stok: {p.totalStock}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}

                {/* Load more trigger for infinite scroll */}
                <div id="load-more-trigger" className="col-span-2 flex items-center justify-center py-4">
                  {isLoadingMore ? (
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  ) : hasMore ? (
                    <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30" />
                  ) : null}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
