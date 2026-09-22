import {
  NextRequest,
  NextResponse,
} from "next/server"

import { prisma } from "@/lib/db"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type RecipeInputItem = {
  inventoryItemId?: unknown
  quantity?: unknown
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
    productName:
      recipe.product.name,
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

async function findRecipe(
  id: string,
) {
  return prisma.productRecipe.findUnique(
    {
      where: {
        id,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            isActive: true,
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
    },
  )
}

/*
  GET

  Detail recipe termasuk:
  - header
  - ingredients
  - version history
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
            "ID resep wajib diberikan.",
        },
        {
          status: 400,
        },
      )
    }

    const recipe =
      await findRecipe(id)

    if (!recipe) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Resep tidak ditemukan.",
        },
        {
          status: 404,
        },
      )
    }

    const history =
      await prisma.productRecipe.findMany(
        {
          where: {
            productId:
              recipe.productId,
          },
          select: {
            id: true,
            version: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                items: true,
              },
            },
          },
          orderBy: {
            version: "desc",
          },
        },
      )

    return NextResponse.json(
      {
        success: true,
        data: {
          recipe:
            serializeRecipe(
              recipe,
            ),
          history:
            history.map(
              (item) => ({
                id: item.id,
                version:
                  item.version,
                isActive:
                  item.isActive,
                ingredientCount:
                  item._count.items,
                createdAt:
                  item.createdAt.toISOString(),
                updatedAt:
                  item.updatedAt.toISOString(),
              }),
            ),
        },
      },
      {
        status: 200,
      },
    )
  } catch (error) {
    console.error(
      "[RecipesAPI] GET [id]:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal mengambil detail resep.",
      },
      {
        status: 500,
      },
    )
  }
}

/*
  PATCH

  Edit recipe dengan membuat version baru.
  Version lama tidak diubah/dihapus.
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
            "ID resep wajib diberikan.",
        },
        {
          status: 400,
        },
      )
    }

    const existingRecipe =
      await prisma.productRecipe.findUnique(
        {
          where: {
            id,
          },
          select: {
            id: true,
            productId: true,
            version: true,
            isActive: true,
            product: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
      )

    if (!existingRecipe) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Resep tidak ditemukan.",
        },
        {
          status: 404,
        },
      )
    }

    if (
      !existingRecipe.product.isActive
    ) {
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

    const body =
      (await request.json()) as {
        items?: unknown
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

    const inventoryItems =
      await prisma.inventoryItem.findMany(
        {
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
        },
      )

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
                  productId:
                    existingRecipe.productId,
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
                productId:
                  existingRecipe.productId,
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
                productId:
                  existingRecipe.productId,
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
        status: 200,
      },
    )
  } catch (error) {
    console.error(
      "[RecipesAPI] PATCH [id]:",
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
          "Gagal membuat versi resep baru.",
      },
      {
        status: 500,
      },
    )
  }
}

/*
  DELETE

  Tidak menghapus data.

  Jika recipe aktif:
  - nonaktifkan recipe tersebut
  - aktifkan version sebelumnya jika tersedia

  Jika recipe sudah inactive:
  - response 400
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
            "ID resep wajib diberikan.",
        },
        {
          status: 400,
        },
      )
    }

    const recipe =
      await prisma.productRecipe.findUnique(
        {
          where: {
            id,
          },
          select: {
            id: true,
            productId: true,
            version: true,
            isActive: true,
          },
        },
      )

    if (!recipe) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Resep tidak ditemukan.",
        },
        {
          status: 404,
        },
      )
    }

    if (!recipe.isActive) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Resep sudah tidak aktif.",
        },
        {
          status: 400,
        },
      )
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const previous =
            await tx.productRecipe.findFirst(
              {
                where: {
                  productId:
                    recipe.productId,
                  version: {
                    lt: recipe.version,
                  },
                },
                orderBy: {
                  version: "desc",
                },
                select: {
                  id: true,
                  version: true,
                  isActive: true,
                },
              },
            )

          await tx.productRecipe.update(
            {
              where: {
                id: recipe.id,
              },
              data: {
                isActive: false,
              },
            },
          )

          if (previous) {
            await tx.productRecipe.update(
              {
                where: {
                  id: previous.id,
                },
                data: {
                  isActive: true,
                },
              },
            )
          }

          return {
            deactivatedRecipeId:
              recipe.id,
            activatedRecipeId:
              previous?.id ?? null,
            activatedVersion:
              previous?.version ?? null,
          }
        },
      )

    return NextResponse.json(
      {
        success: true,
        data: result,
        message:
          result.activatedRecipeId
            ? "Resep dinonaktifkan dan versi sebelumnya diaktifkan."
            : "Resep dinonaktifkan.",
      },
      {
        status: 200,
      },
    )
  } catch (error) {
    console.error(
      "[RecipesAPI] DELETE [id]:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal menonaktifkan resep.",
      },
      {
        status: 500,
      },
    )
  }
}