"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Eye,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  TrendingUp,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type ImageItem = {
  id: string;
  key: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
};

type RecipeItem = {
  id: string;
  quantity: string;
  inventoryItem: {
    id: string;
    name: string;
    unit: string;
    isActive: boolean;
  };
};

type Recipe = {
  id: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  items: RecipeItem[];
};

type CostHistory = {
  id: string;
  hpp: string;
  createdAt: string;
};

type Metadata = {
  id: string;
  key: string;
  value: string;
  sortOrder: number;
};

type ProductDetail = {
  id: string;
  name: string;
  description: string | null;
  sellingPrice: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalStock: number;
  recipes: Recipe[];
  costHistories: CostHistory[];
  images: ImageItem[];
  metadata: Metadata[];
  _count: {
    productions: number;
    finishedProductBatches: number;
  };
};

type DetailResponse = {
  success: boolean;
  data?: ProductDetail;
  error?: { message?: string };
};

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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(d);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Warna margin:
 * - null → netral
 * - ≥ 0 (profit) → hijau
 * - < 0 (rugi) → merah
 */
function marginTextClass(margin: number | null): string {
  if (margin === null) return "text-muted-foreground";
  return margin >= 0
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
}

// ============================================================
// Skeleton / Error
// ============================================================

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-lg border bg-muted/30" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-96 animate-pulse rounded-lg border bg-muted/30 lg:col-span-2" />
        <div className="h-96 animate-pulse rounded-lg border bg-muted/30" />
      </div>
    </div>
  );
}

function DetailError({
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
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 size-4" />
          Coba Lagi
        </Button>
        <Link
          href="/inventory/products"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          Kembali
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export function ProductDetailView({ productId }: { productId: string }) {
  const router = useRouter();

  const [data, setData] = React.useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxImageId, setLightboxImageId] = React.useState<string | null>(
    null
  );

  // Upload & delete
  const [isUploading, setIsUploading] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ImageItem | null>(
    null
  );
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [busyImageId, setBusyImageId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(
        `/api/inventory/products/${encodeURIComponent(productId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );

      const json = (await res.json()) as DetailResponse;

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Gagal memuat produk.");
      }

      setData(json.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat produk."
      );
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // ---------- Upload ----------
  async function handleUpload(files: FileList) {
    if (files.length === 0 || !data) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append(
          "isPrimary",
          data.images.length === 0 ? "true" : "false"
        );
        const res = await fetch(
          `/api/inventory/products/${data.id}/images`,
          { method: "POST", body: formData }
        );
        const json = await res.json();
        if (!res.ok || json.success === false) {
          throw new Error(
            json?.error?.message ?? `Gagal mengunggah "${file.name}"`
          );
        }
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah.");
    } finally {
      setIsUploading(false);
    }
  }

  // ---------- Set primary ----------
  async function handleSetPrimary(imageId: string) {
    if (!data) return;
    setBusyImageId(imageId);
    try {
      const res = await fetch(
        `/api/inventory/products/${data.id}/images/${imageId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPrimary: true }),
        }
      );
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json?.error?.message ?? "Gagal mengatur utama.");
      }
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengatur utama."
      );
    } finally {
      setBusyImageId(null);
    }
  }

  // ---------- Delete ----------
  async function handleDelete() {
    if (!deleteTarget || !data || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/inventory/products/${data.id}/images/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json?.error?.message ?? "Gagal menghapus.");
      }
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setIsDeleting(false);
    }
  }

  // ---------- Lightbox ----------
  function openLightbox(imageId: string) {
    setLightboxImageId(imageId);
    setLightboxOpen(true);
  }

  // ---------- Render ----------
  if (isLoading) {
    return (
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        <DetailError
          message={error ?? "Produk tidak ditemukan."}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  const selling = Number(data.sellingPrice);
  const activeRecipe = data.recipes.find((r) => r.isActive) ?? null;
  const latestHpp = data.costHistories[0] ?? null;
  const hpp = latestHpp ? Number(latestHpp.hpp) : null;
  const margin =
    hpp !== null && selling > 0 ? ((selling - hpp) / selling) * 100 : null;

  const lightboxImage =
    data.images.find((i) => i.id === lightboxImageId) ??
    data.images.find((i) => i.isPrimary) ??
    data.images[0] ??
    null;

  return (
    <>
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/inventory/products"
              aria-label="Kembali"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" })
              )}
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {data.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Detail produk, gambar, resep, dan HPP.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/inventory/products/${data.id}/edit`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <Pencil className="mr-2 size-4" />
              Edit Produk
            </Link>
          </div>
        </div>

        {/* Info Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              {data.isActive ? (
                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                  Aktif
                </Badge>
              ) : (
                <Badge variant="secondary">Nonaktif</Badge>
              )}
              {data.metadata.map((m) => (
                <Badge key={m.id} variant="outline">
                  <span className="text-muted-foreground">{m.key}:</span>{" "}
                  <span className="ml-1">{m.value}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Harga Jual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(selling)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                HPP Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hpp !== null ? (
                <div className="text-2xl font-bold">{formatRupiah(hpp)}</div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Belum ada resep/produksi
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              {margin !== null ? (
                <>
                  <div
                    className={cn(
                      "text-2xl font-bold",
                      marginTextClass(margin)
                    )}
                  >
                    {margin.toFixed(1)}%
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {margin >= 0 ? "Profit" : "Rugi"}
                  </p>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">-</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Stok Produk Jadi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(data.totalStock)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gallery + Description */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Gallery — grid layout */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Gambar Produk</CardTitle>
                  <CardDescription>
                    {data.images.length} gambar tersimpan
                  </CardDescription>
                </div>
                <label
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "cursor-pointer",
                    isUploading && "pointer-events-none opacity-50"
                  )}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 size-3.5 animate-spin" />
                      Mengunggah...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 size-3.5" />
                      Upload
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        void handleUpload(e.target.files);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
              </div>
            </CardHeader>
            <CardContent>
              {data.images.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center">
                  <ImageIcon className="size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">
                    Belum ada gambar
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Klik Upload untuk menambahkan gambar produk
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {data.images.map((img) => (
                    <div
                      key={img.id}
                      className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.fileName}
                        className="h-full w-full object-cover"
                      />

                      {/* Badge utama — selalu tampil */}
                      {img.isPrimary && (
                        <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground shadow-sm">
                          <Star className="size-2.5 fill-current" />
                          Utama
                        </div>
                      )}

                      {/* Overlay + aksi — muncul saat hover */}
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                        {/* Eye — buka lightbox */}
                        <button
                          type="button"
                          onClick={() => openLightbox(img.id)}
                          aria-label={`Lihat ${img.fileName}`}
                          title="Lihat"
                          className="flex size-9 items-center justify-center rounded-full bg-white/95 text-foreground shadow-md outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Eye className="size-4" />
                        </button>

                        {/* Star — set primary (hanya kalau belum primary) */}
                        {!img.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(img.id)}
                            disabled={busyImageId === img.id}
                            aria-label={`Jadikan ${img.fileName} sebagai utama`}
                            title="Jadikan Utama"
                            className="flex size-9 items-center justify-center rounded-full bg-white/95 text-foreground shadow-md outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busyImageId === img.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Star className="size-4" />
                            )}
                          </button>
                        )}

                        {/* Trash — hapus */}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(img)}
                          aria-label={`Hapus ${img.fileName}`}
                          title="Hapus"
                          className="flex size-9 items-center justify-center rounded-full bg-white/95 text-destructive shadow-md outline-none transition-colors hover:bg-destructive hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description + info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Deskripsi</p>
                <p className="mt-1 text-sm">
                  {data.description || (
                    <span className="italic text-muted-foreground">
                      Belum ada deskripsi
                    </span>
                  )}
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Dibuat pada
                </p>
                <p className="mt-1 text-sm">
                  {formatDateTime(data.createdAt)}
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Terakhir diperbarui
                </p>
                <p className="mt-1 text-sm">
                  {formatDateTime(data.updatedAt)}
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Total produksi
                </p>
                <p className="mt-1 text-sm">
                  {data._count.productions} kali
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resep Aktif */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Resep Aktif</CardTitle>
                <CardDescription>
                  Komposisi bahan untuk membuat produk ini.
                </CardDescription>
              </div>
              {activeRecipe ? (
                <Link
                  href={`/inventory/recipes/${activeRecipe.id}/edit`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" })
                  )}
                >
                  <Pencil className="mr-2 size-3.5" />
                  Edit Resep
                </Link>
              ) : (
                <Link
                  href={`/inventory/recipes/new?productId=${data.id}`}
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  <Plus className="mr-2 size-3.5" />
                  Buat Resep
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!activeRecipe ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <BookOpen className="size-5 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">
                  Belum ada resep
                </h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Buat resep dulu supaya produk ini bisa diproduksi.
                </p>
                <Link
                  href={`/inventory/recipes/new?productId=${data.id}`}
                  className={cn(buttonVariants(), "mt-4")}
                >
                  <Plus className="mr-2 size-4" />
                  Buat Resep Sekarang
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-6 py-3 text-left font-medium">
                        Bahan
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Satuan
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRecipe.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b last:border-b-0"
                      >
                        <td className="px-6 py-3 font-medium">
                          {item.inventoryItem.name}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatNumber(item.quantity)}
                        </td>
                        <td className="px-4 py-3">
                          {item.inventoryItem.unit}
                        </td>
                        <td className="px-4 py-3">
                          {item.inventoryItem.isActive ? (
                            <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                              Aktif
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Nonaktif</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histori HPP */}
        {data.costHistories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="size-4" />
                Histori HPP
              </CardTitle>
              <CardDescription>
                {data.costHistories.length} pencatatan terakhir.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-6 py-3 text-left font-medium">
                        Tanggal
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        HPP per Unit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.costHistories.map((h, i) => (
                      <tr
                        key={h.id}
                        className="border-b last:border-b-0"
                      >
                        <td className="px-6 py-3 text-muted-foreground">
                          {formatDateTime(h.createdAt)}
                          {i === 0 && (
                            <Badge
                              variant="outline"
                              className="ml-2 text-[10px]"
                            >
                              Terbaru
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatRupiah(h.hpp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ================= LIGHTBOX (full image) ================= */}
      <Dialog
        open={lightboxOpen}
        onOpenChange={(open) => {
          setLightboxOpen(open);
          if (!open) setLightboxImageId(null);
        }}
      >
        <DialogContent
          className="max-w-5xl gap-0 overflow-hidden border-none bg-black/95 p-0 shadow-2xl sm:max-w-5xl"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">
            Preview Gambar — {lightboxImage?.fileName}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Tampilan penuh dari gambar produk yang dipilih.
          </DialogDescription>

          <div className="relative flex h-[85vh] items-center justify-center">
            {lightboxImage && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={lightboxImage.url}
                alt={lightboxImage.fileName}
                className="max-h-full max-w-full object-contain"
              />
            )}

            {/* Tombol close custom di pojok */}
            <button
              type="button"
              onClick={() => {
                setLightboxOpen(false);
                setLightboxImageId(null);
              }}
              aria-label="Tutup"
              className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <span className="text-lg leading-none">×</span>
            </button>

            {/* Info nama file di bawah */}
            {lightboxImage && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-6 py-4">
                <p className="truncate text-sm font-medium text-white">
                  {lightboxImage.fileName}
                </p>
                <p className="text-xs text-white/70">
                  {formatBytes(lightboxImage.fileSize)} ·{" "}
                  {formatDateTime(lightboxImage.createdAt)}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ================= DELETE DIALOG ================= */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Gambar?</DialogTitle>
            <DialogDescription>
              Gambar <strong>{deleteTarget?.fileName}</strong> akan
              dihapus dari database dan storage R2. Tindakan ini tidak
              dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="overflow-hidden rounded-lg border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={deleteTarget.url}
                alt={deleteTarget.fileName}
                className="max-h-64 w-full object-contain"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? "Menghapus..." : "Hapus Gambar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}