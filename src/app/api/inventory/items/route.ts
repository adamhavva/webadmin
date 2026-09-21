import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

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
  value: string | null,
): boolean | null {
  if (value === null) {
    return null
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
  Mengambil daftar master inventory item.

  Parameter:
  - search
  - page
  - limit
  - type
  - unit
  - isActive

  Pagination dan pencarian dilakukan di database
  agar jumlah data tetap konsisten.
*/
export async function GET(
  request: NextRequest,
) {
  try {
    const searchParams =
      request.nextUrl.searchParams

    const search =
      searchParams.get("search")?.trim() ?? ""

    const pageParam =
      searchParams.get("page")

    const limitParam =
      searchParams.get("limit")

    const typeParam =
      searchParams.get("type")

    const unitParam =
      searchParams.get("unit")

    const isActiveParam =
      searchParams.get("isActive")

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
      typeParam !== null &&
      !isValidType(typeParam)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Parameter type tidak valid.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      unitParam !== null &&
      !isValidUnit(unitParam)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Parameter unit tidak valid.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      isActiveParam !== null &&
      parseBoolean(isActiveParam) === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Parameter isActive tidak valid.",
        },
        {
          status: 400,
        },
      )
    }

    const isActive =
      parseBoolean(isActiveParam)

    const where = {
      ...(search
        ? {
            name: {
              contains: search,
              mode: "insensitive" as const,
            },
          }
        : {}),

      ...(typeParam
        ? {
            type:
              typeParam as
                | "SEMI_FINISHED"
                | "DIRECT_USE",
          }
        : {}),

      ...(unitParam
        ? {
            unit:
              unitParam as
                | "ML"
                | "PCS",
          }
        : {}),

      ...(isActive !== null
        ? {
            isActive,
          }
        : {}),
    }

    const skip =
      (page - 1) * limit

    const [
      items,
      total,
      totalItems,
      semiFinished,
      directUse,
      activeItems,
    ] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),

      prisma.inventoryItem.count({
        where,
      }),

      prisma.inventoryItem.count(),

      prisma.inventoryItem.count({
        where: {
          type: "SEMI_FINISHED",
        },
      }),

      prisma.inventoryItem.count({
        where: {
          type: "DIRECT_USE",
        },
      }),

      prisma.inventoryItem.count({
        where: {
          isActive: true,
        },
      }),
    ])

    const totalPages =
      Math.max(
        1,
        Math.ceil(total / limit),
      )

    return NextResponse.json(
      {
        success: true,
        data: items,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
        summary: {
          totalItems,
          semiFinished,
          directUse,
          activeItems,
        },
      },
      {
        status: 200,
      },
    )
  } catch (error) {
    console.error(
      "[InventoryItemsAPI] GET:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal mengambil data bahan.",
      },
      {
        status: 500,
      },
    )
  }
}

/*
  Membuat master inventory item.

  Endpoint ini hanya membuat identitas bahan.
  Quantity, HPP, supplier, dan batch dibuat
  melalui proses Restock atau Production.
*/
export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as {
        name?: unknown
        type?: unknown
        unit?: unknown
        isActive?: unknown
      }

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

    const name =
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

    let isActive = true

    if (body.isActive !== undefined) {
      if (
        typeof body.isActive !==
        "boolean"
      ) {
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

      isActive = body.isActive
    }

    const existingItem =
      await prisma.inventoryItem.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
        },
      })

    if (existingItem) {
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

    const item =
      await prisma.inventoryItem.create({
        data: {
          name,
          type: body.type,
          unit: body.unit,
          isActive,
        },
      })

    return NextResponse.json(
      {
        success: true,
        data: item,
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "[InventoryItemsAPI] POST:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal membuat bahan.",
      },
      {
        status: 500,
      },
    )
  }
}