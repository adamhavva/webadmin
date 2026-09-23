"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
import {
  PASSWORD_MIN_LENGTH,
  passwordRules,
} from "@/modules/user/user.validator";

const PHONE_REGEX = /^\+62\d{8,13}$/;

function normalizePhone(input: string): string {
  if (!input) return "";
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  let local = digits;
  if (local.startsWith("62")) local = local.slice(2);
  else if (local.startsWith("0")) local = local.slice(1);
  return `+62${local}`;
}

export type AdminFormData = {
  id?: string;
  email?: string;
  name: string;
  phone: string | null;
  status?: "ACTIVE" | "INACTIVE";
};

type Props = {
  mode: "create" | "edit";
  userId?: string;
  initial?: AdminFormData;
};

export function AdminForm({ mode, userId, initial }: Props) {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [phone, setPhone] = React.useState(initial?.phone ?? "");
  const [status, setStatus] = React.useState<"ACTIVE" | "INACTIVE">(
    initial?.status ?? "ACTIVE"
  );

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError(null);

    const trimmedName = name.trim();
    const normalizedPhone = phone.trim() ? normalizePhone(phone) : "";

    if (!trimmedName) {
      setError("Nama wajib diisi.");
      return;
    }

    if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
      setError("Format nomor telepon tidak valid. Contoh: +6281234567890");
      return;
    }

    if (mode === "create") {
      if (!email.trim()) {
        setError("Email wajib diisi.");
        return;
      }
      if (!passwordRules.minLength(password)) {
        setError(`Password minimal ${PASSWORD_MIN_LENGTH} karakter.`);
        return;
      }
      if (!passwordRules.hasNumber(password)) {
        setError("Password harus mengandung minimal 1 angka.");
        return;
      }
      if (!passwordRules.hasUpper(password)) {
        setError("Password harus mengandung minimal 1 huruf besar.");
        return;
      }
      if (!passwordRules.hasSymbol(password)) {
        setError("Password harus mengandung minimal 1 simbol.");
        return;
      }
    }

    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        name: trimmedName,
        role: "ADMIN",
        phone: normalizedPhone || null,
      };

      if (mode === "create") {
        payload.email = email.trim();
        payload.password = password;
      } else {
        payload.status = status;
      }

      const url = mode === "create" ? "/api/users" : `/api/users/${userId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || json.success === false) {
        setError(json?.error?.message ?? "Gagal menyimpan admin");
        return;
      }

      router.push("/admins");
      router.refresh();
    } catch {
      setError("Gagal menyimpan admin. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Tambah Admin" : "Edit Admin"}
          </CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Buat akun administrator baru untuk sistem."
              : "Perbarui informasi administrator."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {mode === "create" && (
            <div className="grid gap-2">
              <Label htmlFor="admin-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="admin@ascend.id"
                autoComplete="email"
              />
            </div>
          )}

          {mode === "create" && (
            <div className="grid gap-2">
              <Label htmlFor="admin-password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="Min 8 karakter, angka, huruf besar, simbol"
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                Minimal 8 karakter, mengandung angka, huruf besar, dan
                simbol.
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="admin-name">
              Nama <span className="text-destructive">*</span>
            </Label>
            <Input
              id="admin-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              maxLength={100}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="admin-phone">Nomor telepon</Label>
            <Input
              id="admin-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => {
                if (phone.trim()) setPhone(normalizePhone(phone));
              }}
              placeholder="+6281234567890"
              disabled={loading}
              maxLength={20}
            />
          </div>

          {mode === "edit" && (
            <div className="grid gap-2">
              <Label htmlFor="admin-status">Status</Label>
              <select
                id="admin-status"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "ACTIVE" | "INACTIVE")
                }
                disabled={loading}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400"
            >
              {error}
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
            {mode === "create" ? "Buat Admin" : "Simpan Perubahan"}
          </Button>
        </div>
      </Card>
    </form>
  );
}