"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { UserForm, type UserFormData } from "@/components/users/user-form";
import { cn } from "@/lib/utils";

type DetailResponse = {
  success: boolean;
  data?: {
    id: string;
    email: string;
    name: string;
    role: "ADMIN" | "BARISTA" | "CUSTOMER";
    status: "ACTIVE" | "INACTIVE";
    phone: string | null;
    address: string | null;
    idNumber: string | null;
    birthDate: string | null;
    joinDate: string | null;
    addressKtp: string | null;
  };
  error?: { message?: string };
};

function EditSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-96 animate-pulse rounded-lg border bg-muted/40" />
    </div>
  );
}

export default function EditAdminPage() {
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = React.useState<UserFormData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/users/${encodeURIComponent(userId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );

      const result = (await response.json()) as DetailResponse;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.error?.message ?? "Gagal memuat data admin."
        );
      }

      const data = result.data;

      if (data.role !== "ADMIN") {
        throw new Error(
          "Pengguna ini bukan administrator. Kelola melalui halaman Management User."
        );
      }

      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        phone: data.phone,
        address: data.address,
        idNumber: data.idNumber,
        birthDate: data.birthDate,
        joinDate: data.joinDate,
        addressKtp: data.addressKtp,
        status: data.status,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat data admin."
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admins"
          aria-label="Kembali"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Edit Admin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.name ?? "Memuat..."}
          </p>
        </div>
      </div>

      {isLoading ? (
        <EditSkeleton />
      ) : error ? (
        <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-5 text-destructive" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">
            Gagal memuat data admin
          </h3>
          <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            {error}
          </p>
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="outline" onClick={() => void load()}>
              <RefreshCw className="mr-2 size-4" />
              Coba Lagi
            </Button>
            <Link
              href="/admins"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Kembali
            </Link>
          </div>
        </div>
      ) : user ? (
        <UserForm
          mode="edit"
          userId={user.id}
          initial={user}
          allowedRoles={["ADMIN"]}
          redirectTo="/admins"
        />
      ) : null}
    </div>
  );
}