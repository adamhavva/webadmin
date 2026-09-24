import { prisma } from "@/lib/db";
import type { Prisma } from "@/prisma/generated/client";
import type { ListCostHistoryQuery } from "./cost-history.validator";

// ============================================================
// List — riwayat HPP per pencatatan
// ============================================================

export async function listCostHistories(query: ListCostHistoryQuery) {
  const where: Prisma.ProductCostHistoryWhereInput = {};

  if (query.productId) where.productId = query.productId;

  if (query.search) {
    where.product = {
      name: { contains: query.search, mode: "insensitive" },
    };
  }

  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt.gte = query.dateFrom;
    if (query.dateTo) where.createdAt.lte = query.dateTo;
  }

  const skip = (query.page - 1) * query.limit;

  const [entries, total] = await Promise.all([
    prisma.productCostHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
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
    }),
    prisma.productCostHistory.count({ where }),
  ]);

  // ---------- Compute delta (perubahan vs HPP sebelumnya) ----------
  // Untuk setiap product, cari HPP sebelum entry. Efficient:
  // 1. Cari HPP terakhir SEBELUM entry tertua di page (per produk) → previousHppMap
  // 2. Walk entries dari tertua → terbaru, track running prev
  const productIds = [...new Set(entries.map((e) => e.productId))];

  const oldestInPage =
    entries.length > 0
      ? entries[entries.length - 1].createdAt
      : new Date();

  const previousHppMap = new Map<string, number>();
  await Promise.all(
    productIds.map(async (pid) => {
      const prev = await prisma.productCostHistory.findFirst({
        where: {
          productId: pid,
          createdAt: { lt: oldestInPage },
        },
        orderBy: { createdAt: "desc" },
        select: { hpp: true },
      });
      if (prev) previousHppMap.set(pid, Number(prev.hpp));
    })
  );

  const deltaMap = new Map<string, number | null>();
  const runningPrev = new Map<string, number>();

  // entries sudah desc → reverse agar ascending (dari tua ke baru)
  const ascending = [...entries].reverse();

  for (const e of ascending) {
    const before = runningPrev.has(e.productId)
      ? runningPrev.get(e.productId)!
      : previousHppMap.has(e.productId)
        ? previousHppMap.get(e.productId)!
        : null;

    deltaMap.set(
      e.id,
      before !== null ? Number(e.hpp) - before : null
    );

    runningPrev.set(e.productId, Number(e.hpp));
  }

  // ---------- Summary ----------
  const allForSummary = await prisma.productCostHistory.findMany({
    where,
    select: { hpp: true, productId: true },
  });

  const totalEntries = allForSummary.length;
  const uniqueProducts = new Set(allForSummary.map((e) => e.productId))
    .size;
  const avgHpp =
    totalEntries > 0
      ? allForSummary.reduce((sum, e) => sum + Number(e.hpp), 0) /
        totalEntries
      : 0;

  return {
    items: entries.map((e) => {
      const sellingPrice = Number(e.product.sellingPrice);
      const hpp = Number(e.hpp);
      const margin =
        sellingPrice > 0
          ? ((sellingPrice - hpp) / sellingPrice) * 100
          : null;

      return {
        id: e.id,
        productId: e.productId,
        productName: e.product.name,
        productIsActive: e.product.isActive,
        productSellingPrice: sellingPrice,
        hpp,
        margin,
        delta: deltaMap.get(e.id) ?? null,
        createdAt: e.createdAt.toISOString(),
      };
    }),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
    summary: {
      totalEntries,
      uniqueProducts,
      avgHpp,
    },
  };
}

// ============================================================
// Summary — agregat per produk
// ============================================================

export async function getCostHistorySummary() {
  const grouped = await prisma.productCostHistory.groupBy({
    by: ["productId"],
    _count: { _all: true },
    _min: { hpp: true },
    _max: { hpp: true },
    _avg: { hpp: true },
  });

  if (grouped.length === 0) {
    return { items: [] };
  }

  const productIds = grouped.map((g) => g.productId);

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      sellingPrice: true,
      isActive: true,
    },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Ambil latest HPP per produk
  const latestEntries = await Promise.all(
    productIds.map(async (pid) => {
      const latest = await prisma.productCostHistory.findFirst({
        where: { productId: pid },
        orderBy: { createdAt: "desc" },
        select: { hpp: true, createdAt: true },
      });
      return { productId: pid, latest };
    })
  );
  const latestMap = new Map(
    latestEntries.map((e) => [e.productId, e.latest])
  );

  const items = grouped
    .map((g) => {
      const product = productMap.get(g.productId);
      const latest = latestMap.get(g.productId);
      const latestHpp = latest ? Number(latest.hpp) : null;
      const sellingPrice = product ? Number(product.sellingPrice) : 0;
      const margin =
        latestHpp !== null && sellingPrice > 0
          ? ((sellingPrice - latestHpp) / sellingPrice) * 100
          : null;

      return {
        productId: g.productId,
        productName: product?.name ?? "Unknown",
        productIsActive: product?.isActive ?? false,
        sellingPrice,
        latestHpp,
        latestHppAt: latest?.createdAt.toISOString() ?? null,
        minHpp: Number(g._min.hpp ?? 0),
        maxHpp: Number(g._max.hpp ?? 0),
        avgHpp: Number(g._avg.hpp ?? 0),
        entryCount: g._count._all,
        margin,
      };
    })
    .sort((a, b) => a.productName.localeCompare(b.productName));

  return { items };
}