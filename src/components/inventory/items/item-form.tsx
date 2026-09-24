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

type Unit = "ML" | "PCS" | "GR";

export type ItemFormData = {
  id?: string;
  name: string;
  unit: Unit;
  isActive?: boolean;
};

type Props = {
  mode: "create" | "edit";
  itemId?: string;
  initial?: ItemFormData;
};

const UNIT_LABEL: Record<Unit, string> = {
  ML: "Mililiter (ML)",
  PCS: "Piece (PCS)",
  GR: "Gram (Gr)"
};

export function ItemForm({ mode, itemId, initial }: Props) {
  const router = useRouter();

  const [name, setName] = React.useState(initial?.name ?? "");
  const [unit, setUnit] = React.useState<Unit>(initial?.unit ?? "ML");
  const [isActive, setIsActive] = React.useState(initial?.isActive ?? true);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Nama bahan wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        name: trimmedName,
        unit,
      };

      if (mode === "edit") {
        payload.isActive = isActive;
      }

      const url =
        mode === "create"
          ? "/api/inventory/items"
          : `/api/inventory/items/${itemId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || json.success === false) {
        setError(json?.error?.message ?? "Gagal menyimpan bahan");
        return;
      }

      router.push("/inventory/items");
      router.refresh();
    } catch {
      setError("Gagal menyimpan bahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Tambah Bahan" : "Edit Bahan"}
          </CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Tambahkan bahan baku baru ke sistem."
              : "Perbarui informasi bahan baku."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="item-name">
                Nama Bahan <span className="text-destructive">*</span>
              </Label>
              <Input
                id="item-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Milk, Coffee Bean, Cup"
                required
                disabled={loading}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Gunakan nama yang singkat dan jelas.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="item-unit">
                Satuan <span className="text-destructive">*</span>
              </Label>
              <select
                id="item-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                disabled={loading}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                {(["ML", "PCS", "GR"] as Unit[]).map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABEL[u]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Pilih satuan yang sesuai untuk bahan ini.
              </p>
            </div>
          </div>

          {mode === "edit" && (
            <div className="grid gap-2">
              <Label htmlFor="item-active">Status</Label>
              <select
                id="item-active"
                value={isActive ? "active" : "inactive"}
                onChange={(e) => setIsActive(e.target.value === "active")}
                disabled={loading}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Bahan nonaktif tidak dapat dipakai di resep baru.
              </p>
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
            {mode === "create" ? "Tambah Bahan" : "Simpan Perubahan"}
          </Button>
        </div>
      </Card>
    </form>
  );
}