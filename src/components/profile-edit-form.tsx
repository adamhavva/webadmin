"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Camera, Loader2, Trash2, Check, X } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import {
  PASSWORD_MIN_LENGTH,
  passwordRules,
} from "@/modules/user/user.validator";

const MAX_AVATAR_SIZE_BYTES = 1_000_000;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const PHONE_REGEX = /^\+62\d{8,13}$/;
const KTP_REGEX = /^\d{16}$/;

// ---------- Helpers ----------

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsDataURL(file);
  });
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function normalizePhone(input: string): string {
  if (!input) return "";
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  let local = digits;
  if (local.startsWith("62")) local = local.slice(2);
  else if (local.startsWith("0")) local = local.slice(1);
  return `+62${local}`;
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(d);
}

function RequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-green-500">
          <Check className="size-3 text-white" strokeWidth={3} />
        </span>
      ) : (
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-red-500">
          <X className="size-3 text-white" strokeWidth={3} />
        </span>
      )}
      <span
        className={
          met
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"
        }
      >
        {label}
      </span>
    </div>
  );
}

// ---------- Types ----------

type ProfileData = {
  id: string;
  firebaseUid: string;
  email: string;
  role: "ADMIN" | "BARISTA" | "CUSTOMER";
  status: "ACTIVE" | "INACTIVE";
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

// ---------- Snapshot untuk deteksi dirty ----------

type Snapshot = {
  name: string;
  phone: string;
  address: string;
  avatarUrl: string | null;
  idNumber: string;
  birthDate: string;
  joinDate: string;
  addressKtp: string;
};

function snapshotFrom(profile: ProfileData): Snapshot {
  return {
    name: profile.name,
    phone: profile.phone ?? "",
    address: profile.address ?? "",
    avatarUrl: profile.avatarUrl,
    idNumber: profile.idNumber ?? "",
    birthDate: isoToDateInput(profile.birthDate),
    joinDate: isoToDateInput(profile.joinDate),
    addressKtp: profile.addressKtp ?? "",
  };
}

// ============================================================
// MAIN
// ============================================================

export function ProfileEditForm() {
  const router = useRouter();
  const { data: session, status, update } = useSession();

  const [profile, setProfile] = React.useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = React.useState(true);

  // Editable
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [idNumber, setIdNumber] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const [joinDate, setJoinDate] = React.useState("");
  const [addressKtp, setAddressKtp] = React.useState("");

  // Password
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const originalRef = React.useRef<Snapshot | null>(null);

  // ---------- Fetch profile lengkap (termasuk avatarUrl, createdAt, updatedAt) ----------
  const loadProfile = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const json = await res.json();
      if (!res.ok || json.success === false) {
        setError(json?.error?.message ?? "Gagal memuat profil");
        return null;
      }
      const data = json.data as ProfileData;
      setProfile(data);
      setName(data.name);
      setPhone(data.phone ?? "");
      setAddress(data.address ?? "");
      setAvatarUrl(data.avatarUrl ?? null);
      setIdNumber(data.idNumber ?? "");
      setBirthDate(isoToDateInput(data.birthDate));
      setJoinDate(isoToDateInput(data.joinDate));
      setAddressKtp(data.addressKtp ?? "");
      originalRef.current = snapshotFrom(data);
      return data;
    } catch {
      setError("Gagal memuat profil. Coba refresh halaman.");
      return null;
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    loadProfile();
  }, [status, loadProfile]);

  if (status === "loading" || loadingProfile) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
        Memuat data...
      </div>
    );
  }

  if (!session?.user || !profile) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-destructive">
        {error ?? "Tidak dapat memuat profil."}
      </div>
    );
  }

  const initials = getInitials(profile.name);

  // ---------- Avatar ----------
  async function handleAvatarChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Format gambar harus PNG, JPG, atau WEBP.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setError("Ukuran gambar maksimal 1 MB.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataURL(file);
      setAvatarUrl(dataUrl);
    } catch {
      setError("Gagal membaca file gambar.");
    }
  }

  // ---------- Submit ----------
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setSuccess(null);

    const orig = originalRef.current;
    if (!orig) return;

    const patch: Record<string, unknown> = {};

    const trimmedName = name.trim();
    const normalizedPhone = phone.trim() ? normalizePhone(phone) : "";
    const trimmedAddress = address.trim();
    const trimmedId = idNumber.trim();
    const trimmedAddressKtp = addressKtp.trim();

    if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
      setError("Format nomor telepon tidak valid. Contoh: +6281234567890");
      return;
    }
    if (trimmedId && !KTP_REGEX.test(trimmedId)) {
      setError("No KTP harus 16 digit angka.");
      return;
    }

    if (trimmedName !== orig.name) patch.name = trimmedName;
    if (normalizedPhone !== orig.phone)
      patch.phone = normalizedPhone || null;
    if (trimmedAddress !== orig.address)
      patch.address = trimmedAddress || null;
    if (avatarUrl !== orig.avatarUrl) patch.avatarUrl = avatarUrl;
    if (trimmedId !== orig.idNumber)
      patch.idNumber = trimmedId || null;
    if (birthDate !== orig.birthDate)
      patch.birthDate = birthDate || null;
    if (joinDate !== orig.joinDate) patch.joinDate = joinDate || null;
    if (trimmedAddressKtp !== orig.addressKtp)
      patch.addressKtp = trimmedAddressKtp || null;

    // Password
    const willUpdatePassword =
      newPassword.length > 0 || confirmPassword.length > 0;

    if (willUpdatePassword) {
      if (!passwordRules.minLength(newPassword)) {
        setError(`Password minimal ${PASSWORD_MIN_LENGTH} karakter.`);
        return;
      }
      if (!passwordRules.hasNumber(newPassword)) {
        setError("Password harus mengandung minimal 1 angka.");
        return;
      }
      if (!passwordRules.hasUpper(newPassword)) {
        setError("Password harus mengandung minimal 1 huruf besar.");
        return;
      }
      if (!passwordRules.hasSymbol(newPassword)) {
        setError("Password harus mengandung minimal 1 simbol.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Konfirmasi password tidak cocok.");
        return;
      }
    }

    if (Object.keys(patch).length === 0 && !willUpdatePassword) {
      setError("Tidak ada perubahan untuk disimpan.");
      return;
    }

    setLoading(true);

    try {
      let updatedProfile: ProfileData | null = null;

      if (Object.keys(patch).length > 0) {
        const res = await fetch("/api/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const json = await res.json();
        if (!res.ok || json.success === false) {
          setError(json?.error?.message ?? "Gagal menyimpan perubahan");
          return;
        }
        updatedProfile = json.data as ProfileData;
      }

      if (willUpdatePassword) {
        const res = await fetch("/api/auth/me/password", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword, confirmPassword }),
        });
        const json = await res.json();
        if (!res.ok || json.success === false) {
          setError(json?.error?.message ?? "Gagal mengganti password");
          return;
        }
        setNewPassword("");
        setConfirmPassword("");
      }

      // Refresh session (tanpa avatarUrl)
      if (updatedProfile) {
        await update({
          name: updatedProfile.name,
          phone: updatedProfile.phone,
          address: updatedProfile.address,
          idNumber: updatedProfile.idNumber,
          birthDate: updatedProfile.birthDate,
          joinDate: updatedProfile.joinDate,
          addressKtp: updatedProfile.addressKtp,
          updatedAt: updatedProfile.updatedAt,
        });

        // Sync local state
        setProfile(updatedProfile);
        originalRef.current = snapshotFrom(updatedProfile);
      }

      setSuccess(
        willUpdatePassword && updatedProfile
          ? "Profil dan password berhasil diperbarui."
          : willUpdatePassword
            ? "Password berhasil diperbarui."
            : "Profil berhasil diperbarui."
      );
    } catch {
      setError("Gagal menyimpan perubahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- Password req ----------
  const req = {
    minLength: passwordRules.minLength(newPassword),
    hasNumber: passwordRules.hasNumber(newPassword),
    hasUpper: passwordRules.hasUpper(newPassword),
    hasSymbol: passwordRules.hasSymbol(newPassword),
  };
  const passwordAllValid =
    req.minLength && req.hasNumber && req.hasUpper && req.hasSymbol;
  const confirmFilled = confirmPassword.length > 0;
  const passwordMatch = confirmFilled && newPassword === confirmPassword;

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
            <CardDescription>
              Perbarui foto dan informasi akun Anda.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* ---------- Avatar ---------- */}
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <div className="shrink-0">
                <div className="size-24 overflow-hidden rounded-full border-2 border-muted bg-muted">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={profile.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-medium text-muted-foreground">
                      {initials}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-medium">Foto profil</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    PNG, JPG, atau WEBP. Maksimal 1 MB.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <label
                    htmlFor="avatar-upload"
                    className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Camera className="size-4" />
                    Pilih foto
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />

                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAvatarUrl(null)}
                      className="h-9 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-2 size-4" />
                      Hapus
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* ---------- Info Akun (read-only) ---------- */}
            <div className="grid gap-5">
              <div>
                <h3 className="text-sm font-medium">Info Akun</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Beberapa field tidak dapat diubah.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={profile.role}
                    disabled
                    readOnly
                    className="bg-muted capitalize"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Input
                    id="status"
                    value={profile.status}
                    disabled
                    readOnly
                    className="bg-muted capitalize"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="firebaseUid">Firebase UID</Label>
                  <Input
                    id="firebaseUid"
                    value={profile.firebaseUid}
                    disabled
                    readOnly
                    className="bg-muted font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Dibuat pada</Label>
                  <Input
                    value={formatDateTime(profile.createdAt)}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Terakhir diperbarui</Label>
                  <Input
                    value={formatDateTime(profile.updatedAt)}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* ---------- Data Pribadi ---------- */}
            <div className="grid gap-5">
              <div>
                <h3 className="text-sm font-medium">Data Pribadi</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Semua field opsional kecuali nama.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">
                  Nama <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  maxLength={100}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Nomor telepon</Label>
                  <Input
                    id="phone"
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
                  <Label htmlFor="idNumber">No KTP</Label>
                  <Input
                    id="idNumber"
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
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="birthDate">Tanggal lahir</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="joinDate">Tanggal masuk kerja</Label>
                  <Input
                    id="joinDate"
                    type="date"
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Alamat domisili</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat domisili"
                  disabled={loading}
                  maxLength={300}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="addressKtp">Alamat sesuai KTP</Label>
                <Input
                  id="addressKtp"
                  value={addressKtp}
                  onChange={(e) => setAddressKtp(e.target.value)}
                  placeholder="Alamat sesuai KTP"
                  disabled={loading}
                  maxLength={300}
                />
              </div>
            </div>

            <Separator />

            {/* ---------- Ganti Password ---------- */}
            <div className="grid gap-5">
              <div>
                <h3 className="text-sm font-medium">Ganti Password</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Kosongkan kalau tidak ingin mengganti.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="new-password">Password baru</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Kosongkan jika tidak diubah"
                    disabled={loading}
                  />

                  {newPassword.length > 0 && (
                    <div className="mt-2 space-y-1.5 rounded-md border bg-muted/30 p-3">
                      <RequirementItem
                        met={req.minLength}
                        label={`Minimal ${PASSWORD_MIN_LENGTH} karakter`}
                      />
                      <RequirementItem
                        met={req.hasNumber}
                        label="Minimal 1 angka"
                      />
                      <RequirementItem
                        met={req.hasUpper}
                        label="Minimal 1 huruf besar"
                      />
                      <RequirementItem
                        met={req.hasSymbol}
                        label="Minimal 1 simbol (!@#$%...)"
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">
                    Konfirmasi password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Ulangi password baru"
                    disabled={loading}
                  />

                  {confirmFilled && (
                    <div className="mt-2 space-y-1.5 rounded-md border bg-muted/30 p-3">
                      <RequirementItem
                        met={passwordMatch}
                        label={
                          passwordMatch
                            ? "Password cocok"
                            : "Password tidak cocok"
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              {newPassword.length > 0 && !passwordAllValid && (
                <p className="text-xs text-muted-foreground">
                  Semua persyaratan harus terpenuhi sebelum menyimpan.
                </p>
              )}
            </div>

            {/* ---------- Feedback ---------- */}
            {error && (
              <div
                role="alert"
                className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                role="status"
                className="rounded-md border border-green-500/20 bg-green-500/10 px-3 py-2.5 text-sm text-green-700 dark:text-green-400"
              >
                {success}
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
              Simpan Perubahan
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}