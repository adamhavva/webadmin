// ============================================================
// API: GET /api/products/[id]
// Get single product by ID
// ============================================================

import { handle, ok } from '@/lib/api-response';
import { ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/db';

export const GET = handle(async (_req: Request, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { isPrimary: 'desc' } },
      metadata: true,
      recipes: {
        where: { isActive: true },
        include: { items: { include: { inventoryItem: true } } },
      },
    },
  });

  if (!product) throw ApiError.notFound('Produk tidak ditemukan');

  const metaMap = new Map(product.metadata.map(m => [m.key, m.value]));
  const stock = await prisma.baristaStock.aggregate({
    where: { productId: id },
    _sum: { quantity: true },
  });

  return ok({
    id: product.id,
    name: product.name,
    description: product.description ?? '',
    sellingPrice: Number(product.sellingPrice),
    images: product.images.map(img => ({ url: img.url, isPrimary: img.isPrimary })),
    metadata: Object.fromEntries(metaMap),
    recipes: product.recipes.map(r => ({
      id: r.id,
      version: r.version,
      items: r.items.map(i => ({
        inventoryItemId: i.inventoryItemId,
        inventoryItemName: i.inventoryItem.name,
        quantity: Number(i.quantity),
      })),
    })),
    totalStock: stock._sum.quantity ?? 0,
  });
});
