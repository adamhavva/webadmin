"use client";

import * as React from "react";

import {
  AlertTriangle,
  Coins,
  Loader2,
  MoreHorizontal,
  Pencil,
  Percent,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type SettingType = "PERCENTAGE" | "NOMINAL";

type Setting = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  type: SettingType;
  value: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = {
  success: boolean;
  data?: {
    items: Setting[];
    summary: {
      total: number;
      activeCount: number;
      percentageCount: number;
      nominalCount: number;
    };
  };
  error?: { message?: string };
};

type MutationResponse = {
  success: boolean;
  error?: { message?: string };
};

type StatusFilter = "all" | "active" | "inactive";
type TypeFilter = "all" | "PERCENTAGE" | "NOMINAL";

// ============================================================
// Helpers
// ============================================================

function formatValue(value: number, type: SettingType): string {
  if (type === "PERCENTAGE") {
    return `${value}%`;
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRupiah(v: string | number): string {
  const n = typeof v === "string" ? Number(v) : v;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

// ============================================================
// Skeleton / Empty / Error
// ============================================================

function SettingSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-4">
          <div className="size-10 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="size-8 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function SettingErrorState({
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
      <h3 className="mt-4 text-sm font-semibold">Gagal memuat setting</h3>
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

function SettingEmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <SettingsIcon className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">
        {hasSearch ? "Setting tidak ditemukan" : "Belum ada setting"}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {hasSearch
          ? "Tidak ada setting yang cocok dengan filter."
          : "Tambahkan setting untuk pajak, fee, atau biaya lainnya."}
      </p>
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export function SettingListPage() {
  const [settings, setSettings] = React.useState<Setting[]>([]);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all");
  const [summary, setSummary] = React.useState({
    total: 0,
    activeCount: 0,
    percentageCount: 0,
    nominalCount: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Create/Edit dialog
  const [formOpen, setFormOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Setting | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Form state
  const [key, setKey] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<SettingType>("PERCENTAGE");
  const [value, setValue] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [sortOrder, setSortOrder] = React.useState("0");

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = React.useState<Setting | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Debounce search
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchSettings = React.useCallback(
    async (options?: { showLoading?: boolean; showRefreshing?: boolean }) => {
      try {
        if (options?.showLoading) setIsLoading(true);
        if (options?.showRefreshing) setIsRefreshing(true);
        setError(null);

        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        params.set("isActive", statusFilter);
        params.set("type", typeFilter);

        const res = await fetch(`/api/settings?${params}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const json = (await res.json()) as ListResponse;

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "Gagal memuat setting");
        }

        setSettings(json.data.items);
        setSummary(json.data.summary);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat setting"
        );
      } finally {
        if (options?.showLoading) setIsLoading(false);
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    [debouncedSearch, statusFilter, typeFilter]
  );

  React.useEffect(() => {
    void fetchSettings({ showLoading: true });
  }, [fetchSettings]);

  function handleRefresh() {
    void fetchSettings({ showRefreshing: true });
  }

  // ---------- Form ----------
  function openCreateDialog() {
    setEditTarget(null);
    setKey("");
    setName("");
    setDescription("");
    setType("PERCENTAGE");
    setValue("");
    setIsActive(true);
    setSortOrder("0");
    setFormError(null);
    setFormOpen(true);
  }

  function openEditDialog(s: Setting) {
    setEditTarget(s);
    setKey(s.key);
    setName(s.name);
    setDescription(s.description ?? "");
    setType(s.type);
    setValue(String(s.value));
    setIsActive(s.isActive);
    setSortOrder(String(s.sortOrder));
    setFormError(null);
    setFormOpen(true);
  }

  function closeFormDialog() {
    if (isSaving) return;
    setFormOpen(false);
    setEditTarget(null);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSaving) return;

    setFormError(null);

    // Validasi client
    if (!editTarget && !key.trim()) {
      setFormError("Key wajib diisi.");
      return;
    }
    if (!name.trim()) {
      setFormError("Nama wajib diisi.");
      return;
    }
    const numValue = Number(value);
    if (value === "" || isNaN(numValue) || numValue < 0) {
      setFormError("Nilai wajib diisi dan tidak boleh negatif.");
      return;
    }
    if (type === "PERCENTAGE" && numValue > 100) {
      setFormError("Persentase tidak boleh lebih dari 100%.");
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        value: numValue,
        isActive,
        sortOrder: Number(sortOrder) || 0,
      };

      let res: Response;
      if (editTarget) {
        res = await fetch(`/api/settings/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: key.trim(),
            ...payload,
          }),
        });
      }

      const json = (await res.json()) as MutationResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal menyimpan");
      }

      setFormOpen(false);
      await fetchSettings({ showRefreshing: true });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Gagal menyimpan"
      );
    } finally {
      setIsSaving(false);
    }
  }

  // ---------- Toggle Active ----------
  async function handleToggleActive(s: Setting) {
    try {
      const res = await fetch(`/api/settings/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !s.isActive }),
      });
      const json = (await res.json()) as MutationResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal update");
      }
      await fetchSettings({ showRefreshing: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal update");
    }
  }

  // ---------- Delete ----------
  function openDeleteDialog(s: Setting) {
    setDeleteTarget(s);
    setDeleteError(null);
  }

  function closeDeleteDialog() {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeleteError(null);
  }

  async function handleDelete() {
    if (!deleteTarget || isDeleting) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const res = await fetch(`/api/settings/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as MutationResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal menghapus");
      }
      setDeleteTarget(null);
      await fetchSettings({ showRefreshing: true });
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Gagal menghapus"
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const hasSearch =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    typeFilter !== "all";

  return (
    <>
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Pengaturan
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Kelola pajak, biaya, dan konfigurasi global sistem.
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
            <Button type="button" onClick={openCreateDialog}>
              <Plus className="mr-2 size-4" />
              Tambah Setting
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Setting
              </CardTitle>
              <SettingsIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.activeCount} aktif
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Persentase
              </CardTitle>
              <Percent className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.percentageCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Nominal
              </CardTitle>
              <Coins className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.nominalCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Aktif
              </CardTitle>
              <Power className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.activeCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle className="text-base">Daftar Setting</CardTitle>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative sm:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari key atau nama..."
                    className="pl-9"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter(e.target.value as TypeFilter)
                  }
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="PERCENTAGE">Persentase</option>
                  <option value="NOMINAL">Nominal</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as StatusFilter)
                  }
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <SettingSkeleton />
            ) : error ? (
              <SettingErrorState
                message={error}
                onRetry={() => void fetchSettings({ showRefreshing: true })}
              />
            ) : settings.length === 0 ? (
              <SettingEmptyState hasSearch={hasSearch} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-6 py-3 text-left font-medium">No</th>
                      <th className="px-6 py-3 text-left font-medium">Key</th>
                      <th className="px-4 py-3 text-left font-medium">Nama</th>
                      <th className="px-4 py-3 text-left font-medium">Tipe</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Nilai
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Urutan
                      </th>
                      <th className="w-16 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {settings.map((s, i) => (
                      <tr
                        key={s.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="px-6 py-4 text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="font-mono">
                            {s.key}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium">{s.name}</div>
                          {s.description && (
                            <div className="mt-0.5 max-w-md truncate text-xs text-muted-foreground">
                              {s.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {s.type === "PERCENTAGE" ? (
                            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400">
                              <Percent className="mr-1 size-3" />
                              Persentase
                            </Badge>
                          ) : (
                            <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400">
                              <Coins className="mr-1 size-3" />
                              Nominal
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold">
                          {formatValue(s.value, s.type)}
                        </td>
                        <td className="px-4 py-4">
                          {s.isActive ? (
                            <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                              Aktif
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Nonaktif</Badge>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right text-muted-foreground">
                          {s.sortOrder}
                        </td>
                        <td className="px-4 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              type="button"
                              className="inline-flex size-8 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Aksi ${s.name}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                              align="end"
                              className="min-w-48"
                            >
                              <DropdownMenuItem
                                onClick={() => openEditDialog(s)}
                              >
                                <Pencil className="mr-2 size-4" />
                                Edit
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => void handleToggleActive(s)}
                              >
                                {s.isActive ? (
                                  <>
                                    <PowerOff className="mr-2 size-4" />
                                    Nonaktifkan
                                  </>
                                ) : (
                                  <>
                                    <Power className="mr-2 size-4" />
                                    Aktifkan
                                  </>
                                )}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => openDeleteDialog(s)}
                              >
                                <Trash2 className="mr-2 size-4" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================= FORM DIALOG ================= */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) closeFormDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Setting" : "Tambah Setting"}
            </DialogTitle>
            <DialogDescription>
              {editTarget
                ? `Ubah konfigurasi "${editTarget.name}". Key tidak bisa diubah.`
                : "Buat setting baru untuk pajak, fee, atau biaya lainnya."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Key */}
            <div className="grid gap-2">
              <Label htmlFor="setting-key">
                Key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="setting-key"
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase())}
                placeholder="tax, fee_barista, fee_doku"
                disabled={isSaving || editTarget !== null}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {editTarget
                  ? "Key tidak bisa diubah setelah dibuat."
                  : "Lowercase snake_case. Contoh: tax, fee_barista"}
              </p>
            </div>

            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="setting-name">
                Nama <span className="text-destructive">*</span>
              </Label>
              <Input
                id="setting-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pajak, Biaya Barista"
                disabled={isSaving}
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="setting-desc">
                Deskripsi{" "}
                <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <textarea
                id="setting-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Keterangan tambahan..."
                disabled={isSaving}
                maxLength={500}
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Type + Value */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="setting-type">
                  Tipe <span className="text-destructive">*</span>
                </Label>
                <select
                  id="setting-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as SettingType)}
                  disabled={isSaving}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="PERCENTAGE">Persentase (%)</option>
                  <option value="NOMINAL">Nominal (Rp)</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="setting-value">
                  Nilai <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  {type === "NOMINAL" && (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                      Rp
                    </span>
                  )}
                  <Input
                    id="setting-value"
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) =>
                      setValue(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    placeholder={type === "PERCENTAGE" ? "12" : "2000"}
                    disabled={isSaving}
                    className={cn(
                      type === "PERCENTAGE" ? "pr-8" : "pl-8"
                    )}
                  />
                  {type === "PERCENTAGE" && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                      %
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sort Order */}
            <div className="grid gap-2">
              <Label htmlFor="setting-sort">
                Urutan{" "}
                <span className="text-muted-foreground">
                  (untuk sorting di FE)
                </span>
              </Label>
              <Input
                id="setting-sort"
                type="text"
                inputMode="numeric"
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(e.target.value.replace(/\D/g, ""))
                }
                placeholder="0"
                disabled={isSaving}
              />
            </div>

            {/* Is Active */}
            <div className="flex items-center gap-2">
              <input
                id="setting-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isSaving}
                className="size-4 cursor-pointer accent-primary"
              />
              <Label
                htmlFor="setting-active"
                className="cursor-pointer text-sm font-normal"
              >
                Aktifkan setting ini
              </Label>
            </div>

            {formError && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {formError}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeFormDialog}
                disabled={isSaving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : editTarget ? (
                  "Simpan Perubahan"
                ) : (
                  "Tambah Setting"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= DELETE DIALOG ================= */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Setting?</DialogTitle>
            <DialogDescription>
              Setting{" "}
              <strong>{deleteTarget?.name}</strong> (
              <span className="font-mono">{deleteTarget?.key}</span>) akan
              dihapus permanen.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Pastikan setting ini tidak dipakai di perhitungan order atau
                laporan.
              </span>
            </div>
          </div>

          {deleteError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {deleteError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={closeDeleteDialog}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 size-4" />
                  Hapus Setting
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}