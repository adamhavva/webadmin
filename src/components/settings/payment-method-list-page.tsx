"use client";

import * as React from "react";

import {
  AlertTriangle,
  Coins,
  CreditCard,
  DollarSign,
  Loader2,
  MoreHorizontal,
  Pencil,
  Percent,
  Plus,
  Power,
  PowerOff,
  QrCode,
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

type PaymentProvider = "CASH" | "DOKU";
type PaymentFeeType = "NONE" | "PERCENTAGE" | "NOMINAL";

type PaymentMethod = {
  code: string;
  name: string;
  provider: PaymentProvider;
  dokuChannelCode: string | null;
  feeType: PaymentFeeType;
  feeValue: number;
  icon: string | null;
  description: string | null;
  displayGroup: string | null;
  isActive: boolean;
  sortOrder: number;
};

type ListResponse = {
  success: boolean;
  data?: { items: PaymentMethod[] };
  error?: { message?: string };
};

type MutationResponse = {
  success: boolean;
  error?: { message?: string };
};

// ============================================================
// Helpers
// ============================================================

function getMethodIcon(provider: PaymentProvider) {
  if (provider === "CASH") {
    return <DollarSign className="size-5" />;
  }
  return <QrCode className="size-5" />;
}

function formatFee(feeType: PaymentFeeType, feeValue: number): string {
  if (feeType === "NONE" || feeValue === 0) return "Gratis";
  if (feeType === "PERCENTAGE") return `${feeValue}%`;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(feeValue);
}

// ============================================================
// Skeleton / Empty / Error
// ============================================================

function PaymentMethodSkeleton() {
  return (
    <div className="space-y-3 p-4">
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

function PaymentMethodErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-6 py-8 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
        <RefreshCw className="mr-2 size-4" />
        Coba Lagi
      </Button>
    </div>
  );
}

function PaymentMethodEmptyState() {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-6 py-8 text-center">
      <CreditCard className="size-8 text-muted-foreground" />
      <p className="mt-4 text-sm text-muted-foreground">
        Belum ada metode pembayaran
      </p>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export function PaymentMethodListPage() {
  // State
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethod[]>([]);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [providerFilter, setProviderFilter] = React.useState<"all" | PaymentProvider>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form dialog
  const [formOpen, setFormOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<PaymentMethod | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Form state
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [provider, setProvider] = React.useState<PaymentProvider>("DOKU");
  const [feeType, setFeeType] = React.useState<PaymentFeeType>("NOMINAL");
  const [feeValue, setFeeValue] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [sortOrder, setSortOrder] = React.useState("0");

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = React.useState<PaymentMethod | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Debounce search
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
    }, 400);
    return () => window.clearTimeout(t);
  }, [search]);

  // Fetch data
  const fetchPaymentMethods = React.useCallback(
    async (options?: { showLoading?: boolean; showRefreshing?: boolean }) => {
      try {
        if (options?.showLoading) setIsLoading(true);
        if (options?.showRefreshing) setIsRefreshing(true);
        setError(null);

        const params = new URLSearchParams();
        if (providerFilter !== "all") params.set("provider", providerFilter);
        if (statusFilter === "active") params.set("isActive", "true");

        const res = await fetch(`/api/settings/payment-methods?${params}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const json = (await res.json()) as ListResponse;

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error?.message ?? "Gagal memuat metode pembayaran");
        }

        setPaymentMethods(json.data.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        if (options?.showLoading) setIsLoading(false);
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    [providerFilter, statusFilter]
  );

  React.useEffect(() => {
    void fetchPaymentMethods({ showLoading: true });
  }, [fetchPaymentMethods]);

  // Filter
  const filteredMethods = React.useMemo(() => {
    if (!debouncedSearch) return paymentMethods;
    return paymentMethods.filter(
      (m) =>
        m.name.toLowerCase().includes(debouncedSearch) ||
        m.code.toLowerCase().includes(debouncedSearch)
    );
  }, [paymentMethods, debouncedSearch]);

  // Group by displayGroup
  const groupedMethods = React.useMemo(() => {
    const groups: Record<string, PaymentMethod[]> = {};
    for (const method of filteredMethods) {
      const group = method.displayGroup ?? "Lainnya";
      if (!groups[group]) groups[group] = [];
      groups[group].push(method);
    }
    return groups;
  }, [filteredMethods]);

  // Form handlers
  function openCreateDialog() {
    setEditTarget(null);
    setCode("");
    setName("");
    setProvider("DOKU");
    setFeeType("NOMINAL");
    setFeeValue("");
    setIsActive(true);
    setSortOrder("0");
    setFormError(null);
    setFormOpen(true);
  }

  function openEditDialog(m: PaymentMethod) {
    setEditTarget(m);
    setCode(m.code);
    setName(m.name);
    setProvider(m.provider);
    setFeeType(m.feeType);
    setFeeValue(String(m.feeValue));
    setIsActive(m.isActive);
    setSortOrder(String(m.sortOrder));
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

    if (!editTarget && !code.trim()) {
      setFormError("Code wajib diisi.");
      return;
    }
    if (!name.trim()) {
      setFormError("Nama wajib diisi.");
      return;
    }
    const numFee = Number(feeValue);
    if (feeValue === "" || isNaN(numFee) || numFee < 0) {
      setFormError("Nilai fee wajib diisi dan tidak boleh negatif.");
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        ...(editTarget ? {} : { code: code.trim() }),
        name: name.trim(),
        provider,
        feeType,
        feeValue: numFee,
        isActive,
        sortOrder: Number(sortOrder) || 0,
      };

      let res: Response;
      if (editTarget) {
        res = await fetch(`/api/settings/payment-methods/${editTarget.code}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/settings/payment-methods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = (await res.json()) as MutationResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal menyimpan");
      }

      setFormOpen(false);
      await fetchPaymentMethods({ showRefreshing: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setIsSaving(false);
    }
  }

  // Toggle active
  async function handleToggleActive(m: PaymentMethod) {
    try {
      const res = await fetch(`/api/settings/payment-methods/${m.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !m.isActive }),
      });
      const json = (await res.json()) as MutationResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal update");
      }
      await fetchPaymentMethods({ showRefreshing: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal update");
    }
  }

  // Delete
  function openDeleteDialog(m: PaymentMethod) {
    setDeleteTarget(m);
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
      const res = await fetch(`/api/settings/payment-methods/${deleteTarget.code}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as MutationResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal menghapus");
      }
      setDeleteTarget(null);
      await fetchPaymentMethods({ showRefreshing: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setIsDeleting(false);
    }
  }

  const hasSearch = search.trim().length > 0 || providerFilter !== "all" || statusFilter !== "all";

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">Metode Pembayaran</h3>
            <p className="text-sm text-muted-foreground">
              Kelola CASH, DOKU VA, QRIS, e-wallet, dll
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void fetchPaymentMethods({ showRefreshing: true })}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw className={cn("mr-2 size-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button type="button" size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 size-4" />
              Tambah
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau code..."
              className="pl-9"
            />
          </div>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value as typeof providerFilter)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Semua Provider</option>
            <option value="CASH">CASH</option>
            <option value="DOKU">DOKU</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>

        {/* List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <PaymentMethodSkeleton />
            ) : error ? (
              <PaymentMethodErrorState message={error} onRetry={() => void fetchPaymentMethods({ showRefreshing: true })} />
            ) : filteredMethods.length === 0 ? (
              <PaymentMethodEmptyState />
            ) : (
              <div className="divide-y">
                {Object.entries(groupedMethods).map(([group, methods]) => (
                  <div key={group}>
                    <div className="bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                      {group}
                    </div>
                    {methods.map((m) => (
                      <div
                        key={m.code}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30"
                      >
                        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                          {m.icon ? (
                            <span className="text-xl">{m.icon}</span>
                          ) : (
                            getMethodIcon(m.provider)
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{m.name}</span>
                            {!m.isActive && (
                              <Badge variant="secondary" className="text-xs">
                                Nonaktif
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="font-mono text-xs">
                              {m.code}
                            </Badge>
                            <span>{m.provider}</span>
                            <span>•</span>
                            <span>Fee: {formatFee(m.feeType, m.feeValue)}</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button type="button" variant="ghost" size="icon" className="size-8" />}
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(m)}>
                              <Pencil className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(m)}>
                              {m.isActive ? (
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
                              onClick={() => openDeleteDialog(m)}
                            >
                              <Trash2 className="mr-2 size-4" />
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeFormDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Metode Pembayaran" : "Tambah Metode Pembayaran"}
            </DialogTitle>
            <DialogDescription>
              {editTarget
                ? `Ubah konfigurasi "${editTarget.name}"`
                : "Tambah metode pembayaran baru (CASH atau DOKU)"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!editTarget && (
              <div className="grid gap-2">
                <Label htmlFor="pm-code">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pm-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CASH, VA_BCA, QRIS"
                  disabled={isSaving}
                  className="font-mono"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="pm-name">
                Nama <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pm-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tunai, BCA Virtual Account"
                disabled={isSaving}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pm-provider">
                Provider <span className="text-destructive">*</span>
              </Label>
              <select
                id="pm-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as PaymentProvider)}
                disabled={isSaving || editTarget !== null}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="CASH">CASH (Bayar di tempat)</option>
                <option value="DOKU">DOKU (Payment Gateway)</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pm-fee-type">Tipe Fee</Label>
              <select
                id="pm-fee-type"
                value={feeType}
                onChange={(e) => setFeeType(e.target.value as PaymentFeeType)}
                disabled={isSaving}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="NONE">Gratis (0)</option>
                <option value="NOMINAL">Nominal (Rp)</option>
                <option value="PERCENTAGE">Persentase (%)</option>
              </select>
            </div>

            {feeType !== "NONE" && (
              <div className="grid gap-2">
                <Label htmlFor="pm-fee-value">
                  Nilai Fee {feeType === "PERCENTAGE" ? "(%)" : "(Rp)"}
                </Label>
                <Input
                  id="pm-fee-value"
                  type="text"
                  inputMode="decimal"
                  value={feeValue}
                  onChange={(e) => setFeeValue(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder={feeType === "PERCENTAGE" ? "2.5" : "4000"}
                  disabled={isSaving}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                id="pm-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isSaving}
                className="size-4 cursor-pointer accent-primary"
              />
              <Label htmlFor="pm-active" className="cursor-pointer text-sm font-normal">
                Aktifkan metode pembayaran ini
              </Label>
            </div>

            {formError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeFormDialog} disabled={isSaving}>
                Batal
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : editTarget ? (
                  "Simpan"
                ) : (
                  "Tambah"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) closeDeleteDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Metode Pembayaran?</DialogTitle>
            <DialogDescription>
              Metode pembayaran{" "}
              <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code}) akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDeleteDialog} disabled={isDeleting}>
              Batal
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 size-4" />
                  Hapus
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
