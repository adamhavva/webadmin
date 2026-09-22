import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

/*
  Mengambil daftar inventory batch.

  Filter yang tersedia:
  - search: mencari batch code atau nama bahan
  - inventoryItemId: filter berdasarkan bahan
  - sourceType: RESTOCK atau PRODUCTION
  - page: halaman
  - limit: jumlah data per halaman

  Batch hanya bisa dibaca dari endpoint ini.
  Pembuatan batch dilakukan oleh proses Restock atau Production.
*/
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search =
      searchParams.get("search")?.trim() ?? "";

    const inventoryItemId =
      searchParams.get("inventoryItemId")?.trim() ?? "";

    const sourceType =
      searchParams.get("sourceType")?.trim() ?? "";

    const pageParam =
      Number(searchParams.get("page") ?? "1");

    const limitParam =
      Number(searchParams.get("limit") ?? "10");

    const page =
      Number.isFinite(pageParam) && pageParam > 0
        ? Math.floor(pageParam)
        : 1;

    const limit =
      Number.isFinite(limitParam) &&
      limitParam > 0
        ? Math.min(Math.floor(limitParam), 100)
        : 10;

    if (
      sourceType &&
      sourceType !== "RESTOCK" &&
      sourceType !== "PRODUCTION"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Source type tidak valid.",
        },
        { status: 400 },
      );
    }

    const where = {
      ...(search
        ? {
            OR: [
              {
                batchCode: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                inventoryItem: {
                  name: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {}),

      ...(inventoryItemId
        ? {
            inventoryItemId,
          }
        : {}),

      ...(sourceType
        ? {
            sourceType:
              sourceType as
                | "RESTOCK"
                | "PRODUCTION",
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [batches, total] =
      await Promise.all([
        prisma.inventoryBatch.findMany({
          where,
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
            stock: {
              select: {
                id: true,
                quantity: true,
                remainingQuantity: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,
        }),

        prisma.inventoryBatch.count({
          where,
        }),
      ]);

    const [
      totalBatches,
      restockBatches,
      productionBatches,
      availableBatches,
    ] = await Promise.all([
      prisma.inventoryBatch.count(),

      prisma.inventoryBatch.count({
        where: {
          sourceType: "RESTOCK",
        },
      }),

      prisma.inventoryBatch.count({
        where: {
          sourceType: "PRODUCTION",
        },
      }),

      prisma.inventoryBatch.count({
        where: {
          remainingQuantity: {
            gt: 0,
          },
        },
      }),
    ]);

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: batches,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      summary: {
        totalBatches,
        restockBatches,
        productionBatches,
        availableBatches,
      },
    });
  } catch (error) {
    console.error(
      "[InventoryBatchesAPI] GET:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal mengambil data batch.",
      },
      { status: 500 },
    );
  }
}