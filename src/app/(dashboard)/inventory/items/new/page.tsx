"use client"

import * as React from "react"

import {
  ArrowLeft,
  Check,
  ChevronRight,
  Info,
  Package,
  PackageCheck,
  Sparkles,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

type InventoryItemType =
  | "SEMI_FINISHED"
  | "DIRECT_USE"

type InventoryUnit =
  | "ML"
  | "PCS"

type FormData = {
  name: string
  type: InventoryItemType | ""
  unit: InventoryUnit | ""
  isActive: boolean
}

type InventoryItemResponse = {
  success: boolean
  data?: {
    id: string
    name: string
    type: InventoryItemType
    unit: InventoryUnit
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
  message?: string
}

const typeOptions: {
  value: InventoryItemType
  label: string
  description: string
  icon: typeof Package
}[] = [
  {
    value: "SEMI_FINISHED",
    label: "Semi Finished",
    description: "Bahan hasil proses produksi.",
    icon: PackageCheck,
  },
  {
    value: "DIRECT_USE",
    label: "Direct Use",
    description: "Bahan yang digunakan langsung.",
    icon: Sparkles,
  },
]

const unitOptions: {
  value: InventoryUnit
  label: string
  description: string
}[] = [
  {
    value: "ML",
    label: "ML",
    description: "Untuk bahan berbentuk cair.",
  },
  {
    value: "PCS",
    label: "PCS",
    description: "Untuk bahan yang dihitung per unit.",
  },
]

export default function NewInventoryItemPage() {
  const [form, setForm] = React.useState<FormData>({
    name: "",
    type: "",
    unit: "",
    isActive: true,
  })

  const [errors, setErrors] = React.useState<{
    name?: string
    type?: string
    unit?: string
  }>({})

  const [submitError, setSubmitError] =
    React.useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] =
    React.useState(false)

  function updateForm<K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }))

    setSubmitError(null)
  }

  function validate() {
    const nextErrors: typeof errors = {}

    if (!form.name.trim()) {
      nextErrors.name = "Nama bahan wajib diisi."
    }

    if (!form.type) {
      nextErrors.type = "Pilih tipe bahan."
    }

    if (!form.unit) {
      nextErrors.unit = "Pilih unit bahan."
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setSubmitError(null)

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(
        "/api/inventory/items",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            type: form.type,
            unit: form.unit,
            isActive: form.isActive,
          }),
        },
      )

      const result =
        (await response.json()) as InventoryItemResponse

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ??
            "Gagal menyimpan bahan.",
        )
      }

      window.location.href = "/inventory/items"
    } catch (error) {
      console.error(
        "[NewInventoryItemPage] create item:",
        error,
      )

      setSubmitError(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan bahan.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <span>Persediaan</span>

        <ChevronRight className="size-4" />

        <span>Bahan</span>

        <ChevronRight className="size-4" />

        <span className="text-foreground">
          Tambah Bahan
        </span>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Kembali"
              className="shrink-0 transition-all duration-200 hover:-translate-x-0.5"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="size-4" />
            </Button>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Tambah Bahan
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Tambahkan bahan baru ke master inventory ASCEND.
              </p>
            </div>
          </div>
        </div>

        <Badge
          variant="outline"
          className="w-fit gap-1.5 px-3 py-1.5"
        >
          <Package className="size-3.5" />
          Inventory Item
        </Badge>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <Card>
          <CardHeader>
            <CardTitle>Informasi Bahan</CardTitle>

            <CardDescription>
              Tentukan identitas dasar bahan dan bagaimana bahan
              tersebut digunakan dalam operasional.
            </CardDescription>
          </CardHeader>

          <Separator />

          <CardContent className="space-y-8 p-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nama Bahan
              </Label>

              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={(event) =>
                  updateForm("name", event.target.value)
                }
                placeholder="Contoh: Espresso"
                autoComplete="off"
                aria-invalid={Boolean(errors.name)}
                disabled={isSubmitting}
                className="transition-all duration-200"
              />

              {errors.name ? (
                <p className="text-sm text-destructive">
                  {errors.name}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Gunakan nama bahan yang jelas dan mudah dikenali.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label>Tipe Bahan</Label>

                <p className="mt-1 text-xs text-muted-foreground">
                  Tentukan bagaimana bahan masuk ke dalam
                  operasional inventory.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {typeOptions.map((option) => {
                  const Icon = option.icon
                  const selected = form.type === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() =>
                        updateForm("type", option.value)
                      }
                      className={[
                        "group relative flex min-h-28 flex-col items-start rounded-xl border p-4 text-left transition-all duration-200",
                        "hover:-translate-y-0.5 hover:shadow-sm",
                        selected
                          ? "border-foreground bg-muted/50 shadow-sm"
                          : "hover:border-foreground/30",
                      ].join(" ")}
                    >
                      <div className="flex w-full items-start justify-between">
                        <div
                          className={[
                            "flex size-9 items-center justify-center rounded-lg border transition-transform duration-200",
                            selected
                              ? "bg-background"
                              : "bg-muted/50",
                          ].join(" ")}
                        >
                          <Icon className="size-4" />
                        </div>

                        {selected ? (
                          <div className="flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                            <Check className="size-3" />
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-3">
                        <p className="text-sm font-medium">
                          {option.label}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {errors.type ? (
                <p className="text-sm text-destructive">
                  {errors.type}
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <div>
                <Label>Unit</Label>

                <p className="mt-1 text-xs text-muted-foreground">
                  Unit dasar yang digunakan untuk quantity dan
                  perhitungan inventory.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {unitOptions.map((option) => {
                  const selected = form.unit === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() =>
                        updateForm("unit", option.value)
                      }
                      className={[
                        "group relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200",
                        "hover:-translate-y-0.5 hover:shadow-sm",
                        selected
                          ? "border-foreground bg-muted/50 shadow-sm"
                          : "hover:border-foreground/30",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "flex size-10 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-semibold transition-transform duration-200",
                          selected
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        {option.label}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {option.label}
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      </div>

                      {selected ? (
                        <Check className="ml-auto size-4 shrink-0" />
                      ) : null}
                    </button>
                  )
                })}
              </div>

              {errors.unit ? (
                <p className="text-sm text-destructive">
                  {errors.unit}
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background">
                  <Check className="size-4" />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Status Bahan
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Bahan baru akan dibuat aktif sehingga dapat
                    digunakan dalam operasional.
                  </p>
                </div>

                <Badge variant="outline">
                  Aktif
                </Badge>
              </div>
            </div>

            {submitError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive">
                  Gagal menyimpan bahan
                </p>

                <p className="mt-1 text-sm text-destructive/80">
                  {submitError}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6 p-6">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">
                Preview
              </CardTitle>

              <CardDescription>
                Tampilan singkat data bahan yang akan dibuat.
              </CardDescription>
            </CardHeader>

            <Separator />

            <CardContent className="space-y-5 p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl border bg-muted/40">
                  <Package className="size-5 text-muted-foreground" />
                </div>

                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {form.name.trim() || "Nama bahan"}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Inventory Item
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">
                    Tipe
                  </span>

                  <span className="text-sm font-medium">
                    {form.type
                      ? getTypeLabel(form.type)
                      : "Belum dipilih"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">
                    Unit
                  </span>

                  <span className="font-mono text-sm font-medium">
                    {form.unit || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">
                    Status
                  </span>

                  <Badge variant="outline">
                    Aktif
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="flex gap-3 p-5">
              <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

              <p className="text-xs leading-5 text-muted-foreground">
                Harga, batch, stok, dan biaya tidak diatur di
                halaman ini. Data tersebut dikelola pada proses
                inventory berikutnya.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col-reverse gap-3 lg:col-span-2 lg:flex-row lg:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => window.history.back()}
            className="transition-all duration-200"
          >
            Batal
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-36 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            {isSubmitting ? (
              "Menyimpan..."
            ) : (
              <>
                <Check className="mr-2 size-4" />
                Simpan Bahan
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

function getTypeLabel(type: InventoryItemType) {
  if (type === "SEMI_FINISHED") {
    return "Semi Finished"
  }

  return "Direct Use"
}