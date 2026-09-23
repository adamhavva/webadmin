import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type { Prisma } from "../../../prisma/generated/client";
import type {
  AdjustBaristaStockInput,
  ListBaristaStockQuery,
  ListMovementsQuery,
  RestockBaristaInput,
  ReturnBaristaStockInput,
} from "./barista-stock.validator";

// ============================================================
// List — semua stock barista (admin monitor)
// ============================================================

export async function listBaristaStocks(query: ListBaristaStockQuery) {
  const baristaWhere: Prisma.UserWhereInput = {
    role: "BARISTA",
  };
  if (query.baristaId) baristaWhere.id = query.baristaId;
  if (query.search) {
    baristaWhere.name = { contains: query.search, mode: "insensitive" };
  }

  const baristas = await prisma.user.findMany({
    where: baristaWhere,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      baristaStocks: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sellingPrice: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  const items = baristas.map((b) => {
    const stocks = b.baristaStocks.map((s) => ({
      productId: s.productId,
      productName: s.product.name,
      productIsActive: s.product.isActive,
      sellingPrice: Number(s.product.sellingPrice),
      quantity: s.quantity,
      minThreshold: s.minThreshold,
      isLow: s.quantity < s.minThreshold,
      lastRestockAt: s.lastRestockAt?.toISOString() ?? null,
    }));

    const totalItems = stocks.reduce((sum, s) => sum + s.quantity, 0);
    const lowStockCount = stocks.filter((s) => s.isLow).length;

    return {
      baristaId: b.id,
      baristaName: b.name,
      baristaPhone: b.phone,
      baristaStatus: b.status,
      totalItems,
      productCount: stocks.length,
      lowStockCount,
      products: stocks,
    };
  });

  // Filter low stock only
  const filtered = query.lowStockOnly
    ? items.filter((i) => i.lowStockCount > 0)
    : items;

  return {
    items: filtered,
    summary: {
      totalBaristas: items.length,
      baristasWithStock: items.filter((i) => i.totalItems > 0).length,
      baristasWithLowStock: items.filter((i) => i.lowStockCount > 0).length,
      totalStockAll: items.reduce((sum, i) => sum + i.totalItems, 0),
    },
  };
}

// ============================================================
// Detail — stock 1 barista
// ============================================================

export async function getBaristaStockDetail(baristaId: string) {
  const barista = await prisma.user.findUnique({
    where: { id: baristaId },
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      role: true,
      baristaStocks: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sellingPrice: true,
              isActive: true,
            },
          },
        },
        orderBy: { product: { name: "asc" } },
      },
    },
  });

  if (!barista) throw ApiError.notFound("Barista tidak ditemukan");
  if (barista.role !== "BARISTA") {
    throw ApiError.unprocessable("User ini bukan barista");
  }

  const stocks = barista.baristaStocks.map((s) => ({
    productId: s.productId,
    productName: s.product.name,
    productIsActive: s.product.isActive,
    sellingPrice: Number(s.product.sellingPrice),
    quantity: s.quantity,
    minThreshold: s.minThreshold,
    isLow: s.quantity < s.minThreshold,
    lastRestockAt: s.lastRestockAt?.toISOString() ?? null,
  }));

  return {
    baristaId: barista.id,
    baristaName: barista.name,
    baristaPhone: barista.phone,
    baristaStatus: barista.status,
    totalItems: stocks.reduce((sum, s) => sum + s.quantity, 0),
    productCount: stocks.length,
    lowStockCount: stocks.filter((s) => s.isLow).length,
    products: stocks,
  };
}

// ============================================================
// Helper — generate movement log
// ============================================================

async function logMovement(
  tx: Prisma.TransactionClient,
  data: {
    baristaId: string;
    productId: string;
    type:
      | "RESTOCK"
      | "SOLD"
      | "ADJUSTMENT"
      | "RETURN"
      | "WASTE";
    quantity: number;
    balanceAfter: number;
    baristaRestockId?: string;
    orderId?: string;
    note?: string;
  }
) {
  await tx.baristaStockMovement.create({
    data: {
      baristaId: data.baristaId,
      productId: data.productId,
      type: data.type,
      quantity: data.quantity,
      balanceAfter: data.balanceAfter,
      baristaRestockId: data.baristaRestockId ?? null,
      orderId: data.orderId ?? null,
      note: data.note ?? null,
    },
  });
}

// ============================================================
// Restock — ambil dari FinishedProductBatch
// ============================================================

export async function restockBarista(input: RestockBaristaInput) {
  // 1. Validasi barista
  const barista = await prisma.user.findUnique({
    where: { id: input.baristaId },
    select: { id: true, name: true, role: true, status: true },
  });

  if (!barista) throw ApiError.notFound("Barista tidak ditemukan");
  if (barista.role !== "BARISTA") {
    throw ApiError.unprocessable("User ini bukan barista");
  }
  if (barista.status !== "ACTIVE") {
    throw ApiError.unprocessable(
      `Barista "${barista.name}" sedang tidak aktif`
    );
  }

  // 2. Cek duplikat produk
  const productIds = input.items.map((i) => i.productId);
  if (new Set(productIds).size !== productIds.length) {
    throw ApiError.unprocessable(
      "Produk tidak boleh duplikat. Gabungkan jadi satu baris."
    );
  }

  // 3. Validasi produk
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, isActive: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i];
    const product = productMap.get(item.productId);
    if (!product) {
      throw ApiError.unprocessable(
        `Baris #${i + 1}: produk tidak ditemukan`
      );
    }
    if (!product.isActive) {
      throw ApiError.unprocessable(
        `Baris #${i + 1}: produk "${product.name}" sedang tidak aktif`
      );
    }
  }

  // 4. Validasi stok pusat cukup (aggregate FinishedProductBatch)
  const centralStock = await prisma.finishedProductBatch.groupBy({
    by: ["productId"],
    where: {
      productId: { in: productIds },
      remainingQuantity: { gt: 0 },
    },
    _sum: { remainingQuantity: true },
  });
  const centralMap = new Map(
    centralStock.map((c) => [c.productId, Number(c._sum.remainingQuantity ?? 0)])
  );

  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i];
    const available = centralMap.get(item.productId) ?? 0;
    if (available < item.quantity) {
      const product = productMap.get(item.productId)!;
      throw ApiError.unprocessable(
        `Stok pusat tidak cukup untuk "${product.name}". ` +
          `Tersedia: ${available}, diminta: ${item.quantity}`
      );
    }
  }

  // 5. Transaction
  const result = await prisma.$transaction(
    async (tx) => {
      // Buat header restock
      const restock = await tx.baristaRestock.create({
        data: {
          baristaId: input.baristaId,
          note: input.note ?? null,
          totalItems: input.items.reduce((s, i) => s + i.quantity, 0),
        },
      });

      const detailItems: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitCost: number;
        batchCount: number;
      }> = [];

      // Untuk setiap produk, konsumsi FIFO dari FinishedProductBatch
      for (const item of input.items) {
        const product = productMap.get(item.productId)!;
        let remaining = item.quantity;
        let totalCost = 0;
        let batchCount = 0;

        // Ambil batch FIFO
        const batches = await tx.finishedProductBatch.findMany({
          where: {
            productId: item.productId,
            remainingQuantity: { gt: 0 },
          },
          orderBy: { createdAt: "asc" },
        });

        for (const batch of batches) {
          if (remaining <= 0) break;

          const available = Number(batch.remainingQuantity);
          const take = Math.min(available, remaining);
          const unitCost = Number(batch.unitCost);

          await tx.finishedProductBatch.update({
            where: { id: batch.id },
            data: {
              remainingQuantity: {
                decrement: take,
              },
            },
          });

          await tx.baristaRestockItem.create({
            data: {
              restockId: restock.id,
              productId: item.productId,
              finishedBatchId: batch.id,
              quantity: take,
              unitCost,
            },
          });

          totalCost += take * unitCost;
          batchCount += 1;
          remaining -= take;
        }

        if (remaining > 0) {
          throw ApiError.unprocessable(
            `Stok pusat berubah untuk "${product.name}". Silakan coba lagi.`
          );
        }

        const avgUnitCost =
          item.quantity > 0 ? totalCost / item.quantity : 0;

        // Upsert BaristaStock
        const existing = await tx.baristaStock.findUnique({
          where: {
            baristaId_productId: {
              baristaId: input.baristaId,
              productId: item.productId,
            },
          },
        });

        const newQuantity = (existing?.quantity ?? 0) + item.quantity;

        if (existing) {
          await tx.baristaStock.update({
            where: { id: existing.id },
            data: {
              quantity: newQuantity,
              lastRestockAt: new Date(),
            },
          });
        } else {
          await tx.baristaStock.create({
            data: {
              baristaId: input.baristaId,
              productId: item.productId,
              quantity: item.quantity,
              lastRestockAt: new Date(),
            },
          });
        }

        // Log movement
        await logMovement(tx, {
          baristaId: input.baristaId,
          productId: item.productId,
          type: "RESTOCK",
          quantity: item.quantity,
          balanceAfter: newQuantity,
          baristaRestockId: restock.id,
          note: input.note,
        });

        detailItems.push({
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          unitCost: avgUnitCost,
          batchCount,
        });
      }

      return { restock, items: detailItems };
    },
    { timeout: 60000 }
  );

  return {
    success: true,
    restockId: result.restock.id,
    baristaName: barista.name,
    totalItems: result.restock.totalItems,
    items: result.items,
  };
}

// ============================================================
// Return — balik stok ke pusat
// ============================================================

export async function returnBaristaStock(input: ReturnBaristaStockInput) {
  const barista = await prisma.user.findUnique({
    where: { id: input.baristaId },
    select: { id: true, name: true, role: true },
  });
  if (!barista) throw ApiError.notFound("Barista tidak ditemukan");
  if (barista.role !== "BARISTA") {
    throw ApiError.unprocessable("User ini bukan barista");
  }

  // Validasi produk duplikat
  const productIds = input.items.map((i) => i.productId);
  if (new Set(productIds).size !== productIds.length) {
    throw ApiError.unprocessable(
      "Produk tidak boleh duplikat. Gabungkan jadi satu baris."
    );
  }

  // Validasi produk & stok barista cukup
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const baristaStocks = await prisma.baristaStock.findMany({
    where: {
      baristaId: input.baristaId,
      productId: { in: productIds },
    },
  });
  const stockMap = new Map(baristaStocks.map((s) => [s.productId, s.quantity]));

  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i];
    const product = productMap.get(item.productId);
    if (!product) {
      throw ApiError.unprocessable(
        `Baris #${i + 1}: produk tidak ditemukan`
      );
    }
    const current = stockMap.get(item.productId) ?? 0;
    if (current < item.quantity) {
      throw ApiError.unprocessable(
        `Stok barista tidak cukup untuk "${product.name}". ` +
          `Dimiliki: ${current}, dikembalikan: ${item.quantity}`
      );
    }
  }

  // Transaction
  const result = await prisma.$transaction(
    async (tx) => {
      const restock = await tx.baristaRestock.create({
        data: {
          baristaId: input.baristaId,
          note: input.note ?? null,
          totalItems: input.items.reduce((s, i) => s + i.quantity, 0),
        },
      });

      const detailItems: Array<{
        productId: string;
        productName: string;
        quantity: number;
      }> = [];

      for (const item of input.items) {
        const product = productMap.get(item.productId)!;

        // Cari batch untuk dikembalikan — pakai batch terbaru untuk traceability
        // (atau bisa pilih batch apapun, karena nilainya sama)
        let latestBatch = await tx.finishedProductBatch.findFirst({
          where: { productId: item.productId },
          orderBy: { createdAt: "desc" },
        });

        // Kalau tidak ada batch (misal sudah terhapus), skip traceability
        const finishedBatchId = latestBatch?.id ?? null;
        const unitCost = latestBatch ? Number(latestBatch.unitCost) : 0;

        await tx.baristaRestockItem.create({
          data: {
            restockId: restock.id,
            productId: item.productId,
            finishedBatchId,
            quantity: item.quantity,
            unitCost,
          },
        });

        // Kembalikan ke FinishedProductBatch
        if (latestBatch) {
          await tx.finishedProductBatch.update({
            where: { id: latestBatch.id },
            data: {
              remainingQuantity: {
                increment: item.quantity,
              },
            },
          });
        }

        // Update BaristaStock
        const existing = await tx.baristaStock.findUnique({
          where: {
            baristaId_productId: {
              baristaId: input.baristaId,
              productId: item.productId,
            },
          },
        });

        const newQuantity = (existing?.quantity ?? 0) - item.quantity;

        if (existing) {
          await tx.baristaStock.update({
            where: { id: existing.id },
            data: { quantity: newQuantity },
          });
        }

        await logMovement(tx, {
          baristaId: input.baristaId,
          productId: item.productId,
          type: "RETURN",
          quantity: -item.quantity,
          balanceAfter: newQuantity,
          baristaRestockId: restock.id,
          note: input.note,
        });

        detailItems.push({
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
        });
      }

      return { restock, items: detailItems };
    },
    { timeout: 60000 }
  );

  return {
    success: true,
    restockId: result.restock.id,
    baristaName: barista.name,
    totalItems: result.restock.totalItems,
    items: result.items,
  };
}

// ============================================================
// Adjust — koreksi manual
// ============================================================

export async function adjustBaristaStock(input: AdjustBaristaStockInput) {
  const barista = await prisma.user.findUnique({
    where: { id: input.baristaId },
    select: { id: true, name: true, role: true },
  });
  if (!barista) throw ApiError.notFound("Barista tidak ditemukan");
  if (barista.role !== "BARISTA") {
    throw ApiError.unprocessable("User ini bukan barista");
  }

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, name: true },
  });
  if (!product) throw ApiError.notFound("Produk tidak ditemukan");

  const existing = await prisma.baristaStock.findUnique({
    where: {
      baristaId_productId: {
        baristaId: input.baristaId,
        productId: input.productId,
      },
    },
  });

  const oldQuantity = existing?.quantity ?? 0;
  const delta = input.newQuantity - oldQuantity;

  if (delta === 0) {
    return {
      success: true,
      message: "Tidak ada perubahan",
      baristaName: barista.name,
      productName: product.name,
      oldQuantity,
      newQuantity: input.newQuantity,
    };
  }

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.baristaStock.update({
        where: { id: existing.id },
        data: { quantity: input.newQuantity },
      });
    } else {
      await tx.baristaStock.create({
        data: {
          baristaId: input.baristaId,
          productId: input.productId,
          quantity: input.newQuantity,
        },
      });
    }

    await logMovement(tx, {
      baristaId: input.baristaId,
      productId: input.productId,
      type: "ADJUSTMENT",
      quantity: delta,
      balanceAfter: input.newQuantity,
      note: input.note,
    });
  });

  return {
    success: true,
    baristaName: barista.name,
    productName: product.name,
    oldQuantity,
    newQuantity: input.newQuantity,
    delta,
  };
}

// ============================================================
// Movements — log pergerakan
// ============================================================

export async function listMovements(query: ListMovementsQuery) {
  const where: Prisma.BaristaStockMovementWhereInput = {};

  if (query.baristaId) where.baristaId = query.baristaId;
  if (query.productId) where.productId = query.productId;
  if (query.type !== "all") where.type = query.type;

  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt.gte = query.dateFrom;
    if (query.dateTo) where.createdAt.lte = query.dateTo;
  }

  const skip = (query.page - 1) * query.limit;

  const [movements, total] = await Promise.all([
    prisma.baristaStockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.baristaStockMovement.count({ where }),
  ]);

  // Enrich dengan nama barista + produk
  const baristaIds = [...new Set(movements.map((m) => m.baristaId))];
  const productIds = [...new Set(movements.map((m) => m.productId))];

  const [baristas, products] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: baristaIds } },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    }),
  ]);

  const baristaMap = new Map(baristas.map((b) => [b.id, b.name]));
  const productMap = new Map(products.map((p) => [p.id, p.name]));

  return {
    items: movements.map((m) => ({
      id: m.id,
      baristaId: m.baristaId,
      baristaName: baristaMap.get(m.baristaId) ?? "Unknown",
      productId: m.productId,
      productName: productMap.get(m.productId) ?? "Unknown",
      type: m.type,
      quantity: m.quantity,
      balanceAfter: m.balanceAfter,
      orderId: m.orderId,
      baristaRestockId: m.baristaRestockId,
      note: m.note,
      createdAt: m.createdAt.toISOString(),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
  };
}

// ============================================================
// Available Products — produk dengan stok pusat tersedia
// ============================================================

export async function getAvailableProducts() {
  // Aggregate total remainingQuantity per produk dari FinishedProductBatch
  const grouped = await prisma.finishedProductBatch.groupBy({
    by: ["productId"],
    where: { remainingQuantity: { gt: 0 } },
    _sum: { remainingQuantity: true },
  });

  if (grouped.length === 0) {
    return { items: [] };
  }

  const productIds = grouped.map((g) => g.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sellingPrice: true,
    },
  });

  const stockMap = new Map(
    grouped.map((g) => [
      g.productId,
      Number(g._sum.remainingQuantity ?? 0),
    ])
  );

  return {
    items: products.map((p) => ({
      productId: p.id,
      productName: p.name,
      sellingPrice: Number(p.sellingPrice),
      availableStock: stockMap.get(p.id) ?? 0,
    })),
  };
}