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

// ---------- Constants ----------

type Role = "ADMIN" | "BARISTA" | "CUSTOMER";

const PHONE_REGEX = /^\+62\d{8,13}$/;
const KTP_REGEX = /^\d{16}$/;

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  BARISTA: "Barista",
  CUSTOMER: "Customer",
};

// ---------- Helpers ----------

function normalizePhone(input: string): string {
  if (!input) return "";
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  let local = digits;
  if (local.startsWith("62")) local = local.slice(2);
  else if (local.startsWith("0")) local = local.slice(1);
  return `+62${local}`;
}

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---------- Types ----------

export type UserFormData = {
  id?: string;
  email?: string;
  name: string;
  role: Role;
  phone: string | null;
  address: string | null;
  idNumber: string | null;
  birthDate: string | null;
  joinDate: string | null;
  addressKtp: string | null;
  status?: "ACTIVE" | "INACTIVE";
};

type Props = {
  mode: "create" | "edit";
  userId?: string;
  initial?: UserFormData;
  /**
   * Role yang bisa dipilih. Kalau hanya 1 role, dropdown role akan
   * otomatis terkunci ke role tersebut.
   */
  allowedRoles: Role[];
  /**
   * Path redirect setelah sukses. Contoh: "/users" atau "/admins".
   * Default: "/users".
   */
  redirectTo?: string;
  /**
   * Judul & deskripsi card. Kalau tidak diisi, akan otomatis.
   */
  title?: string;
  description?: string;
};

// ---------- Component ----------

export function UserForm({
  mode,
  userId,
  initial,
  allowedRoles,
  redirectTo,
  title,
  description,
}: Props) {
  const router = useRouter();

  const defaultRole: Role = allowedRoles[0] ?? "BARISTA";
  const singleRole = allowedRoles.length === 1;

  // ---------- State ----------
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [role, setRole] = React.useState<Role>(initial?.role ?? defaultRole);
  const [status, setStatus] = React.useState<"ACTIVE" | "INACTIVE">(
    initial?.status ?? "ACTIVE"
  );
  const [phone, setPhone] = React.useState(initial?.phone ?? "");
  const [address, setAddress] = React.useState(initial?.address ?? "");
  const [idNumber, setIdNumber] = React.useState(initial?.idNumber ?? "");
  const [birthDate, setBirthDate] = React.useState(
    isoToDateInput(initial?.birthDate)
  );
  const [joinDate, setJoinDate] = React.useState(
    isoToDateInput(initial?.joinDate)
  );
  const [addressKtp, setAddressKtp] = React.useState(
    initial?.addressKtp ?? ""
  );

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ---------- Submit ----------
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError(null);

    const trimmedName = name.trim();
    const normalizedPhone = phone.trim() ? normalizePhone(phone) : "";
    const trimmedId = idNumber.trim();

    if (!trimmedName) {
      setError("Nama wajib diisi.");
      return;
    }

    if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
      setError("Format nomor telepon tidak valid. Contoh: +6281234567890");
      return;
    }

    if (trimmedId && !KTP_REGEX.test(trimmedId)) {
      setError("No KTP harus 16 digit angka.");
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
        role,
        phone: normalizedPhone || null,
        address: address.trim() || null,
        idNumber: trimmedId || null,
        birthDate: birthDate || null,
        joinDate: joinDate || null,
        addressKtp: addressKtp.trim() || null,
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
        setError(json?.error?.message ?? "Gagal menyimpan pengguna");
        return;
      }

      const target = redirectTo ?? "/users";
      router.push(target);
      router.refresh();
    } catch {
      setError("Gagal menyimpan pengguna. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- Computed ----------
  const cardTitle =
    title ??
    (mode === "create"
      ? singleRole
        ? `Tambah ${ROLE_LABEL[role]}`
        : "Tambah Pengguna"
      : singleRole
        ? `Edit ${ROLE_LABEL[role]}`
        : "Edit Pengguna");

  const cardDescription =
    description ??
    (mode === "create"
      ? "Lengkapi data di bawah untuk membuat akun baru."
      : "Perbarui informasi akun pengguna.");

  // ---------- Render ----------
  return (
    <form onSubmit={handleSubmit} className="w-full">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{cardTitle}</CardTitle>
          <CardDescription>{cardDescription}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* ============ AKUN ============ */}
          <section className="space-y-5">
            <div>
              <h3 className="text-sm font-medium">Informasi Akun</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Kredensial login dan role pengguna.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {mode === "create" && (
                <div className="grid gap-2">
                  <Label htmlFor="user-email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="user@ascend.id"
                    autoComplete="email"
                  />
                </div>
              )}

              {mode === "create" && (
                <div className="grid gap-2">
                  <Label htmlFor="user-password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="user-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="Min 8 karakter"
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimal {PASSWORD_MIN_LENGTH} karakter, mengandung
                    angka, huruf besar, dan simbol.
                  </p>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="user-role">
                  Role <span className="text-destructive">*</span>
                </Label>
                <select
                  id="user-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  disabled={loading || singleRole}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  {allowedRoles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                {singleRole && (
                  <p className="text-xs text-muted-foreground">
                    Role terkunci ke {ROLE_LABEL[role]}.
                  </p>
                )}
              </div>

              {mode === "edit" && (
                <div className="grid gap-2">
                  <Label htmlFor="user-status">Status</Label>
                  <select
                    id="user-status"
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
            </div>
          </section>

          {/* ============ DATA PRIBADI ============ */}
          <section className="space-y-5 border-t pt-8">
            <div>
              <h3 className="text-sm font-medium">Data Pribadi</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Informasi identitas dan kontak pengguna.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="user-name">
                  Nama Lengkap <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="user-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  maxLength={100}
                  placeholder="Nama lengkap"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="user-phone">Nomor Telepon</Label>
                <Input
                  id="user-phone"
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
                {phone.trim() &&
                  !PHONE_REGEX.test(normalizePhone(phone)) && (
                    <p className="text-xs text-destructive">
                      Format tidak valid. Contoh: +6281234567890
                    </p>
                  )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="user-id-number">No KTP</Label>
                <Input
                  id="user-id-number"
                  value={idNumber}
                  onChange={(e) =>
                    setIdNumber(
                      e.target.value.replace(/\D/g, "").slice(0, 16)
                    )
                  }
                  placeholder="16 digit angka"
                  inputMode="numeric"
                  disabled={loading}
                  maxLength={16}
                />
                {idNumber && !KTP_REGEX.test(idNumber) && (
                  <p className="text-xs text-destructive">
                    No KTP harus tepat 16 digit.
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="user-birth-date">Tanggal Lahir</Label>
                <Input
                  id="user-birth-date"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="user-join-date">Tanggal Masuk Kerja</Label>
                <Input
                  id="user-join-date"
                  type="date"
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="user-address">Alamat Domisili</Label>
                <Input
                  id="user-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat tempat tinggal saat ini"
                  disabled={loading}
                  maxLength={300}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="user-address-ktp">Alamat Sesuai KTP</Label>
                <Input
                  id="user-address-ktp"
                  value={addressKtp}
                  onChange={(e) => setAddressKtp(e.target.value)}
                  placeholder="Alamat sesuai KTP"
                  disabled={loading}
                  maxLength={300}
                />
              </div>
            </div>
          </section>

          {/* ============ ERROR ============ */}
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
            {mode === "create" ? "Buat Pengguna" : "Simpan Perubahan"}
          </Button>
        </div>
      </Card>
    </form>
  );
}