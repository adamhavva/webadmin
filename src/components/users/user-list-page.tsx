"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  PowerOff,
  RefreshCw,
  Search,
  Users as UsersIcon,
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
import { Label } from "@/components/ui/label";
import {
  PASSWORD_MIN_LENGTH,
  passwordRules,
} from "@/modules/user/user.validator";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type Role = "ADMIN" | "BARISTA" | "CUSTOMER";
type UserStatus = "ACTIVE" | "INACTIVE";

type User = {
  id: string;
  role: Role;
  status: UserStatus;
  name: string;
  phone: string | null;
  idNumber: string | null;
  createdAt: string;
};

type ListResponse = {
  success: boolean;
  data?: {
    items: User[];
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

type Props = {
  title: string;
  description: string;
  basePath: string;
  roleGroup: "managed" | "admin";
  showRoleFilter?: boolean;
};

// ============================================================
// Helpers
// ============================================================

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(date);
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ============================================================
// Skeleton / Error / Empty
// ============================================================

function UserSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-4">
          <div className="size-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="size-8 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function UserErrorState({
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
      <h3 className="mt-4 text-sm font-semibold">Gagal memuat data</h3>
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

function UserEmptyState({
  hasSearch,
  onClearSearch,
  basePath,
}: {
  hasSearch: boolean;
  onClearSearch: () => void;
  basePath: string;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <UsersIcon className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">
        {hasSearch ? "Pengguna tidak ditemukan" : "Belum ada pengguna"}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {hasSearch
          ? "Tidak ada pengguna yang cocok dengan pencarian."
          : "Belum ada pengguna yang terdaftar."}
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
        <Link
          href={`${basePath}/new`}
          className={cn(buttonVariants(), "mt-4")}
        >
          <Plus className="mr-2 size-4" />
          Tambah Pengguna
        </Link>
      )}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export function UserListPage({
  title,
  description,
  basePath,
  roleGroup,
  showRoleFilter = false,
}: Props) {
  const router = useRouter();

  // ---------- List state ----------
  const [users, setUsers] = React.useState<User[]>([]);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    "ALL" | UserStatus
  >("ALL");
  const [roleFilter, setRoleFilter] = React.useState<
    "ALL" | "BARISTA" | "CUSTOMER"
  >("ALL");
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<
    { total: number; totalPages: number } | undefined
  >();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ---------- Reset password dialog ----------
  const [resetUser, setResetUser] = React.useState<User | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [isResetting, setIsResetting] = React.useState(false);
  const [resetError, setResetError] = React.useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = React.useState<string | null>(null);

  // ---------- Disable dialog ----------
  const [disableUser, setDisableUser] = React.useState<User | null>(null);
  const [isDisabling, setIsDisabling] = React.useState(false);

  // ---------- Debounce search ----------
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  // ---------- Fetch list ----------
  const fetchUsers = React.useCallback(
    async (
      currentPage: number,
      currentSearch: string,
      currentStatus: "ALL" | UserStatus,
      currentRole: "ALL" | "BARISTA" | "CUSTOMER",
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

        if (currentRole !== "ALL") {
          params.set("role", currentRole);
        } else {
          params.set("roleGroup", roleGroup);
        }

        if (currentStatus !== "ALL") {
          params.set("status", currentStatus);
        }

        const response = await fetch(
          `/api/users?${params.toString()}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );

        const result = (await response.json()) as ListResponse;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(
            result.error?.message ?? "Gagal mengambil data pengguna."
          );
        }

        setUsers(result.data.items);
        setPagination(result.data.pagination);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Gagal mengambil data pengguna."
        );
      } finally {
        if (options?.showLoading) setIsLoading(false);
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    [roleGroup]
  );

  React.useEffect(() => {
    void fetchUsers(page, debouncedSearch, statusFilter, roleFilter, {
      showLoading: true,
    });
  }, [page, debouncedSearch, statusFilter, roleFilter, fetchUsers]);

  function handleRefresh() {
    void fetchUsers(page, debouncedSearch, statusFilter, roleFilter, {
      showRefreshing: true,
    });
  }

  // ---------- Reset password ----------
  function openResetPassword(user: User) {
    setResetUser(user);
    setNewPassword("");
    setResetError(null);
    setResetSuccess(null);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUser || isResetting) return;

    setResetError(null);
    setResetSuccess(null);

    if (!passwordRules.minLength(newPassword)) {
      setResetError(`Password minimal ${PASSWORD_MIN_LENGTH} karakter.`);
      return;
    }
    if (!passwordRules.hasNumber(newPassword)) {
      setResetError("Password harus mengandung minimal 1 angka.");
      return;
    }
    if (!passwordRules.hasUpper(newPassword)) {
      setResetError("Password harus mengandung minimal 1 huruf besar.");
      return;
    }
    if (!passwordRules.hasSymbol(newPassword)) {
      setResetError("Password harus mengandung minimal 1 simbol.");
      return;
    }

    try {
      setIsResetting(true);
      const response = await fetch(
        `/api/users/${encodeURIComponent(resetUser.id)}/password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ newPassword }),
        }
      );

      const result = (await response.json()) as MutationResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error?.message ?? "Gagal mereset password."
        );
      }

      setResetSuccess("Password berhasil direset.");
      setNewPassword("");
      setTimeout(() => setResetUser(null), 800);
    } catch (err) {
      setResetError(
        err instanceof Error ? err.message : "Gagal mereset password."
      );
    } finally {
      setIsResetting(false);
    }
  }

  // ---------- Disable ----------
  async function handleDisable() {
    if (!disableUser || isDisabling) return;

    try {
      setIsDisabling(true);
      setError(null);

      const response = await fetch(
        `/api/users/${encodeURIComponent(disableUser.id)}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        }
      );

      const result = (await response.json()) as MutationResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error?.message ?? "Gagal menonaktifkan pengguna."
        );
      }

      setDisableUser(null);
      await fetchUsers(page, debouncedSearch, statusFilter, roleFilter, {
        showRefreshing: true,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menonaktifkan pengguna."
      );
    } finally {
      setIsDisabling(false);
    }
  }

  const hasSearch = search.trim().length > 0;
  const totalPages = pagination?.totalPages ?? 0;

  // ============================================================
  // Render
  // ============================================================

  return (
    <>
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {description}
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
              href={`${basePath}/new`}
              className={cn(buttonVariants())}
            >
              <Plus className="mr-2 size-4" />
              Tambah
            </Link>
          </div>
        </div>

        {/* Table Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base">
                Daftar Pengguna
              </CardTitle>

              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                <div className="relative w-full sm:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama, telepon, atau KTP..."
                    className="pl-9"
                  />
                </div>

                {showRoleFilter && (
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(
                        e.target.value as "ALL" | "BARISTA" | "CUSTOMER"
                      );
                      setPage(1);
                    }}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="ALL">Semua Role</option>
                    <option value="BARISTA">Barista</option>
                    <option value="CUSTOMER">Customer</option>
                  </select>
                )}

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(
                      e.target.value as "ALL" | UserStatus
                    );
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
              <UserSkeleton />
            ) : error ? (
              <UserErrorState
                message={error}
                onRetry={() => {
                  void fetchUsers(
                    page,
                    debouncedSearch,
                    statusFilter,
                    roleFilter,
                    { showRefreshing: true }
                  );
                }}
              />
            ) : users.length === 0 ? (
              <UserEmptyState
                hasSearch={hasSearch}
                onClearSearch={() => setSearch("")}
                basePath={basePath}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-6 py-3 text-left font-medium">
                          Nama
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Telepon
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          No KTP
                        </th>
                        {showRoleFilter && (
                          <th className="px-4 py-3 text-left font-medium">
                            Role
                          </th>
                        )}
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
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b last:border-b-0 hover:bg-muted/30"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                {getInitials(user.name)}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {user.name}
                                </div>
                                <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                                  {user.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-muted-foreground">
                            {user.phone ?? "-"}
                          </td>

                          <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                            {user.idNumber ?? "-"}
                          </td>

                          {showRoleFilter && (
                            <td className="px-4 py-4">
                              <Badge
                                variant="outline"
                                className="capitalize"
                              >
                                {user.role.toLowerCase()}
                              </Badge>
                            </td>
                          )}

                          <td className="px-4 py-4">
                            {user.status === "ACTIVE" ? (
                              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                                Aktif
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Nonaktif</Badge>
                            )}
                          </td>

                          <td className="px-4 py-4 text-muted-foreground">
                            {formatDate(user.createdAt)}
                          </td>

                          <td className="px-4 py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                type="button"
                                className="inline-flex size-8 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={`Aksi ${user.name}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </DropdownMenuTrigger>

                              <DropdownMenuContent
                                align="end"
                                className="min-w-48"
                              >
                                <DropdownMenuItem
                                  onClick={() => {
                                    router.push(
                                      `${basePath}/${encodeURIComponent(
                                        user.id
                                      )}`
                                    );
                                  }}
                                >
                                  <Eye className="mr-2 size-4" />
                                  Lihat Detail
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => {
                                    router.push(
                                      `${basePath}/${encodeURIComponent(
                                        user.id
                                      )}/edit`
                                    );
                                  }}
                                >
                                  <Pencil className="mr-2 size-4" />
                                  Edit
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => openResetPassword(user)}
                                >
                                  <KeyRound className="mr-2 size-4" />
                                  Reset Password
                                </DropdownMenuItem>

                                {user.status === "ACTIVE" && (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => {
                                      setError(null);
                                      setDisableUser(user);
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
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    {pagination?.total ?? 0} pengguna
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

      {/* ================= RESET PASSWORD DIALOG ================= */}
      <Dialog
        open={resetUser !== null}
        onOpenChange={(open) => {
          if (!open && !isResetting) {
            setResetUser(null);
            setNewPassword("");
            setResetError(null);
            setResetSuccess(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set password baru untuk{" "}
              <strong>{resetUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="new-password">Password baru</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 karakter, angka, huruf besar, simbol"
                autoComplete="new-password"
                disabled={isResetting}
              />
              <p className="text-xs text-muted-foreground">
                Minimal {PASSWORD_MIN_LENGTH} karakter, harus mengandung
                angka, huruf besar, dan simbol.
              </p>
            </div>

            {resetError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {resetError}
              </div>
            )}
            {resetSuccess && (
              <div className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                {resetSuccess}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetUser(null)}
                disabled={isResetting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isResetting}>
                {isResetting ? "Menyimpan..." : "Reset"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= DISABLE DIALOG ================= */}
      <Dialog
        open={disableUser !== null}
        onOpenChange={(open) => {
          if (!open && !isDisabling) setDisableUser(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nonaktifkan Pengguna?</DialogTitle>
            <DialogDescription>
              Pengguna <strong>{disableUser?.name}</strong> akan
              dinonaktifkan dan tidak bisa login lagi. Data tetap
              tersimpan dan dapat diaktifkan kembali lewat edit.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDisabling}
              onClick={() => setDisableUser(null)}
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