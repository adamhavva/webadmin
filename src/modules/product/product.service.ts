import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type { Prisma } from "../../../prisma/generated/client";
import type {
  CreateProductInput,
  ListProductQuery,
  UpdateProductInput,
} from "./product.validator";

// ============================================================
// List
// ============================================================

export async function listProducts(query: ListProductQuery) {
  const where: Prisma.ProductWhereInput = {};

  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: query.limit,
      select: {
        id: true,
        name: true,
        description: true,
        sellingPrice: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 1,
          select: {
            id: true,
            url: true,
            isPrimary: true,
          },
        },
        recipes: {
          where: { isActive: true },
          take: 1,
          select: { id: true, version: true },
        },
        _count: {
          select: {
            recipes: true,
            images: true,
            metadata: true,
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  // HPP terakhir per product
  const productIds = items.map((p) => p.id);
  const latestHppMap = new Map<string, number>();

  if (productIds.length > 0) {
    const histories = await prisma.productCostHistory.findMany({
      where: { productId: { in: productIds } },
      orderBy: { createdAt: "desc" },
      distinct: ["productId"],
      select: { productId: true, hpp: true },
    });
    for (const h of histories) {
      latestHppMap.set(h.productId, Number(h.hpp));
    }
  }

  // Total stok product jadi
  const stockMap = new Map<string, number>();
  if (productIds.length > 0) {
    const stocks = await prisma.finishedProductBatch.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds } },
      _sum: { remainingQuantity: true },
    });
    for (const s of stocks) {
      stockMap.set(s.productId, Number(s._sum.remainingQuantity ?? 0));
    }
  }

  return {
    items: items.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      sellingPrice: p.sellingPrice,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      primaryImage: p.images[0] ?? null,
      imageCount: p._count.images,
      metadataCount: p._count.metadata,
      activeRecipe: p.recipes[0] ?? null,
      recipeCount: p._count.recipes,
      lastHpp: latestHppMap.get(p.id) ?? null,
      totalStock: stockMap.get(p.id) ?? 0,
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
// Detail
// ============================================================

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      sellingPrice: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      recipes: {
        orderBy: { version: "desc" },
        select: {
          id: true,
          version: true,
          isActive: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              quantity: true,
              inventoryItem: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  isActive: true,
                },
              },
            },
          },
        },
      },
      costHistories: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, hpp: true, createdAt: true },
      },
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        select: {
          id: true,
          key: true,
          url: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          isPrimary: true,
          sortOrder: true,
          createdAt: true,
        },
      },
      metadata: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          key: true,
          value: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      _count: {
        select: { productions: true, finishedProductBatches: true },
      },
    },
  });

  if (!product) {
    throw ApiError.notFound("Product tidak ditemukan");
  }

  const stockAgg = await prisma.finishedProductBatch.aggregate({
    where: { productId: id },
    _sum: { remainingQuantity: true },
  });

  return {
    ...product,
    totalStock: Number(stockAgg._sum.remainingQuantity ?? 0),
  };
}

// ============================================================
// Create
// ============================================================

export async function createProduct(input: CreateProductInput) {
  const existing = await prisma.product.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" } },
    select: { id: true },
  });

  if (existing) {
    throw ApiError.conflict(`Produk "${input.name}" sudah ada`);
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        sellingPrice: input.sellingPrice,
        isActive: input.isActive,
      },
    });

    // Simpan metadata (kalau ada)
    if (input.metadata && input.metadata.length > 0) {
      await tx.productMetadata.createMany({
        data: input.metadata.map((m, i) => ({
          productId: product.id,
          key: m.key,
          value: m.value,
          sortOrder: i,
        })),
      });
    }

    // Return full product
    return tx.product.findUniqueOrThrow({
      where: { id: product.id },
      select: {
        id: true,
        name: true,
        description: true,
        sellingPrice: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        metadata: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            key: true,
            value: true,
            sortOrder: true,
          },
        },
      },
    });
  });
}

// ============================================================
// Update
// ============================================================

export async function updateProduct(
  id: string,
  input: UpdateProductInput
) {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw ApiError.notFound("Product tidak ditemukan");
  }

  if (input.name) {
    const dup = await prisma.product.findFirst({
      where: {
        name: { equals: input.name, mode: "insensitive" },
        NOT: { id },
      },
      select: { id: true },
    });

    if (dup) {
      throw ApiError.conflict(`Produk "${input.name}" sudah ada`);
    }
  }

  return prisma.$transaction(async (tx) => {
    // Update product fields
    await tx.product.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.sellingPrice !== undefined && {
          sellingPrice: input.sellingPrice,
        }),
        ...(input.isActive !== undefined && {
          isActive: input.isActive,
        }),
      },
    });

    // Update metadata (replace strategy) kalau field-nya dikirim
    if (input.metadata !== undefined) {
      await tx.productMetadata.deleteMany({
        where: { productId: id },
      });

      if (input.metadata.length > 0) {
        await tx.productMetadata.createMany({
          data: input.metadata.map((m, i) => ({
            productId: id,
            key: m.key,
            value: m.value,
            sortOrder: i,
          })),
        });
      }
    }

    return tx.product.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        sellingPrice: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        metadata: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            key: true,
            value: true,
            sortOrder: true,
          },
        },
      },
    });
  });
}

// ============================================================
// Soft delete
// ============================================================

export async function deactivateProduct(id: string) {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw ApiError.notFound("Product tidak ditemukan");
  }

  return prisma.product.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      name: true,
      sellingPrice: true,
      isActive: true,
      updatedAt: true,
    },
  });
}