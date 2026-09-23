import { z } from "zod";

// ============================================================
// Item schema
//
// Semua nilai dari FE sudah number murni (bukan string rupiah).
// Pakai z.coerce.number() supaya string angka tetap aman
// (jaring pengaman kalau FE kirim "150000").
// ============================================================

const restockItemSchema = z.object({
  inventoryItemId: z.string().min(1, "Bahan wajib dipilih"),
  quantity: z.coerce
    .number({ error: "Quantity harus berupa angka" })
    .positive("Quantity harus lebih dari 0"),
  totalCost: z.coerce
    .number({ error: "Total biaya harus berupa angka" })
    .nonnegative("Total biaya tidak boleh negatif"),
});

// ============================================================
// Create — terima single atau bulk
// ============================================================

export const createRestockSchema = z
  .union([
    // Single
    restockItemSchema.extend({
      supplierName: z
        .string()
        .trim()
        .max(100)
        .optional()
        .or(z.literal("").transform(() => undefined)),
    }),
    // Bulk
    z.object({
      supplierName: z
        .string()
        .trim()
        .max(100)
        .optional()
        .or(z.literal("").transform(() => undefined)),
      items: z
        .array(restockItemSchema)
        .min(1, "Minimal 1 baris")
        .max(50, "Maksimal 50 baris"),
    }),
  ])
  .transform((v) => {
    if ("items" in v) {
      return {
        supplierName: v.supplierName,
        items: v.items,
      };
    }
    return {
      supplierName: v.supplierName,
      items: [
        {
          inventoryItemId: v.inventoryItemId,
          quantity: v.quantity,
          totalCost: v.totalCost,
        },
      ],
    };
  });

// ============================================================
// List
// ============================================================

export const listRestockQuerySchema = z.object({
  inventoryItemId: z.string().optional(),
  search: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "VOIDED", "ALL"]).default("ACTIVE"),
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

export type CreateRestockInput = z.infer<typeof createRestockSchema>;
export type RestockItemInput = z.infer<typeof restockItemSchema>;
export type ListRestockQuery = z.infer<typeof listRestockQuerySchema>;