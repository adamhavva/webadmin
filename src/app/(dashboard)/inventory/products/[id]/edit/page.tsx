"use client"

import * as React from "react"

import {
  ArrowLeft,
  Check,
  Loader2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
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

type ProductDetail = {
  id: string
  name: string
  sellingPrice: string
  isActive: boolean
}

type ProductResponse = {
  success: boolean
  data?: ProductDetail
  message?: string
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{
    id: string
  }>
}) {
  const [productId, setProductId] =
    React.useState("")

  const [name, setName] =
    React.useState("")

  const [sellingPrice, setSellingPrice] =
    React.useState("")

  const [isActive, setIsActive] =
    React.useState(true)

  const [isLoading, setIsLoading] =
    React.useState(true)

  const [isSubmitting, setIsSubmitting] =
    React.useState(false)

  const [error, setError] =
    React.useState<string | null>(null)

  const loadProduct =
    React.useCallback(
      async () => {
        try {
          setIsLoading(true)
          setError(null)

          const { id } =
            await params

          setProductId(id)

          const response =
            await fetch(
              `/api/inventory/products/${encodeURIComponent(
                id,
              )}`,
              {
                method: "GET",
                headers: {
                  Accept:
                    "application/json",
                },
                cache: "no-store",
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
                "Gagal mengambil data produk.",
            )
          }

          if (!result.data) {
            throw new Error(
              "Data produk tidak ditemukan.",
            )
          }

          setName(
            result.data.name,
          )

          setSellingPrice(
            result.data.sellingPrice,
          )

          setIsActive(
            result.data.isActive,
          )
        } catch (error) {
          console.error(
            "[EditProductPage] load:",
            error,
          )

          setError(
            error instanceof Error
              ? error.message
              : "Gagal mengambil data produk.",
          )
        } finally {
          setIsLoading(false)
        }
      },
      [params],
    )

  React.useEffect(() => {
    void loadProduct()
  }, [loadProduct])

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
          `/api/inventory/products/${encodeURIComponent(
            productId,
          )}`,
          {
            method: "PATCH",
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
            "Gagal memperbarui produk.",
        )
      }

      window.location.href =
        `/inventory/products/${encodeURIComponent(
          productId,
        )}`
    } catch (error) {
      console.error(
        "[EditProductPage] submit:",
        error,
      )

      setError(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui produk.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />

        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="h-10 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded bg-muted" />
            <div className="h-16 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !name) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center text-center">
        <h3 className="text-sm font-semibold">
          Gagal memuat produk
        </h3>

        <p className="mt-1 text-sm text-muted-foreground">
          {error}
        </p>

        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => {
            void loadProduct()
          }}
        >
          Coba Lagi
        </Button>
      </div>
    )
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
              `/inventory/products/${encodeURIComponent(
                productId,
              )}`
          }}
        >
          <ArrowLeft className="size-4" />
        </Button>

        <div>
          <p className="text-sm text-muted-foreground">
            Persediaan / Produk
          </p>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Edit Produk
            </h1>

            <Badge
              variant={
                isActive
                  ? "default"
                  : "secondary"
              }
            >
              {isActive
                ? "Aktif"
                : "Tidak Aktif"}
            </Badge>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Perbarui informasi master produk.
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
                disabled={isSubmitting}
              />

              <p className="text-xs text-muted-foreground">
                Harga jual tidak sama dengan HPP.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">
                  Produk Aktif
                </p>

                <p className="text-xs text-muted-foreground">
                  Produk tidak aktif tidak dapat dipilih
                  untuk Recipe baru.
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
                `/inventory/products/${encodeURIComponent(
                  productId,
                )}`
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
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}