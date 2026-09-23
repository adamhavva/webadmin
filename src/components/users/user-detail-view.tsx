"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  KeyRound,
  Pencil,
  PowerOff,
  RefreshCw,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PASSWORD_MIN_LENGTH,
  passwordRules,
} from "@/modules/user/user.validator";
import { cn } from "@/lib/utils";

// ---------- Types ----------

type Role = "ADMIN" | "BARISTA" | "CUSTOMER";
type UserStatus = "ACTIVE" | "INACTIVE";

type UserDetail = {
  id: string;
  firebaseUid: string;
  email: string;
  role: Role;
  status: UserStatus;
  name: string;
  phone: string | null;
  address: string | null;
  avatarUrl: string | null;
  idNumber: string | null;
  birthDate: string | null;
  joinDate: string | null;
  addressKtp: string | null;
  createdAt: string;
  updatedAt: string;
};

type DetailResponse = {
  success: boolean;
  data?: UserDetail;
  error?: { message?: string };
};

type MutationResponse = {
  success: boolean;
  error?: { message?: string };
};

type Props = {
  userId: string;
  basePath: string; // "/users" atau "/admins"
  backLabel?: string; // "Kembali ke Daftar Pengguna" / "Kembali ke Daftar Admin"
};

// ---------- Helpers ----------

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
  }).format(date);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ---------- Skeleton / Error ----------

function DetailSkeleton() {
  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-4">
        <div className="size-20 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-3">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
}

function DetailError({
  message,
  onRetry,
  basePath,
}: {
  message: string;
  onRetry: () => void;
  basePath: string;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">
        Gagal memuat data pengguna
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 size-4" />
          Coba Lagi
        </Button>
        <Link
          href={basePath}
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          Kembali
        </Link>
      </div>
    </div>
  );
}

// ---------- Main ----------

export function UserDetailView({ userId, basePath, backLabel }: Props) {
  const router = useRouter();

  const [user, setUser] = React.useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Reset password dialog
  const [pwOpen, setPwOpen] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [isResetting, setIsResetting] = React.useState(false);
  const [resetError, setResetError] = React.useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = React.useState<string | null>(null);

  // Disable dialog
  const [disableOpen, setDisableOpen] = React.useState(false);
  const [isDisabling, setIsDisabling] = React.useState(false);

  // ---------- Fetch ----------
  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const json = (await res.json()) as DetailResponse;

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? "Gagal memuat data pengguna.");
      }

      setUser(json.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat data pengguna."
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // ---------- Reset password ----------
  function openResetPassword() {
    setNewPassword("");
    setResetError(null);
    setResetSuccess(null);
    setPwOpen(true);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user || isResetting) return;

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
      const res = await fetch(
        `/api/users/${encodeURIComponent(user.id)}/password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ newPassword }),
        }
      );

      const json = (await res.json()) as MutationResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal mereset password.");
      }

      setResetSuccess("Password berhasil direset.");
      setNewPassword("");
      setTimeout(() => setPwOpen(false), 800);
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
    if (!user || isDisabling) return;

    try {
      setIsDisabling(true);
      const res = await fetch(`/api/users/${encodeURIComponent(user.id)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });

      const json = (await res.json()) as MutationResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Gagal menonaktifkan.");
      }

      setDisableOpen(false);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menonaktifkan."
      );
      setDisableOpen(false);
    } finally {
      setIsDisabling(false);
    }
  }

  // ---------- Render ----------
  if (isLoading) {
    return (
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        <DetailError
          message={error ?? "Pengguna tidak ditemukan."}
          onRetry={() => void load()}
          basePath={basePath}
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex w-full flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={basePath}
              aria-label="Kembali"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" })
              )}
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Detail Pengguna
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {backLabel ?? "Kembali ke daftar"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`${basePath}/${user.id}/edit`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <Pencil className="mr-2 size-4" />
              Edit
            </Link>

            <Button
              type="button"
              variant="outline"
              onClick={openResetPassword}
            >
              <KeyRound className="mr-2 size-4" />
              Reset Password
            </Button>

            {user.status === "ACTIVE" && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDisableOpen(true)}
              >
                <PowerOff className="mr-2 size-4" />
                Nonaktifkan
              </Button>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <Card className="w-full">
          <CardContent className="p-6">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <div className="size-20 shrink-0 overflow-hidden rounded-full border-2 border-muted bg-muted">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-medium text-muted-foreground">
                    {getInitials(user.name)}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-semibold">{user.name}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {user.email || "-"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize">
                    {user.role.toLowerCase()}
                  </Badge>
                  {user.status === "ACTIVE" ? (
                    <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                      Aktif
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Nonaktif</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detail Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Kontak & Identitas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Kontak & Identitas
              </CardTitle>
              <CardDescription>
                Informasi pribadi dan dokumen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Nomor Telepon
                  </dt>
                  <dd className="mt-1 text-sm font-medium">
                    {user.phone ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">No KTP</dt>
                  <dd className="mt-1 font-mono text-sm">
                    {user.idNumber ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Tanggal Lahir
                  </dt>
                  <dd className="mt-1 text-sm">
                    {formatDate(user.birthDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Tanggal Masuk Kerja
                  </dt>
                  <dd className="mt-1 text-sm">
                    {formatDate(user.joinDate)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Alamat */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alamat</CardTitle>
              <CardDescription>
                Alamat domisili dan sesuai KTP.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Alamat Domisili
                  </dt>
                  <dd className="mt-1 text-sm">{user.address ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Alamat Sesuai KTP
                  </dt>
                  <dd className="mt-1 text-sm">{user.addressKtp ?? "-"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Sistem */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Informasi Sistem</CardTitle>
              <CardDescription>
                Metadata akun dari database.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Firebase UID
                  </dt>
                  <dd className="mt-1 break-all font-mono text-xs">
                    {user.firebaseUid}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Dibuat Pada
                  </dt>
                  <dd className="mt-1 text-sm">
                    {formatDateTime(user.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Terakhir Diperbarui
                  </dt>
                  <dd className="mt-1 text-sm">
                    {formatDateTime(user.updatedAt)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ================= RESET PASSWORD DIALOG ================= */}
      <Dialog
        open={pwOpen}
        onOpenChange={(open) => {
          if (!open && !isResetting) {
            setPwOpen(false);
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
              Set password baru untuk <strong>{user.name}</strong>.
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
                Minimal {PASSWORD_MIN_LENGTH} karakter, mengandung angka,
                huruf besar, dan simbol.
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
                onClick={() => setPwOpen(false)}
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
        open={disableOpen}
        onOpenChange={(open) => {
          if (!open && !isDisabling) setDisableOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nonaktifkan Pengguna?</DialogTitle>
            <DialogDescription>
              Pengguna <strong>{user.name}</strong> akan dinonaktifkan dan
              tidak bisa login lagi. Data tetap tersimpan dan dapat
              diaktifkan kembali lewat edit.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDisabling}
              onClick={() => setDisableOpen(false)}
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