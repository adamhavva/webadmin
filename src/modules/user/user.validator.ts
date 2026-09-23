import { z } from "zod";

const PHONE_REGEX = /^\+62\d{8,13}$/;
const KTP_REGEX = /^\d{16}$/;

const BASE64_IMAGE_REGEX =
  /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_AVATAR_LENGTH = 1_500_000;

export const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_SYMBOL_REGEX = /[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?~`]/;

export const passwordRules = {
  minLength: (v: string) => v.length >= PASSWORD_MIN_LENGTH,
  hasNumber: (v: string) => /\d/.test(v),
  hasUpper: (v: string) => /[A-Z]/.test(v),
  hasSymbol: (v: string) => PASSWORD_SYMBOL_REGEX.test(v),
};

const dateStringSchema = z
  .string()
  .refine((v) => !isNaN(Date.parse(v)), "Format tanggal tidak valid");

// ============================================================
// SELF
// ============================================================

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    phone: z
      .string()
      .trim()
      .regex(PHONE_REGEX, "Format nomor: +62xxxxxxxxx (8-13 digit)")
      .nullable()
      .optional(),
    address: z.string().trim().max(300).nullable().optional(),
    avatarUrl: z
      .string()
      .nullable()
      .optional()
      .refine(
        (v) =>
          v === null ||
          v === undefined ||
          (BASE64_IMAGE_REGEX.test(v) && v.length <= MAX_AVATAR_LENGTH),
        { message: "Format gambar tidak valid (png/jpg/webp, max ~1MB)" }
      ),
    idNumber: z
      .string()
      .trim()
      .regex(KTP_REGEX, "No KTP harus 16 digit angka")
      .nullable()
      .optional(),
    birthDate: dateStringSchema.nullable().optional(),
    joinDate: dateStringSchema.nullable().optional(),
    addressKtp: z.string().trim().max(300).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Tidak ada field yang diubah",
  });

export const updatePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(
        PASSWORD_MIN_LENGTH,
        `Password minimal ${PASSWORD_MIN_LENGTH} karakter`
      )
      .max(72)
      .refine(passwordRules.hasNumber, "Password harus ada minimal 1 angka")
      .refine(
        passwordRules.hasUpper,
        "Password harus ada minimal 1 huruf besar"
      )
      .refine(
        passwordRules.hasSymbol,
        "Password harus ada minimal 1 simbol"
      ),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

// ============================================================
// ADMIN OPERATIONS
// ============================================================

const roleSchema = z.enum(["ADMIN", "BARISTA", "CUSTOMER"]);

export const createUserSchema = z.object({
  email: z.string().trim().email("Format email tidak valid").max(200),
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `Password minimal ${PASSWORD_MIN_LENGTH} karakter`
    )
    .max(72)
    .refine(passwordRules.hasNumber, "Password harus ada minimal 1 angka")
    .refine(
      passwordRules.hasUpper,
      "Password harus ada minimal 1 huruf besar"
    )
    .refine(
      passwordRules.hasSymbol,
      "Password harus ada minimal 1 simbol"
    ),
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  role: roleSchema,
  phone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, "Format nomor: +62xxxxxxxxx")
    .nullable()
    .optional(),
  address: z.string().trim().max(300).nullable().optional(),
  idNumber: z
    .string()
    .trim()
    .regex(KTP_REGEX, "No KTP harus 16 digit")
    .nullable()
    .optional(),
  birthDate: dateStringSchema.nullable().optional(),
  joinDate: dateStringSchema.nullable().optional(),
  addressKtp: z.string().trim().max(300).nullable().optional(),
});

export const updateUserByAdminSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    phone: z
      .string()
      .trim()
      .regex(PHONE_REGEX, "Format nomor: +62xxxxxxxxx")
      .nullable()
      .optional(),
    address: z.string().trim().max(300).nullable().optional(),
    role: roleSchema.optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    idNumber: z
      .string()
      .trim()
      .regex(KTP_REGEX, "No KTP harus 16 digit")
      .nullable()
      .optional(),
    birthDate: dateStringSchema.nullable().optional(),
    joinDate: dateStringSchema.nullable().optional(),
    addressKtp: z.string().trim().max(300).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Tidak ada field yang diubah",
  });

export const resetUserPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `Password minimal ${PASSWORD_MIN_LENGTH} karakter`
    )
    .max(72)
    .refine(passwordRules.hasNumber, "Password harus ada minimal 1 angka")
    .refine(
      passwordRules.hasUpper,
      "Password harus ada minimal 1 huruf besar"
    )
    .refine(
      passwordRules.hasSymbol,
      "Password harus ada minimal 1 simbol"
    ),
});

export const listUsersQuerySchema = z.object({
  search: z.string().trim().optional(),
  // managed = BARISTA + CUSTOMER, admin = ADMIN, all = semua
  roleGroup: z.enum(["managed", "admin", "all"]).default("managed"),
  // Override: kalau diisi, roleGroup diabaikan
  role: roleSchema.optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserByAdminInput = z.infer<typeof updateUserByAdminSchema>;
export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;