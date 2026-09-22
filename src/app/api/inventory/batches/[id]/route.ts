import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

/*
  Mengambil detail satu batch.

  Endpoint ini read-only.
  Batch tidak boleh diedit atau dihapus karena menjadi
  bagian dari histori inventory.
*/
export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID batch wajib diisi.",
        },
        { status: 400 },
      );
    }

    const batch =
      await prisma.inventoryBatch.findUnique({
        where: {
          id,
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

          stock: {
            select: {
              id: true,
              quantity: true,
              remainingQuantity: true,
              createdAt: true,
              updatedAt: true,
            },
          },

          restock: {
            select: {
              id: true,
              quantity: true,
              totalCost: true,
              unitCost: true,
              supplierName: true,
              createdAt: true,
            },
          },

          production: {
            select: {
              id: true,
              outputQuantity: true,
              totalCost: true,
              unitCost: true,
              createdAt: true,
            },
          },
        },
      });

    if (!batch) {
      return NextResponse.json(
        {
          success: false,
          message: "Batch tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    console.error(
      "[InventoryBatchAPI] GET:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal mengambil detail batch.",
      },
      { status: 500 },
    );
  }
}