import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const VALID_TYPES = [
  "SEMI_FINISHED",
  "DIRECT_USE",
] as const

const VALID_UNITS = [
  "ML",
  "PCS",
] as const

function isValidType(
  value: unknown,
): value is (typeof VALID_TYPES)[number] {
  return (
    typeof value === "string" &&
    VALID_TYPES.includes(
      value as (typeof VALID_TYPES)[number],
    )
  )
}

function isValidUnit(
  value: unknown,
): value is (typeof VALID_UNITS)[number] {
  return (
    typeof value === "string" &&
    VALID_UNITS.includes(
      value as (typeof VALID_UNITS)[number],
    )
  )
}

function parseBoolean(
  value: unknown,
): boolean | null {
  if (typeof value === "boolean") {
    return value
  }

  if (value === "true") {
    return true
  }

  if (value === "false") {
    return false
  }

  return null
}

/*
  Mengambil satu master inventory item
  beserta jumlah relasi yang sudah dimiliki.
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
            "ID bahan wajib diisi.",
        },
        {
          status: 400,
        },
      )
    }

    const item =
      await prisma.inventoryItem.findUnique({
        where: {
          id,
        },
        include: {
          _count: {
            select: {
              batches: true,
              recipeItems: true,
              restocks: true,
              productions: true,
            },
          },
        },
      })

    if (!item) {
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

    return NextResponse.json(
      {
        success: true,
        data: item,
      },
      {
        status: 200,
      },
    )
  } catch (error) {
    console.error(
      "[InventoryItemsAPI] GET detail:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal mengambil detail bahan.",
      },
      {
        status: 500,
      },
    )
  }
}

/*
  Mengubah master inventory item.

  Yang dapat diubah:
  - nama
  - tipe
  - unit
  - status aktif

  Tipe dan unit dikunci jika item sudah
  memiliki batch agar histori tidak berubah.
*/
export async function PUT(
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
            "ID bahan wajib diisi.",
        },
        {
          status: 400,
        },
      )
    }

    const body =
      (await request.json()) as {
        name?: unknown
        type?: unknown
        unit?: unknown
        isActive?: unknown
      }

    const existingItem =
      await prisma.inventoryItem.findUnique({
        where: {
          id,
        },
      })

    if (!existingItem) {
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

    const hasName =
      body.name !== undefined

    const hasType =
      body.type !== undefined

    const hasUnit =
      body.unit !== undefined

    const hasIsActive =
      body.isActive !== undefined

    if (
      !hasName &&
      !hasType &&
      !hasUnit &&
      !hasIsActive
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tidak ada data yang diperbarui.",
        },
        {
          status: 400,
        },
      )
    }

    let name:
      | string
      | undefined

    let type:
      | "SEMI_FINISHED"
      | "DIRECT_USE"
      | undefined

    let unit:
      | "ML"
      | "PCS"
      | undefined

    let isActive:
      | boolean
      | undefined

    if (hasName) {
      if (
        typeof body.name !== "string" ||
        body.name.trim().length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Nama bahan wajib diisi.",
          },
          {
            status: 400,
          },
        )
      }

      name =
        body.name.trim()

      if (name.length > 150) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Nama bahan maksimal 150 karakter.",
          },
          {
            status: 400,
          },
        )
      }
    }

    if (hasType) {
      if (!isValidType(body.type)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Tipe bahan tidak valid.",
          },
          {
            status: 400,
          },
        )
      }

      type = body.type
    }

    if (hasUnit) {
      if (!isValidUnit(body.unit)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Unit bahan tidak valid.",
          },
          {
            status: 400,
          },
        )
      }

      unit = body.unit
    }

    if (hasIsActive) {
      const parsedIsActive =
        parseBoolean(
          body.isActive,
        )

      if (parsedIsActive === null) {
        return NextResponse.json(
          {
            success: false,
            message:
              "isActive harus berupa boolean.",
          },
          {
            status: 400,
          },
        )
      }

      isActive =
        parsedIsActive
    }

    /*
      Nama bahan tidak boleh duplikat
      dengan bahan lain.
    */
    if (name !== undefined) {
      const duplicate =
        await prisma.inventoryItem.findFirst({
          where: {
            name: {
              equals: name,
              mode: "insensitive",
            },
            NOT: {
              id,
            },
          },
          select: {
            id: true,
          },
        })

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Nama bahan sudah digunakan.",
          },
          {
            status: 409,
          },
        )
      }
    }

    /*
      Tipe dan unit tidak boleh berubah
      jika item sudah memiliki batch.
    */
    if (
      type !== undefined &&
      type !== existingItem.type
    ) {
      const batchCount =
        await prisma.inventoryBatch.count({
          where: {
            inventoryItemId: id,
          },
        })

      if (batchCount > 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Tipe bahan tidak dapat diubah karena bahan sudah memiliki batch inventory.",
          },
          {
            status: 409,
          },
        )
      }
    }

    if (
      unit !== undefined &&
      unit !== existingItem.unit
    ) {
      const batchCount =
        await prisma.inventoryBatch.count({
          where: {
            inventoryItemId: id,
          },
        })

      if (batchCount > 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Unit bahan tidak dapat diubah karena bahan sudah memiliki batch inventory.",
          },
          {
            status: 409,
          },
        )
      }
    }

    const updatedItem =
      await prisma.inventoryItem.update({
        where: {
          id,
        },
        data: {
          ...(name !== undefined
            ? { name }
            : {}),

          ...(type !== undefined
            ? { type }
            : {}),

          ...(unit !== undefined
            ? { unit }
            : {}),

          ...(isActive !== undefined
            ? { isActive }
            : {}),
        },
      })

    return NextResponse.json(
      {
        success: true,
        data: updatedItem,
      },
      {
        status: 200,
      },
    )
  } catch (error) {
    console.error(
      "[InventoryItemsAPI] PUT:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal memperbarui bahan.",
      },
      {
        status: 500,
      },
    )
  }
}

/*
  Menghapus master inventory item.

  Penghapusan ditolak jika item sudah pernah
  digunakan pada recipe, batch, restock,
  atau production.
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
            "ID bahan wajib diisi.",
        },
        {
          status: 400,
        },
      )
    }

    const existingItem =
      await prisma.inventoryItem.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          name: true,
        },
      })

    if (!existingItem) {
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

    const [
      recipeItemCount,
      batchCount,
      restockCount,
      productionCount,
    ] = await Promise.all([
      prisma.recipeItem.count({
        where: {
          inventoryItemId: id,
        },
      }),

      prisma.inventoryBatch.count({
        where: {
          inventoryItemId: id,
        },
      }),

      prisma.restock.count({
        where: {
          inventoryItemId: id,
        },
      }),

      prisma.production.count({
        where: {
          inventoryItemId: id,
        },
      }),
    ])

    if (
      recipeItemCount > 0 ||
      batchCount > 0 ||
      restockCount > 0 ||
      productionCount > 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bahan tidak dapat dihapus karena sudah digunakan atau memiliki histori inventory.",
        },
        {
          status: 409,
        },
      )
    }

    await prisma.inventoryItem.delete({
      where: {
        id,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message:
          "Bahan berhasil dihapus.",
        data: {
          id: existingItem.id,
          name: existingItem.name,
        },
      },
      {
        status: 200,
      },
    )
  } catch (error) {
    console.error(
      "[InventoryItemsAPI] DELETE:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal menghapus bahan.",
      },
      {
        status: 500,
      },
    )
  }
}