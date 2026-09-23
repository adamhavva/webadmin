import { z } from "zod";

// ============================================================
// Key regex: lowercase snake_case
// ============================================================

const KEY_REGEX = /^[a-z][a-z0-9_]{0,49}$/;

// ============================================================
// Create
// ============================================================

export const createSettingSchema = z
  .object({
    key: z
      .string()
      .min(1, "Key wajib diisi")
      .max(50, "Key maksimal 50 karakter")
      .regex(
        KEY_REGEX,
        "Key harus lowercase snake_case (contoh: tax, fee_barista)"
      ),
    name: z
      .string()
      .trim()
      .min(1, "Nama wajib diisi")
      .max(100, "Nama maksimal 100 karakter"),
    description: z
      .string()
      .trim()
      .max(500, "Deskripsi maksimal 500 karakter")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    type: z.enum(["PERCENTAGE", "NOMINAL"], {
      error: "Tipe wajib dipilih",
    }),
    value: z.coerce
      .number({ error: "Nilai harus berupa angka" })
      .nonnegative("Nilai tidak boleh negatif"),
    isActive: z.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0).default(0),
  })
  .refine(
    (data) => {
      if (data.type === "PERCENTAGE" && data.value > 100) {
        return false;
      }
      return true;
    },
    {
      message: "Persentase tidak boleh lebih dari 100%",
      path: ["value"],
    }
  );

// ============================================================
// Update — key tidak bisa diubah
// ============================================================

export const updateSettingSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Nama wajib diisi")
      .max(100, "Nama maksimal 100 karakter")
      .optional(),
    description: z
      .string()
      .trim()
      .max(500)
      .optional()
      .or(z.literal("").transform(() => undefined))
      .nullable(),
    type: z.enum(["PERCENTAGE", "NOMINAL"]).optional(),
    value: z.coerce.number().nonnegative().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  })
  .refine(
    (data) => {
      if (
        data.type === "PERCENTAGE" &&
        data.value !== undefined &&
        data.value > 100
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Persentase tidak boleh lebih dari 100%",
      path: ["value"],
    }
  );

// ============================================================
// List
// ============================================================

export const listSettingQuerySchema = z.object({
  search: z.string().trim().optional(),
  isActive: z.enum(["all", "true", "false"]).default("all"),
  type: z.enum(["all", "PERCENTAGE", "NOMINAL"]).default("all"),
});

// ============================================================
// Types
// ============================================================

export type CreateSettingInput = z.infer<typeof createSettingSchema>;
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
export type ListSettingQuery = z.infer<typeof listSettingQuerySchema>;