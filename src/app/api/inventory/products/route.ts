import { NextRequest, NextResponse } from "next/server"

import { Prisma } from "../../../../../prisma/generated/client"

import { prisma } from "@/lib/db"
import { is } from "date-fns/locale"

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 100

function parsePositiveInteger(
  value: string | null,
  fallback: number,
) {
  if (!value) {
    return fallback
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback
  }

  return parsed
}

function parseBoolean(
  value: string | null,
): boolean | undefined {
  if (value === null) {
    return undefined
  }

  if (value === "true") {
    return true
  }

  if (value === "false") {
    return false
  }

  return undefined
}

function serializeProduct(product: {
  id: string
  name: string
  sellingPrice: Prisma.Decimal
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  recipes?: Array<{
    version: number
    isActive: boolean
    _count: {
      items: number
    }
  }>
}) {
  const activeRecipe =
    product.recipes?.find(
      (recipe) => recipe.isActive,
    ) ?? null

  return {
    id: product.id,
    name: product.name,
    sellingPrice:
      product.sellingPrice.toString(),
    isActive: product.isActive,
    activeRecipe: activeRecipe
      ? {
          version: activeRecipe.version,
          ingredientCount:
            activeRecipe._count.items,
        }
      : null,
    createdAt:
      product.createdAt.toISOString(),
    updatedAt:
      product.updatedAt.toISOString(),
  }
}

/*
  Mengambil daftar Product.

  Filter:
  - search
  - isActive
  - page
  - limit
*/
export async function GET(
  request: NextRequest,
) {
  try {
    const searchParams =
      request.nextUrl.searchParams

    const search =
      searchParams.get("search")?.trim() ?? ""

    const requestedPage =
      parsePositiveInteger(
        searchParams.get("page"),
        DEFAULT_PAGE,
      )

    const requestedLimit =
      parsePositiveInteger(
        searchParams.get("limit"),
        DEFAULT_LIMIT,
      )

    const limit = Math.min(
      requestedLimit,
      MAX_LIMIT,
    )

    const isActive =
      parseBoolean(
        searchParams.get("isActive"),
      )

    const where = {
      ...(search
        ? {
            name: {
              contains: search,
              mode: "insensitive" as const,
            },
            
          }
        : {}),
      ...(isActive !== undefined
        ? {
            isActive,
          }
        : {}),
    }

    const total =
      await prisma.product.count({
        where,
      })

    const totalPages = Math.max(
      1,
      Math.ceil(total / limit),
    )

    const page = Math.min(
      requestedPage,
      totalPages,
    )

    const skip =
      (page - 1) * limit

    const [products, activeCount, inactiveCount] =
      await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: [
            {
              createdAt: "desc"
            },
          ],
          skip,
          take: limit,
          include: {
            recipes: {
              where: {
                isActive: true,
              },
              orderBy: {
                version: "desc",
              },
              take: 1,
              select: {
                version: true,
                isActive: true,
                _count: {
                  select: {
                    items: true,
                  },
                },
              },
            },
          },
        }),

        prisma.product.count({
          where: {
            isActive: true,
          },
        }),

        prisma.product.count({
          where: {
            isActive: false,
          },
        }),
      ])

    return NextResponse.json({
      success: true,
      data: products.map(
        serializeProduct,
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      summary: {
        totalProducts:
          activeCount + inactiveCount,
        activeProducts: activeCount,
        inactiveProducts:
          inactiveCount,
      },
    })
  } catch (error) {
    console.error(
      "[ProductsAPI] GET:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal mengambil data produk.",
      },
      {
        status: 500,
      },
    )
  }
}

/*
  Membuat Product baru.

  Product hanya:
  - name
  - sellingPrice
  - isActive

  Recipe dibuat pada modul Recipe.
*/
export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as {
        name?: unknown
        sellingPrice?: unknown
        isActive?: unknown
      }

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : ""

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

    const rawSellingPrice =
      body.sellingPrice

    const sellingPrice =
      typeof rawSellingPrice === "number"
        ? rawSellingPrice
        : typeof rawSellingPrice ===
            "string"
          ? Number(
              rawSellingPrice.replace(
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

    const isActive =
      typeof body.isActive ===
      "boolean"
        ? body.isActive
        : true

    const product =
      await prisma.product.create({
        data: {
          name,
          sellingPrice:
            new Prisma.Decimal(
              sellingPrice,
            ),
          isActive,
        },
      })

    return NextResponse.json(
      {
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
          "Produk berhasil dibuat.",
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "[ProductsAPI] POST:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal membuat produk.",
      },
      {
        status: 500,
      },
    )
  }
}