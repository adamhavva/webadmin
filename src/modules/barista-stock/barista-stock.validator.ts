import { z } from "zod";

// ============================================================
// Restock — ambil stok dari FinishedProductBatch
// ============================================================

const restockItemSchema = z.object({
  productId: z.string().min(1, "Produk wajib dipilih"),
  quantity: z.coerce
    .number({ error: "Quantity harus berupa angka" })
    .int("Quantity harus bilangan bulat")
    .positive("Quantity harus lebih dari 0"),
});

export const restockBaristaSchema = z.object({
  baristaId: z.string().min(1, "Barista wajib dipilih"),
  items: z
    .array(restockItemSchema)
    .min(1, "Minimal 1 produk")
    .max(50, "Maksimal 50 produk"),
  note: z
    .string()
    .trim()
    .max(500, "Catatan maksimal 500 karakter")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// ============================================================
// Return — balik stok ke FinishedProductBatch
// ============================================================

export const returnBaristaStockSchema = restockBaristaSchema;

// ============================================================
// Adjust — koreksi manual
// ============================================================

export const adjustBaristaStockSchema = z.object({
  baristaId: z.string().min(1, "Barista wajib dipilih"),
  productId: z.string().min(1, "Produk wajib dipilih"),
  newQuantity: z.coerce
    .number({ error: "Quantity harus berupa angka" })
    .int("Quantity harus bilangan bulat")
    .nonnegative("Quantity tidak boleh negatif"),
  note: z
    .string()
    .trim()
    .max(500, "Catatan maksimal 500 karakter")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// ============================================================
// List query
// ============================================================

export const listBaristaStockQuerySchema = z.object({
  baristaId: z.string().optional(),
  search: z.string().trim().optional(),
  lowStockOnly: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? false : v === "true")),
});

// ============================================================
// Movements query
// ============================================================

export const listMovementsQuerySchema = z.object({
  baristaId: z.string().optional(),
  productId: z.string().optional(),
  type: z
    .enum([
      "all",
      "RESTOCK",
      "SOLD",
      "ADJUSTMENT",
      "RETURN",
      "WASTE",
    ])
    .default("all"),
  dateFrom: z
    .string()
    .optional()
    .refine(
      (v) => v === undefined || !isNaN(Date.parse(v)),
      "Format tanggal tidak valid"
    )
    .transform((v) => (v ? new Date(v) : undefined)),
  dateTo: z
    .string()
    .optional()
    .refine(
      (v) => v === undefined || !isNaN(Date.parse(v)),
      "Format tanggal tidak valid"
    )
    .transform((v) => (v ? new Date(v) : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================
// Types
// ============================================================

export type RestockBaristaInput = z.infer<typeof restockBaristaSchema>;
export type ReturnBaristaStockInput = z.infer<
  typeof returnBaristaStockSchema
>;
export type AdjustBaristaStockInput = z.infer<
  typeof adjustBaristaStockSchema
>;
export type ListBaristaStockQuery = z.infer<
  typeof listBaristaStockQuerySchema
>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;