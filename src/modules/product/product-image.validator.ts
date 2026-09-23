import { z } from "zod";

// Batas ukuran file: 5 MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const updateProductImageSchema = z.object({
  isPrimary: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export type UpdateProductImageInput = z.infer<
  typeof updateProductImageSchema
>;

/**
 * Bentuk response image.
 * `url` adalah public URL permanen.
 */
export type ProductImageResponse = {
  id: string;
  productId: string;
  key: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};