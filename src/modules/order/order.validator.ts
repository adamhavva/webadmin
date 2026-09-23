import { z } from "zod";

// ============================================================
// Item schema
// ============================================================

const orderItemInputSchema = z.object({
  productId: z.string().min(1, "Produk wajib dipilih"),
  quantity: z.coerce
    .number({ error: "Quantity harus berupa angka" })
    .int("Quantity harus bilangan bulat")
    .positive("Quantity harus lebih dari 0"),
  notes: z
    .string()
    .trim()
    .max(500, "Catatan maksimal 500 karakter")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// ============================================================
// Create Order
// ============================================================

export const createOrderSchema = z.object({
  channel: z.enum(["ONLINE", "OFFLINE"]).default("ONLINE"),

  // Customer (nullable — diisi otomatis kalau role CUSTOMER)
  customerId: z.string().optional(),

  // Snapshot customer (wajib)
  customerName: z
    .string()
    .trim()
    .min(1, "Nama customer wajib diisi")
    .max(100, "Nama maksimal 100 karakter"),
  customerPhone: z
    .string()
    .trim()
    .min(1, "No HP wajib diisi")
    .max(30, "No HP maksimal 30 karakter"),

  // Alamat (wajib untuk ONLINE)
  deliveryAddress: z
    .string()
    .trim()
    .max(500, "Alamat maksimal 500 karakter")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  deliveryLatitude: z.coerce.number().optional(),
  deliveryLongitude: z.coerce.number().optional(),
  deliveryNote: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),

  // Items
  items: z
    .array(orderItemInputSchema)
    .min(1, "Minimal 1 produk")
    .max(30, "Maksimal 30 produk"),

  // Payment (kode method dari PaymentMethodConfig)
  paymentMethodCode: z
    .string()
    .min(1, "Metode pembayaran wajib dipilih")
    .default("CASH"),
});

// ============================================================
// Preview Order
// ============================================================

export const previewOrderSchema = z.object({
  items: z
    .array(orderItemInputSchema)
    .min(1, "Minimal 1 produk")
    .max(30, "Maksimal 30 produk"),
  paymentMethodCode: z
    .string()
    .min(1, "Metode pembayaran wajib dipilih")
    .default("CASH"),
});

// ============================================================
// Update Status
// ============================================================

export const updateOrderStatusSchema = z.object({
  status: z.enum(["DELIVERING", "ARRIVED"]),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// ============================================================
// Reject
// ============================================================

export const rejectOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// ============================================================
// Cancel
// ============================================================

export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Alasan wajib diisi")
    .max(500, "Alasan maksimal 500 karakter"),
});

// ============================================================
// Complete
// ============================================================

export const completeOrderSchema = z.object({
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// ============================================================
// List query
// ============================================================

export const listOrderQuerySchema = z.object({
  customerId: z.string().optional(),
  baristaId: z.string().optional(),
  status: z
    .enum([
      "all",
      "PENDING",
      "SEARCHING",
      "ASSIGNED",
      "ACCEPTED",
      "DELIVERING",
      "ARRIVED",
      "COMPLETED",
      "CANCELLED",
      "FAILED",
    ])
    .default("all"),
  channel: z.enum(["all", "ONLINE", "OFFLINE"]).default("all"),
  search: z.string().trim().optional(),
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

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type PreviewOrderInput = z.infer<typeof previewOrderSchema>;
export type UpdateOrderStatusInput = z.infer<
  typeof updateOrderStatusSchema
>;
export type RejectOrderInput = z.infer<typeof rejectOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type CompleteOrderInput = z.infer<typeof completeOrderSchema>;
export type ListOrderQuery = z.infer<typeof listOrderQuerySchema>;