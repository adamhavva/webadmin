// ============================================================
// API: GET /api/products
// List products with pagination
// ============================================================

import { handle, ok } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export const GET = handle(async (req: Request) => {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));
  const search = url.searchParams.get('search');
  const category = url.searchParams.get('category');
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = { isActive: true };
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }
  if (category && category !== 'All') {
    // Filter by category stored in metadata
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        images: true,
        metadata: true,
      },
    }),
  ]);

  // Get stock aggregates per product
  const productIds = products.map(p => p.id);
  const stocks = await prisma.baristaStock.groupBy({
    by: ['productId'],
    where: { productId: { in: productIds } },
    _sum: { quantity: true },
  });
  const stockMap = new Map(stocks.map(s => [s.productId, s._sum.quantity ?? 0]));

  // Map products with full image list and metadata
  const items = products.map(p => {
    const metaMap = new Map(p.metadata.map(m => [m.key, m.value]));
    return {
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      sellingPrice: Number(p.sellingPrice),
      images: p.images.map(img => img.url),
      imageUrl: p.images.find(img => img.isPrimary)?.url ?? p.images[0]?.url ?? null,
      category: metaMap.get('category') ?? metaMap.get('type') ?? 'Lainnya',
      metadata: Object.fromEntries(metaMap),
      totalStock: stockMap.get(p.id) ?? 0,
    };
  });

  // Filter by category after mapping (since category is in metadata)
  const filtered = category && category !== 'All'
    ? items.filter(i => i.category === category)
    : items;

  return ok({
    items: filtered,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});
