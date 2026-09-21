import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { Prisma } from "../../../../../prisma/generated/client"

/*
  Mengambil daftar transaksi Restock.

  Restock dapat berasal dari:
  - DIRECT_USE
  - SEMI_FINISHED

  Batch tidak ditampilkan sebagai menu terpisah,
  tetapi informasi batch tetap disimpan dan dapat
  digunakan untuk melihat hasil Restock.
*/
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const search = searchParams.get("search")?.trim() ?? ""
    const inventoryItemId =
      searchParams.get("inventoryItemId")?.trim() ?? ""

    const pageParam = Number(
      searchParams.get("page") ?? "1",
    )

    const limitParam = Number(
      searchParams.get("limit") ?? "10",
    )

    const page =
      Number.isFinite(pageParam) && pageParam > 0
        ? Math.floor(pageParam)
        : 1

    const limit =
      Number.isFinite(limitParam) &&
      limitParam > 0 &&
      limitParam <= 100
        ? Math.floor(limitParam)
        : 10

    const where = {
      ...(inventoryItemId
        ? {
            inventoryItemId,
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                inventoryItem: {
                  name: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
              {
                batch: {
                  batchCode: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
              {
                supplierName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      prisma.restock.findMany({
        where,
        include: {
          inventoryItem: {
            select: {
              id: true,
              name: true,
              type: true,
              unit: true,
            },
          },
          batch: {
            select: {
              id: true,
              batchCode: true,
              sourceType: true,
              quantity: true,
              remainingQuantity: true,
              unitCost: true,
              totalCost: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.restock.count({
        where,
      }),
    ])

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error(
      "[GET /api/inventory/restocks]",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data Restock.",
      },
      {
        status: 500,
      },
    )
  }
}

/*
  Membuat transaksi Restock.

  Semua InventoryItem aktif dapat direstock,
  baik DIRECT_USE maupun SEMI_FINISHED.

  Contoh:
  - Milk     -> DIRECT_USE
  - Cup      -> DIRECT_USE
  - Espresso -> SEMI_FINISHED

  Setiap Restock membuat:
  1. InventoryBatch
  2. InventoryBatchStock
  3. Restock

  Ketiganya dibuat dalam satu transaction agar
  tidak ada data Restock yang tercatat tanpa batch
  atau stock.
*/
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const inventoryItemId =
      typeof body.inventoryItemId === "string"
        ? body.inventoryItemId.trim()
        : ""

    const quantity = Number(body.quantity)
    const totalCost = Number(body.totalCost)

    const supplierName =
      typeof body.supplierName === "string" &&
      body.supplierName.trim()
        ? body.supplierName.trim()
        : null

    if (!inventoryItemId) {
      return NextResponse.json(
        {
          success: false,
          message: "Inventory item wajib dipilih.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity harus lebih dari 0.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      !Number.isFinite(totalCost) ||
      totalCost < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Total cost tidak valid.",
        },
        {
          status: 400,
        },
      )
    }

    /*
      Inventory item hanya boleh aktif.

      Tidak ada lagi validasi:
      item.type !== "DIRECT_USE"

      Karena SEMI_FINISHED seperti Espresso
      juga dapat dibuat melalui Restock.
    */
    const inventoryItem =
      await prisma.inventoryItem.findFirst({
        where: {
          id: inventoryItemId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          type: true,
          unit: true,
        },
      })

    if (!inventoryItem) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Inventory item tidak ditemukan atau sudah tidak aktif.",
        },
        {
          status: 404,
        },
      )
    }

    const unitCost =
      totalCost / quantity

    const result = await prisma.$transaction(
      async (tx) => {
        /*
          Batch code dibuat otomatis oleh backend.

          Prefix mengikuti nama inventory item agar
          lebih mudah dikenali ketika melihat data.
        */
        const prefix = inventoryItem.name
          .replace(/[^a-zA-Z0-9]/g, "")
          .slice(0, 3)
          .toUpperCase()
          .padEnd(3, "INV")

        const batchCode = `${prefix}-${crypto.randomUUID()
          .replace(/-/g, "")
          .slice(0, 8)
          .toUpperCase()}`

        const batch =
          await tx.inventoryBatch.create({
            data: {
              inventoryItemId:
                inventoryItem.id,
              batchCode,
              sourceType: "RESTOCK",
              quantity: new Prisma.Decimal(
                quantity,
              ),
              remainingQuantity:
                new Prisma.Decimal(
                  quantity,
                ),
              unitCost:
                new Prisma.Decimal(
                  unitCost,
                ),
              totalCost:
                new Prisma.Decimal(
                  totalCost,
                ),
            },
          })

        await tx.inventoryBatchStock.create({
          data: {
            batchId: batch.id,
            quantity: new Prisma.Decimal(
              quantity,
            ),
            remainingQuantity:
              new Prisma.Decimal(
                quantity,
              ),
          },
        })

        const restock =
          await tx.restock.create({
            data: {
              inventoryItemId:
                inventoryItem.id,
              batchId: batch.id,
              quantity:
                new Prisma.Decimal(
                  quantity,
                ),
              totalCost:
                new Prisma.Decimal(
                  totalCost,
                ),
              unitCost:
                new Prisma.Decimal(
                  unitCost,
                ),
              supplierName,
            },
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  unit: true,
                },
              },
              batch: {
                select: {
                  id: true,
                  batchCode: true,
                  sourceType: true,
                  quantity: true,
                  remainingQuantity: true,
                  unitCost: true,
                  totalCost: true,
                  createdAt: true,
                },
              },
            },
          })

        return restock
      },
    )

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "[POST /api/inventory/restocks]",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message: "Gagal membuat Restock.",
      },
      {
        status: 500,
      },
    )
  }
}