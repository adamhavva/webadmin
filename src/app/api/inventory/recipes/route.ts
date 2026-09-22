import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/db"

const VALID_STATUS = [
  "ACTIVE",
  "INACTIVE",
] as const

type RecipeStatus =
  (typeof VALID_STATUS)[number]

type RecipeInputItem = {
  inventoryItemId?: unknown
  quantity?: unknown
}

function isValidStatus(
  value: string | null,
): value is RecipeStatus {
  return (
    value !== null &&
    VALID_STATUS.includes(
      value as RecipeStatus,
    )
  )
}

function isPositiveQuantity(
  value: unknown,
): value is number {
  if (
    typeof value === "number"
  ) {
    return (
      Number.isFinite(value) &&
      value > 0
    )
  }

  if (
    typeof value === "string"
  ) {
    const parsed = Number(value)

    return (
      Number.isFinite(parsed) &&
      parsed > 0
    )
  }

  return false
}

function normalizeQuantity(
  value: unknown,
): string | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return String(value)
  }

  if (
    typeof value === "string" &&
    value.trim().length > 0
  ) {
    const parsed = Number(value)

    if (
      Number.isFinite(parsed) &&
      parsed > 0
    ) {
      return value.trim()
    }
  }

  return null
}

function serializeRecipe(
  recipe: {
    id: string
    productId: string
    version: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    product: {
      id: string
      name: string
    }
    items: Array<{
      id: string
      inventoryItemId: string
      quantity: unknown
      inventoryItem: {
        id: string
        name: string
        type: string
        unit: string
        isActive: boolean
      }
    }>
  },
) {
  return {
    id: recipe.id,
    productId: recipe.productId,
    productName: recipe.product.name,
    version: recipe.version,
    isActive: recipe.isActive,
    ingredientCount:
      recipe.items.length,
    createdAt:
      recipe.createdAt.toISOString(),
    updatedAt:
      recipe.updatedAt.toISOString(),
    items: recipe.items.map(
      (item) => ({
        id: item.id,
        inventoryItemId:
          item.inventoryItemId,
        inventoryItemName:
          item.inventoryItem.name,
        inventoryItemType:
          item.inventoryItem.type,
        unit: item.inventoryItem.unit,
        quantity:
          String(item.quantity),
        inventoryItemIsActive:
          item.inventoryItem.isActive,
      }),
    ),
  }
}

/*
  GET

  Mengambil daftar recipe.

  Parameter:
  - search
  - status
  - page
  - limit

  Setiap version recipe tetap dapat ditampilkan.
  Sorting berdasarkan product lalu version
  terbaru.
*/
export async function GET(
  request: NextRequest,
) {
  try {
    const searchParams =
      request.nextUrl.searchParams

    const options =
      searchParams.get("options")

    if (options === "true") {
      const [
        products,
        inventoryItems,
      ] = await Promise.all([
        prisma.product.findMany({
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            name: "asc",
          },
        }),

        prisma.inventoryItem.findMany({
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            type: true,
            unit: true,
            isActive: true,
          },
          orderBy: {
            name: "asc",
          },
        }),
      ])

      return NextResponse.json(
        {
          success: true,
          data: {
            products,
            inventoryItems,
          },
        },
        {
          status: 200,
        },
      )
    }

    const search =
      searchParams
        .get("search")
        ?.trim() ?? ""

    const pageParam =
      searchParams.get("page")

    const limitParam =
      searchParams.get("limit")

    const statusParam =
      searchParams.get("status")

    const page =
      Number(pageParam ?? "1")

    const limit =
      Number(limitParam ?? "10")

    if (
      !Number.isInteger(page) ||
      page < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Parameter page tidak valid.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Parameter limit harus antara 1 sampai 100.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      statusParam !== null &&
      !isValidStatus(statusParam)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Parameter status tidak valid.",
        },
        {
          status: 400,
        },
      )
    }

    const where = {
      ...(statusParam
        ? {
            isActive:
              statusParam === "ACTIVE",
          }
        : {}),

      ...(search
        ? {
            product: {
              name: {
                contains: search,
                mode:
                  "insensitive" as const,
              },
            },
          }
        : {}),
    }

    const skip =
      (page - 1) * limit

    const [
      recipes,
      total,
      totalRecipes,
      activeRecipes,
      inactiveRecipes,
    ] = await Promise.all([
      prisma.productRecipe.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
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
        orderBy: [
          {
            product: {
              name: "asc",
            },
          },
          {
            version: "desc",
          },
        ],
        skip,
        take: limit,
      }),

      prisma.productRecipe.count({
        where,
      }),

      prisma.productRecipe.count(),

      prisma.productRecipe.count({
        where: {
          isActive: true,
        },
      }),

      prisma.productRecipe.count({
        where: {
          isActive: false,
        },
      }),
    ])

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          total / limit,
        ),
      )

    return NextResponse.json(
      {
        success: true,
        data: recipes.map(
          serializeRecipe,
        ),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
        summary: {
          totalRecipes,
          activeRecipes,
          inactiveRecipes,
        },
      },
      {
        status: 200,
      },
    )
  } catch (error) {
    console.error(
      "[RecipesAPI] GET:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal mengambil data resep.",
      },
      {
        status: 500,
      },
    )
  }
}

/*
  POST

  Membuat recipe version baru.

  Request:
  {
    productId: string,
    items: [
      {
        inventoryItemId: string,
        quantity: number | string
      }
    ]
  }

  Version berikutnya dihitung oleh backend.
*/
export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as {
        productId?: unknown
        items?: unknown
      }

    if (
      typeof body.productId !==
        "string" ||
      body.productId.trim()
        .length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Produk wajib dipilih.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Minimal satu bahan harus ditambahkan.",
        },
        {
          status: 400,
        },
      )
    }

    const productId =
      body.productId.trim()

    const rawItems =
      body.items as RecipeInputItem[]

    const inventoryItemIds =
      new Set<string>()

    for (
      let index = 0;
      index < rawItems.length;
      index += 1
    ) {
      const item =
        rawItems[index]

      if (
        typeof item
          ?.inventoryItemId !==
          "string" ||
        item.inventoryItemId.trim()
          .length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Bahan pada baris ${index + 1} wajib dipilih.`,
          },
          {
            status: 400,
          },
        )
      }

      const inventoryItemId =
        item.inventoryItemId.trim()

      if (
        inventoryItemIds.has(
          inventoryItemId,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Bahan yang sama tidak boleh digunakan lebih dari satu kali dalam satu resep.",
          },
          {
            status: 400,
          },
        )
      }

      inventoryItemIds.add(
        inventoryItemId,
      )

      if (
        !isPositiveQuantity(
          item.quantity,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Quantity bahan pada baris ${index + 1} harus lebih dari 0.`,
          },
          {
            status: 400,
          },
        )
      }
    }

    const normalizedItems =
      rawItems.map(
        (item) => ({
          inventoryItemId:
            String(
              item.inventoryItemId,
            ).trim(),
          quantity:
            normalizeQuantity(
              item.quantity,
            ) as string,
        }),
      )

    const [
      product,
      inventoryItems,
    ] = await Promise.all([
      prisma.product.findUnique({
        where: {
          id: productId,
        },
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      }),

      prisma.inventoryItem.findMany({
        where: {
          id: {
            in: Array.from(
              inventoryItemIds,
            ),
          },
        },
        select: {
          id: true,
          name: true,
          unit: true,
          isActive: true,
        },
      }),
    ])

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

    if (!product.isActive) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Produk tidak aktif tidak dapat digunakan untuk resep.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      inventoryItems.length !==
      inventoryItemIds.size
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Salah satu bahan tidak ditemukan.",
        },
        {
          status: 404,
        },
      )
    }

    const inventoryMap =
      new Map(
        inventoryItems.map(
          (item) => [
            item.id,
            item,
          ],
        ),
      )

    for (
      const item of normalizedItems
    ) {
      const inventoryItem =
        inventoryMap.get(
          item.inventoryItemId,
        )

      if (
        !inventoryItem
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Bahan tidak ditemukan.",
          },
          {
            status: 404,
          },
        )
      }

      if (
        !inventoryItem.isActive
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Bahan "${inventoryItem.name}" tidak aktif.`,
          },
          {
            status: 400,
          },
        )
      }

      if (
        inventoryItem.unit ===
          "PCS" &&
        !Number.isInteger(
          Number(item.quantity),
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Quantity bahan "${inventoryItem.name}" untuk unit PCS harus berupa bilangan bulat.`,
          },
          {
            status: 400,
          },
        )
      }
    }

    const recipe =
      await prisma.$transaction(
        async (tx) => {
          const latest =
            await tx.productRecipe.findFirst(
              {
                where: {
                  productId,
                },
                orderBy: {
                  version: "desc",
                },
                select: {
                  version: true,
                },
              },
            )

          const nextVersion =
            (latest?.version ?? 0) +
            1

          await tx.productRecipe.updateMany(
            {
              where: {
                productId,
                isActive: true,
              },
              data: {
                isActive: false,
              },
            },
          )

          return tx.productRecipe.create(
            {
              data: {
                productId,
                version:
                  nextVersion,
                isActive: true,
                items: {
                  create:
                    normalizedItems.map(
                      (item) => ({
                        inventoryItemId:
                          item.inventoryItemId,
                        quantity:
                          item.quantity,
                      }),
                    ),
                },
              },
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                items: {
                  include: {
                    inventoryItem: {
                      select: {
                        id: true,
                        name: true,
                        type: true,
                        unit: true,
                        isActive:
                          true,
                      },
                    },
                  },
                },
              },
            },
          )
        },
      )

    return NextResponse.json(
      {
        success: true,
        data:
          serializeRecipe(
            recipe,
          ),
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "[RecipesAPI] POST:",
      error,
    )

    if (
      typeof error ===
        "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Version resep mengalami konflik. Silakan coba lagi.",
        },
        {
          status: 409,
        },
      )
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal membuat resep.",
      },
      {
        status: 500,
      },
    )
  }
}