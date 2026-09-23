"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Minus,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ============================================================
// Constants
// ============================================================

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_IMAGE_COUNT = 10;
const MAX_METADATA_COUNT = 30;

// ============================================================
// Types
// ============================================================

type ExistingImage = {
  source: "existing";
  id: string;
  url: string;
  key: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isPrimary: boolean;
};

type NewImage = {
  source: "new";
  uid: string;
  file: File;
  previewUrl: string;
  fileSize: number;
  isPrimary: boolean;
};

type ImageItem = ExistingImage | NewImage;

type MetadataRow = {
  uid: string;
  key: string;
  value: string;
};

export type ProductFormData = {
  id?: string;
  name: string;
  description: string | null;
  sellingPrice: string;
  isActive?: boolean;
  metadata?: Array<{ key: string; value: string }>;
  images?: Array<{
    id: string;
    url: string;
    key: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    isPrimary: boolean;
  }>;
};

type Props = {
  mode: "create" | "edit";
  productId?: string;
  initial?: ProductFormData;
};

// ============================================================
// Helpers
// ============================================================

function stripNonDigits(v: string): string {
  return v.replace(/\D/g, "");
}
function formatDigits(d: string): string {
  if (!d) return "";
  const n = Number(d);
  if (isNaN(n)) return "";
  return new Intl.NumberFormat("id-ID").format(n);
}
function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

let counter = 0;
function nextUid(): string {
  counter += 1;
  return `uid-${counter}`;
}

// ============================================================
// Main
// ============================================================

export function ProductForm({ mode, productId, initial }: Props) {
  const router = useRouter();
  const formId = React.useId();

  const [name, setName] = React.useState(initial?.name ?? "");
  const [description, setDescription] = React.useState(
    initial?.description ?? ""
  );
  const [sellingPrice, setSellingPrice] = React.useState(
    initial?.sellingPrice ?? ""
  );
  const [isActive, setIsActive] = React.useState(initial?.isActive ?? true);

  const [metadataRows, setMetadataRows] = React.useState<MetadataRow[]>(() => {
    if (initial?.metadata && initial.metadata.length > 0) {
      return initial.metadata.map((m, i) => ({
        uid: `${formId}-meta-${i}`,
        key: m.key,
        value: m.value,
      }));
    }
    return [];
  });

  const [images, setImages] = React.useState<ImageItem[]>(() => {
    if (initial?.images && initial.images.length > 0) {
      return initial.images.map((img) => ({
        source: "existing" as const,
        id: img.id,
        url: img.url,
        key: img.key,
        fileName: img.fileName,
        fileSize: img.fileSize,
        mimeType: img.mimeType,
        isPrimary: img.isPrimary,
      }));
    }
    return [];
  });

  const [isDragOver, setIsDragOver] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<string | null>(null);

  // Cleanup object URLs
  React.useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.source === "new") URL.revokeObjectURL(img.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Computed ----------
  const sellingPriceNum = Number(sellingPrice) || 0;
  const primaryImage = images.find((i) => i.isPrimary);
  const existingCount = images.filter((i) => i.source === "existing").length;
  const newCount = images.filter((i) => i.source === "new").length;

  // ---------- Image operations ----------

  function addFiles(files: FileList | File[]) {
    setError(null);
    const fileArray = Array.from(files);

    if (images.length + fileArray.length > MAX_IMAGE_COUNT) {
      setError(`Maksimal ${MAX_IMAGE_COUNT} gambar.`);
      return;
    }

    const newImages: NewImage[] = [];
    for (const file of fileArray) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`File "${file.name}": format harus JPG, PNG, atau WEBP.`);
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setError(`File "${file.name}": maksimal 5 MB.`);
        continue;
      }
      newImages.push({
        source: "new",
        uid: nextUid(),
        file,
        previewUrl: URL.createObjectURL(file),
        fileSize: file.size,
        isPrimary: false,
      });
    }

    if (newImages.length === 0) return;

    setImages((prev) => {
      const next = [...prev, ...newImages];
      if (!next.some((i) => i.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
  }

  function removeImage(item: ImageItem) {
    setImages((prev) => {
      const next = prev.filter((i) => {
        if (item.source === "existing" && i.source === "existing") {
          return i.id !== item.id;
        }
        if (item.source === "new" && i.source === "new") {
          return i.uid !== item.uid;
        }
        return true;
      });

      // revoke url kalau new
      if (item.source === "new") URL.revokeObjectURL(item.previewUrl);

      // promote primary baru
      if (next.length > 0 && !next.some((i) => i.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }

      return next;
    });
  }

  function setPrimary(item: ImageItem) {
    setImages((prev) =>
      prev.map((i) => {
        if (item.source === "existing" && i.source === "existing") {
          return { ...i, isPrimary: i.id === item.id };
        }
        if (item.source === "new" && i.source === "new") {
          return { ...i, isPrimary: i.uid === item.uid };
        }
        return { ...i, isPrimary: false };
      })
    );
  }

  function clearAllImages() {
    images.forEach((img) => {
      if (img.source === "new") URL.revokeObjectURL(img.previewUrl);
    });
    setImages([]);
  }

  // ---------- Drag ----------
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }

  // ---------- Metadata ----------
  function addMetadataRow() {
    if (metadataRows.length >= MAX_METADATA_COUNT) {
      setError(`Maksimal ${MAX_METADATA_COUNT} metadata.`);
      return;
    }
    setMetadataRows((prev) => [
      ...prev,
      { uid: nextUid(), key: "", value: "" },
    ]);
  }

  function updateMetadataRow(uid: string, patch: Partial<MetadataRow>) {
    setMetadataRows((prev) =>
      prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r))
    );
  }

  function removeMetadataRow(uid: string) {
    setMetadataRows((prev) => prev.filter((r) => r.uid !== uid));
  }

  // ---------- Submit ----------
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Nama produk wajib diisi.");
      return;
    }

    // Validasi metadata
    const cleanedMetadata = metadataRows
      .map((r) => ({ key: r.key.trim(), value: r.value.trim() }))
      .filter((m) => m.key !== "" || m.value !== "");

    for (let i = 0; i < cleanedMetadata.length; i++) {
      if (!cleanedMetadata[i].key) {
        setError(`Metadata #${i + 1}: nama wajib diisi.`);
        return;
      }
      if (!cleanedMetadata[i].value) {
        setError(`Metadata #${i + 1}: nilai wajib diisi.`);
        return;
      }
    }

    const keys = cleanedMetadata.map((m) => m.key.toLowerCase());
    if (new Set(keys).size !== keys.length) {
      setError("Nama metadata tidak boleh duplikat.");
      return;
    }

    setLoading(true);

    try {
      // ---------- 1. Save product ----------
      const payload: Record<string, unknown> = {
        name: trimmedName,
        description: description.trim() || null,
        sellingPrice: sellingPriceNum,
        metadata: cleanedMetadata,
      };
      if (mode === "edit") payload.isActive = isActive;

      const url =
        mode === "create"
          ? "/api/inventory/products"
          : `/api/inventory/products/${productId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      setProgress("Menyimpan produk...");
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || json.success === false) {
        throw new Error(json?.error?.message ?? "Gagal menyimpan produk");
      }

      const savedProductId = json.data.id as string;

      // ---------- 2. Delete existing images yang dihapus user ----------
      if (mode === "edit" && initial?.images) {
        const keptIds = new Set(
          images
            .filter(
              (i): i is ExistingImage => i.source === "existing"
            )
            .map((i) => i.id)
        );
        const toDelete = initial.images.filter(
          (img) => !keptIds.has(img.id)
        );

        for (const img of toDelete) {
          setProgress(`Menghapus gambar lama...`);
          await fetch(
            `/api/inventory/products/${savedProductId}/images/${img.id}`,
            { method: "DELETE" }
          ).catch(() => {});
        }
      }

      // ---------- 3. Update primary untuk existing images ----------
      if (mode === "edit") {
        const primaryExisting = images.find(
          (i): i is ExistingImage =>
            i.source === "existing" && i.isPrimary
        );
        if (primaryExisting) {
          setProgress("Mengatur gambar utama...");
          await fetch(
            `/api/inventory/products/${savedProductId}/images/${primaryExisting.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isPrimary: true }),
            }
          ).catch(() => {});
        }
      }

      // ---------- 4. Upload new images ----------
      const newImages = images.filter(
        (i): i is NewImage => i.source === "new"
      );

      if (newImages.length > 0) {
        const total = newImages.length;
        for (let i = 0; i < newImages.length; i++) {
          const img = newImages[i];
          setProgress(`Mengunggah gambar ${i + 1}/${total}...`);

          const formData = new FormData();
          formData.append("file", img.file);
          formData.append("isPrimary", img.isPrimary ? "true" : "false");

          const imgRes = await fetch(
            `/api/inventory/products/${savedProductId}/images`,
            { method: "POST", body: formData }
          );
          const imgJson = await imgRes.json();

          if (!imgRes.ok || imgJson.success === false) {
            throw new Error(
              imgJson?.error?.message ??
                `Gagal mengunggah "${img.file.name}"`
            );
          }
        }
      }

      setProgress("Selesai!");
      router.push("/inventory/products");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menyimpan produk."
      );
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Tambah Produk" : "Edit Produk"}
          </CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Isi informasi produk, metadata, dan unggah gambar."
              : "Perbarui informasi produk, gambar, dan metadata."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* ============ INFORMASI ============ */}
          <section className="space-y-5">
            <div>
              <h3 className="text-sm font-medium">Informasi Produk</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Nama, deskripsi, dan harga jual.
              </p>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor={`${formId}-name`}>
                  Nama Produk{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`${formId}-name`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kopi Susu Gula Aren"
                  required
                  disabled={loading}
                  maxLength={100}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`${formId}-desc`}>Deskripsi</Label>
                <textarea
                  id={`${formId}-desc`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat produk (opsional)"
                  disabled={loading}
                  maxLength={2000}
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/2000 karakter
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor={`${formId}-price`}>
                    Harga Jual{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                      Rp
                    </span>
                    <Input
                      id={`${formId}-price`}
                      type="text"
                      inputMode="numeric"
                      value={formatDigits(sellingPrice)}
                      onChange={(e) =>
                        setSellingPrice(
                          stripNonDigits(e.target.value).slice(0, 12)
                        )
                      }
                      onKeyDown={(e) => {
                        if (
                          e.key === "-" ||
                          e.key === "+" ||
                          e.key === "e" ||
                          e.key === "E" ||
                          e.key === "," ||
                          e.key === "."
                        ) {
                          e.preventDefault();
                        }
                      }}
                      placeholder="0"
                      required
                      disabled={loading}
                      className="pl-8"
                    />
                  </div>
                  {sellingPriceNum > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Preview: {formatRupiah(sellingPriceNum)}
                    </p>
                  )}
                </div>

                {mode === "edit" && (
                  <div className="grid gap-2">
                    <Label htmlFor={`${formId}-active`}>Status</Label>
                    <select
                      id={`${formId}-active`}
                      value={isActive ? "ACTIVE" : "INACTIVE"}
                      onChange={(e) =>
                        setIsActive(e.target.value === "ACTIVE")
                      }
                      disabled={loading}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                    >
                      <option value="ACTIVE">Aktif</option>
                      <option value="INACTIVE">Nonaktif</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ============ METADATA ============ */}
          <section className="space-y-5 border-t pt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Metadata Produk</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Atribut tambahan (contoh: Origin, Gilingan, Roast Level).
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMetadataRow}
                disabled={
                  loading || metadataRows.length >= MAX_METADATA_COUNT
                }
              >
                <Plus className="mr-2 size-4" />
                Tambah Metadata
              </Button>
            </div>

            {metadataRows.length === 0 ? (
              <div className="rounded-lg border border-dashed px-6 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Belum ada metadata.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {metadataRows.map((row, index) => (
                  <div
                    key={row.uid}
                    className="rounded-lg border bg-muted/20 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Metadata #{index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeMetadataRow(row.uid)}
                        disabled={loading}
                      >
                        <Minus className="size-3.5" />
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">
                          Nama <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={row.key}
                          onChange={(e) =>
                            updateMetadataRow(row.uid, {
                              key: e.target.value,
                            })
                          }
                          placeholder="Origin"
                          disabled={loading}
                          maxLength={50}
                          className="h-9"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">
                          Nilai <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={row.value}
                          onChange={(e) =>
                            updateMetadataRow(row.uid, {
                              value: e.target.value,
                            })
                          }
                          placeholder="Gunung Puntang"
                          disabled={loading}
                          maxLength={500}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ============ GAMBAR ============ */}
          <section className="space-y-5 border-t pt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Gambar Produk</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Maksimal {MAX_IMAGE_COUNT} gambar. Otomatis
                  dikompres, tanpa mengurangi ketajaman.
                </p>
              </div>
              {images.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllImages}
                  disabled={loading}
                >
                  <Trash2 className="mr-2 size-3.5" />
                  Hapus Semua
                </Button>
              )}
            </div>

            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/40"
              )}
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Upload className="size-5 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm font-medium">
                Drag & drop gambar di sini
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                atau klik untuk pilih file
              </p>
              <label
                htmlFor={`${formId}-file-input`}
                className={cn(
                  "mt-4 inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent",
                  (loading || images.length >= MAX_IMAGE_COUNT) &&
                    "pointer-events-none opacity-50"
                )}
              >
                <ImageIcon className="size-4" />
                Pilih Gambar
              </label>
              <input
                id={`${formId}-file-input`}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                disabled={loading || images.length >= MAX_IMAGE_COUNT}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }
                }}
              />

              {images.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {images.length} / {MAX_IMAGE_COUNT} gambar
                  {existingCount > 0 && ` · ${existingCount} tersimpan`}
                  {newCount > 0 && ` · ${newCount} baru`}
                </p>
              )}
            </div>

            {/* Preview list */}
            {images.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Preview ({images.length})
                  </p>
                  {primaryImage && (
                    <p className="text-xs text-muted-foreground">
                      Gambar utama:{" "}
                      {primaryImage.source === "existing"
                        ? primaryImage.fileName
                        : primaryImage.file.name}
                    </p>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {images.map((item) => {
                    const isExisting = item.source === "existing";
                    const imgUrl = isExisting
                      ? item.url
                      : item.previewUrl;
                    const fileName = isExisting
                      ? item.fileName
                      : item.file.name;

                    return (
                      <div
                        key={isExisting ? item.id : item.uid}
                        className={cn(
                          "group relative overflow-hidden rounded-lg border-2 bg-muted/20 transition-all",
                          item.isPrimary
                            ? "border-primary shadow-sm"
                            : "border-border hover:border-muted-foreground/40"
                        )}
                      >
                        {/* Preview */}
                        <div className="relative aspect-square w-full overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgUrl}
                            alt={fileName}
                            className="h-full w-full object-cover"
                          />

                          {/* Badge primary */}
                          {item.isPrimary && (
                            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                              <Star className="size-2.5 fill-current" />
                              UTAMA
                            </div>
                          )}

                          {/* Badge new/existing */}
                          {!isExisting && (
                            <div className="absolute right-2 top-2 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-medium text-white">
                              BARU
                            </div>
                          )}

                          {/* Overlay actions */}
                          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                            {!item.isPrimary && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setPrimary(item)}
                                disabled={loading}
                                className="h-8 text-xs"
                              >
                                <Star className="mr-1 size-3" />
                                Utama
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeImage(item)}
                              disabled={loading}
                              className="h-8 text-xs"
                            >
                              <X className="mr-1 size-3" />
                              Hapus
                            </Button>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-2">
                          <p className="truncate text-xs font-medium">
                            {fileName}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatBytes(item.fileSize)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Info panel */}
                {mode === "edit" &&
                  images.some((i) => i.source === "existing") && (
                    <div className="rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-700 dark:text-blue-400">
                      Menghapus gambar di sini juga akan menghapusnya dari
                      storage R2 saat disimpan.
                    </div>
                  )}
              </div>
            )}
          </section>

          {/* ============ PROGRESS & ERROR ============ */}
          {progress && (
            <div className="flex items-center gap-2 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 text-sm text-blue-700 dark:text-blue-400">
              <Loader2 className="size-4 animate-spin" />
              {progress}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={loading}
          >
            Batal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {mode === "create" ? "Simpan Produk" : "Simpan Perubahan"}
          </Button>
        </div>
      </Card>
    </form>
  );
}