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

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;