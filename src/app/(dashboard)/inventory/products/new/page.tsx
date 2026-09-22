"use client"

import * as React from "react"

import {
  ArrowLeft,
  Check,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

type ProductResponse = {
  success: boolean
  data?: {
    id: string
    name: string
    sellingPrice: string
    isActive: boolean
  }
  message?: string
}

export default function NewProductPage() {
  const [name, setName] =
    React.useState("")

  const [sellingPrice, setSellingPrice] =
    React.useState("")

  const [isActive, setIsActive] =
    React.useState(true)

  const [error, setError] =
    React.useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] =
    React.useState(false)

  function validate() {
    const trimmedName =
      name.trim()

    if (!trimmedName) {
      return "Nama produk wajib diisi."
    }

    if (trimmedName.length > 150) {
      return "Nama produk maksimal 150 karakter."
    }

    const price = Number(
      sellingPrice.replace(
        /,/g,
        "",
      ),
    )

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return "Harga jual harus lebih besar dari 0."
    }

    return null
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const validationError =
      validate()

    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const response =
        await fetch(
          "/api/inventory/products",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body: JSON.stringify({
              name: name.trim(),
              sellingPrice:
                Number(
                  sellingPrice.replace(
                    /,/g,
                    "",
                  ),
                ),
              isActive,
            }),
          },
        )

      const result =
        (await response.json()) as ProductResponse

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Gagal membuat produk.",
        )
      }

      if (!result.data?.id) {
        throw new Error(
          "Produk berhasil dibuat tetapi ID tidak ditemukan.",
        )
      }

      window.location.href =
        `/inventory/products/${encodeURIComponent(
          result.data.id,
        )}`
    } catch (error) {
      console.error(
        "[NewProductPage] submit:",
        error,
      )

      setError(
        error instanceof Error
          ? error.message
          : "Gagal membuat produk.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            window.location.href =
              "/inventory/products"
          }}
        >
          <ArrowLeft className="size-4" />
        </Button>

        <div>
          <p className="text-sm text-muted-foreground">
            Persediaan / Produk
          </p>

          <h1 className="text-2xl font-semibold tracking-tight">
            Tambah Produk
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Buat master produk yang akan dijual kepada
            customer.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>
              Informasi Produk
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nama Produk
              </Label>

              <Input
                id="name"
                value={name}
                onChange={(event) => {
                  setName(
                    event.target.value,
                  )
                }}
                placeholder="Contoh: Kopi Susu"
                maxLength={150}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellingPrice">
                Harga Jual
              </Label>

              <Input
                id="sellingPrice"
                type="number"
                min="1"
                step="0.01"
                value={sellingPrice}
                onChange={(event) => {
                  setSellingPrice(
                    event.target.value,
                  )
                }}
                placeholder="Contoh: 25000"
                disabled={isSubmitting}
              />

              <p className="text-xs text-muted-foreground">
                Harga jual terpisah dari HPP.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">
                  Produk Aktif
                </p>

                <p className="text-xs text-muted-foreground">
                  Produk aktif dapat digunakan dalam
                  Recipe.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={
                  isActive
                }
                disabled={
                  isSubmitting
                }
                onClick={() => {
                  setIsActive(
                    (current) =>
                      !current,
                  )
                }}
                className={[
                  "relative h-6 w-11 rounded-full transition-colors",
                  isActive
                    ? "bg-primary"
                    : "bg-muted",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-1 size-4 rounded-full bg-white transition-transform",
                    isActive
                      ? "left-6"
                      : "left-1",
                  ].join(" ")}
                />
              </button>
            </div>

            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => {
              window.location.href =
                "/inventory/products"
            }}
          >
            Batal
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Check className="mr-2 size-4" />
                Simpan Produk
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}