// ============================================================
// API: /api/barista-stock/available-products
// GET → daftar produk dengan stok pusat tersedia
// (untuk form restock barista)
// ============================================================

import { handleAuth, ok } from "@/lib/api-response";
import { getAvailableProducts } from "@/modules/barista-stock/barista-stock.service";

export const GET = handleAuth(async () => {
  const result = await getAvailableProducts();
  return ok(result);
});