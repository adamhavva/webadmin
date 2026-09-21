import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/*
  Mengubah input angka menjadi number yang valid.
*/
function parsePositiveNumber(
  value: unknown,
): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0
      ? value
      : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : null;
  }

  return null;
}

/*
  GET /api/inventory/restocks/:id

  Mengambil detail restock beserta batch dan
  posisi stok batch tersebut.
*/
export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "ID restock tidak valid.",
        },
        {
          status: 400,
        },
      );
    }


    const restock =
      await prisma.restock.findUnique({
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
              updatedAt: true,

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
          },
        },
      });

    if (!restock) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Restock tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      data: restock,
    });
  } catch (error) {
    console.error(
      "[GET /api/inventory/restocks/:id]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal mengambil detail restock.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
  PUT /api/inventory/restocks/:id

  Mengedit restock.

  Edit hanya diperbolehkan apabila batch belum pernah
  digunakan.

  Indikatornya:
    remainingQuantity === quantity

  Jika remainingQuantity sudah lebih kecil dari quantity,
  batch dianggap sudah memiliki histori pemakaian
  sehingga tidak boleh diubah.
*/
export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "ID restock tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    const body = await request.json();

    const inventoryItemId =
      typeof body.inventoryItemId === "string"
        ? body.inventoryItemId.trim()
        : "";

    const supplierName =
      typeof body.supplierName === "string"
        ? body.supplierName.trim()
        : "";

    const quantity =
      parsePositiveNumber(body.quantity);

    const totalCost =
      parsePositiveNumber(body.totalCost);

    if (!inventoryItemId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Inventory item wajib dipilih.",
        },
        {
          status: 400,
        },
      );
    }

    if (quantity === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Quantity harus lebih besar dari 0.",
        },
        {
          status: 400,
        },
      );
    }

    if (totalCost === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Total cost harus lebih besar dari 0.",
        },
        {
          status: 400,
        },
      );
    }

    const currentRestock =
      await prisma.restock.findUnique({
        where: {
          id,
        },

        include: {
          batch: true,
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
      });

    if (!currentRestock) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Restock tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    /*
      Batch yang sudah pernah berkurang tidak boleh diedit.
    */
    if (
      Number(
        currentRestock.batch.remainingQuantity,
      ) !==
      Number(
        currentRestock.batch.quantity,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Restock tidak dapat diedit karena batch sudah pernah digunakan.",
        },
        {
          status: 409,
        },
      );
    }

    const inventoryItem =
      await prisma.inventoryItem.findUnique({
        where: {
          id: inventoryItemId,
        },

        select: {
          id: true,
          name: true,
          type: true,
          unit: true,
          isActive: true,
        },
      });

    if (!inventoryItem) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Inventory item tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    if (!inventoryItem.isActive) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Inventory item sudah tidak aktif.",
        },
        {
          status: 400,
        },
      );
    }

    /*
      Unit inventory tidak boleh berubah karena batch
      mengikuti satuan inventory item tersebut.
    */
    if (
      inventoryItem.unit !==
      currentRestock.inventoryItem.unit
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Satuan inventory item tidak dapat diubah pada restock yang sudah dibuat.",
        },
        {
          status: 400,
        },
      );
    }

    const unitCost =
      totalCost / quantity;

    const result =
      await prisma.$transaction(
        async (tx) => {
          const batch =
            await tx.inventoryBatch.update({
              where: {
                id:
                  currentRestock.batchId,
              },

              data: {
                inventoryItemId:
                  inventoryItem.id,

                quantity,

                remainingQuantity:
                  quantity,

                unitCost,

                totalCost,
              },
            });

          await tx.inventoryBatchStock.update({
            where: {
              batchId:
                currentRestock.batchId,
            },

            data: {
              quantity,

              remainingQuantity:
                quantity,
            },
          });

          const restock =
            await tx.restock.update({
              where: {
                id,
              },

              data: {
                inventoryItemId:
                  inventoryItem.id,

                quantity,

                totalCost,

                unitCost,

                supplierName:
                  supplierName || null,
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
                    updatedAt: true,
                  },
                },
              },
            });

          return {
            batch,
            restock,
          };
        },
      );

    return NextResponse.json({
      success: true,
      message:
        "Restock berhasil diperbarui.",
      data: result.restock,
    });
  } catch (error) {
    console.error(
      "[PUT /api/inventory/restocks/:id]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal memperbarui restock.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
  DELETE /api/inventory/restocks/:id

  Menghapus restock beserta batch dan batch stock.

  Hanya diperbolehkan apabila batch belum pernah digunakan.
*/
export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "ID restock tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    const currentRestock =
      await prisma.restock.findUnique({
        where: {
          id,
        },

        include: {
          batch: true,
        },
      });

    if (!currentRestock) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Restock tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    /*
      Batch yang sudah pernah berkurang tidak boleh
      dihapus karena sudah memiliki histori penggunaan.
    */
    if (
      Number(
        currentRestock.batch.remainingQuantity,
      ) !==
      Number(
        currentRestock.batch.quantity,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Restock tidak dapat dihapus karena batch sudah pernah digunakan.",
        },
        {
          status: 409,
        },
      );
    }

    await prisma.$transaction(
      async (tx) => {
        /*
          Restock harus dihapus terlebih dahulu karena
          memiliki foreign key ke InventoryBatch.
        */
        await tx.restock.delete({
          where: {
            id,
          },
        });

        await tx.inventoryBatchStock.delete({
          where: {
            batchId:
              currentRestock.batchId,
          },
        });

        await tx.inventoryBatch.delete({
          where: {
            id:
              currentRestock.batchId,
          },
        });
      },
    );

    return NextResponse.json({
      success: true,
      message:
        "Restock berhasil dihapus.",
    });
  } catch (error) {
    console.error(
      "[DELETE /api/inventory/restocks/:id]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal menghapus restock.",
      },
      {
        status: 500,
      },
    );
  }
}