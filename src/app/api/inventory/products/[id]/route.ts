import { NextRequest, NextResponse } from "next/server"

import { Prisma } from "../../../../../../prisma/generated/client"

import { prisma } from "@/lib/db"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function serializeProductDetail(product: {
  id: string
  name: string
  sellingPrice: Prisma.Decimal
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  recipes: Array<{
    id: string
    version: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    items: Array<{
      id: string
      quantity: Prisma.Decimal
      inventoryItem: {
        id: string
        name: string
        type: string
        unit: string
        isActive: boolean
      }
    }>
  }>
}) {
  return {
    id: product.id,
    name: product.name,
    sellingPrice:
      product.sellingPrice.toString(),
    isActive: product.isActive,
    createdAt:
      product.createdAt.toISOString(),
    updatedAt:
      product.updatedAt.toISOString(),
    recipes:
      product.recipes.map(
        (recipe) => ({
          id: recipe.id,
          version: recipe.version,
          isActive: recipe.isActive,
          createdAt:
            recipe.createdAt.toISOString(),
          updatedAt:
            recipe.updatedAt.toISOString(),
          items:
            recipe.items.map(
              (item) => ({
                id: item.id,
                quantity:
                  item.quantity.toString(),
                inventoryItem:
                  item.inventoryItem,
              }),
            ),
        }),
      ),
  }
}

/*
  Mengambil detail Product.
*/
export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } =
      await context.params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product ID wajib diisi.",
        },
        {
          status: 400,
        },
      )
    }

    const product =
      await prisma.product.findUnique(
        {
          where: {
            id,
          },
          include: {
            recipes: {
              orderBy: {
                version: "desc",
              },
              include: {
                items: {
                  orderBy: {
                    inventoryItem: {
                      name: "asc",
                    },
                  },
                  include: {
                    inventoryItem: {
                      select: {
                        id: true,
                        name: true,
                        type: true,
                        unit: true,
                        isActive: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      )

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Produk tidak ditemukan.",
        },
        {
          status: 404,
        },
      )
    }

    return NextResponse.json({
      success: true,
      data: serializeProductDetail(
        product,
      ),
    })
  } catch (error) {
    console.error(
      "[ProductsAPI] GET detail:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal mengambil detail produk.",
      },
      {
        status: 500,
      },
    )
  }
}

/*
  Mengubah Product.

  Tidak mengubah Recipe.
*/
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } =
      await context.params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product ID wajib diisi.",
        },
        {
          status: 400,
        },
      )
    }

    const existing =
      await prisma.product.findUnique(
        {
          where: {
            id,
          },
          select: {
            id: true,
          },
        },
      )

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Produk tidak ditemukan.",
        },
        {
          status: 404,
        },
      )
    }

    const body =
      (await request.json()) as {
        name?: unknown
        sellingPrice?: unknown
        isActive?: unknown
      }

    const data: {
      name?: string
      sellingPrice?: Prisma.Decimal
      isActive?: boolean
    } = {}

    if (body.name !== undefined) {
      if (
        typeof body.name !==
        "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Nama produk tidak valid.",
          },
          {
            status: 400,
          },
        )
      }

      const name =
        body.name.trim()

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Nama produk wajib diisi.",
          },
          {
            status: 400,
          },
        )
      }

      if (name.length > 150) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Nama produk maksimal 150 karakter.",
          },
          {
            status: 400,
          },
        )
      }

      data.name = name
    }

    if (
      body.sellingPrice !==
      undefined
    ) {
      const raw =
        body.sellingPrice

      const sellingPrice =
        typeof raw === "number"
          ? raw
          : typeof raw === "string"
            ? Number(
                raw.replace(
                  /,/g,
                  "",
                ),
              )
            : NaN

      if (
        !Number.isFinite(
          sellingPrice,
        ) ||
        sellingPrice <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Harga jual harus lebih besar dari 0.",
          },
          {
            status: 400,
          },
        )
      }

      data.sellingPrice =
        new Prisma.Decimal(
          sellingPrice,
        )
    }

    if (
      body.isActive !==
      undefined
    ) {
      if (
        typeof body.isActive !==
        "boolean"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Status produk tidak valid.",
          },
          {
            status: 400,
          },
        )
      }

      data.isActive =
        body.isActive
    }

    if (
      Object.keys(data).length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tidak ada data yang diubah.",
        },
        {
          status: 400,
        },
      )
    }

    const product =
      await prisma.product.update({
        where: {
          id,
        },
        data,
      })

    return NextResponse.json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        sellingPrice:
          product.sellingPrice.toString(),
        isActive:
          product.isActive,
        createdAt:
          product.createdAt.toISOString(),
        updatedAt:
          product.updatedAt.toISOString(),
      },
      message:
        "Produk berhasil diperbarui.",
    })
  } catch (error) {
    console.error(
      "[ProductsAPI] PATCH:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal memperbarui produk.",
      },
      {
        status: 500,
      },
    )
  }
}

/*
  Product tidak di-hard-delete.

  DELETE digunakan untuk menonaktifkan Product.
*/
export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } =
      await context.params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product ID wajib diisi.",
        },
        {
          status: 400,
        },
      )
    }

    const existing =
      await prisma.product.findUnique(
        {
          where: {
            id,
          },
          select: {
            id: true,
            isActive: true,
          },
        },
      )

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Produk tidak ditemukan.",
        },
        {
          status: 404,
        },
      )
    }

    if (!existing.isActive) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Produk sudah tidak aktif.",
        },
        {
          status: 409,
        },
      )
    }

    const product =
      await prisma.product.update({
        where: {
          id,
        },
        data: {
          isActive: false,
        },
      })

    return NextResponse.json({
      success: true,
      data: {
        id: product.id,
        isActive:
          product.isActive,
      },
      message:
        "Produk berhasil dinonaktifkan.",
    })
  } catch (error) {
    console.error(
      "[ProductsAPI] DELETE:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal menonaktifkan produk.",
      },
      {
        status: 500,
      },
    )
  }
}