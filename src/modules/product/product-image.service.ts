import { randomUUID } from "crypto";
import {
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import { R2_BUCKET, publicUrlFor, r2 } from "@/lib/r2";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  type ProductImageResponse,
  type UpdateProductImageInput,
} from "./product-image.validator";

// ============================================================
// Constants
// ============================================================

/** Lebar/tinggi maksimal setelah resize (dalam pixel) */
const MAX_DIMENSION = 1600;

/** Kualitas output (0-100). 88 = bagus, tidak blur. */
const QUALITY = 88;

// ============================================================
// Helpers
// ============================================================

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

function buildKey(productId: string, ext: string): string {
  const uuid = randomUUID();
  return `products/${productId}/${uuid}.${ext}`;
}

/**
 * Kompres gambar pakai sharp:
 * - Resize kalau lebih besar dari MAX_DIMENSION (aspect ratio tetap)
 * - Convert ke WebP untuk kompresi optimal (kualitas QUALITY)
 * - Jangan sampai blur: pakai quality tinggi + tanpaEnlargement
 */
async function compressImage(
  inputBuffer: Buffer
): Promise<{ buffer: Buffer; mimeType: string; ext: string }> {
  try {
    const image = sharp(inputBuffer, { failOn: "none" });
    const metadata = await image.metadata();

    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    let pipeline = image.rotate(); // auto-rotate sesuai EXIF

    // Resize hanya kalau lebih besar dari batas
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Convert ke WebP (bagus untuk foto, size jauh lebih kecil dari JPEG/PNG
    // dengan kualitas yang tetap tajam)
    const output = await pipeline
      .webp({ quality: QUALITY, effort: 4 })
      .toBuffer();

    return {
      buffer: output,
      mimeType: "image/webp",
      ext: "webp",
    };
  } catch (err) {
    console.error("[SHARP COMPRESS ERROR]", err);
    throw ApiError.unprocessable(
      "Gagal memproses gambar. Coba file lain."
    );
  }
}

type ImageRecord = {
  id: string;
  productId: string;
  key: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

function serializeImage(image: ImageRecord): ProductImageResponse {
  return {
    id: image.id,
    productId: image.productId,
    key: image.key,
    url: image.url,
    fileName: image.fileName,
    fileSize: image.fileSize,
    mimeType: image.mimeType,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder,
    createdAt: image.createdAt.toISOString(),
    updatedAt: image.updatedAt.toISOString(),
  };
}

// ============================================================
// List
// ============================================================

export async function listProductImages(
  productId: string
): Promise<ProductImageResponse[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) throw ApiError.notFound("Product tidak ditemukan");

  const images = await prisma.productImage.findMany({
    where: { productId },
    orderBy: [
      { isPrimary: "desc" },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
  });

  return images.map(serializeImage);
}

// ============================================================
// Upload
// ============================================================

type UploadInput = {
  productId: string;
  file: File;
  isPrimary?: boolean;
};

export async function uploadProductImage(
  input: UploadInput
): Promise<ProductImageResponse> {
  const { productId, file, isPrimary } = input;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) throw ApiError.notFound("Product tidak ditemukan");

  if (!file || file.size === 0) {
    throw ApiError.unprocessable("File wajib diunggah");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw ApiError.unprocessable(
      `Ukuran file maksimal ${MAX_IMAGE_SIZE / 1024 / 1024} MB`
    );
  }
  if (
    !ALLOWED_IMAGE_TYPES.includes(
      file.type as (typeof ALLOWED_IMAGE_TYPES)[number]
    )
  ) {
    throw ApiError.unprocessable("Format harus JPG, PNG, atau WEBP");
  }

  // ---------- Kompres dulu ----------
  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const compressed = await compressImage(rawBuffer);

  const key = buildKey(productId, compressed.ext);
  const url = publicUrlFor(key);

  // ---------- Upload ke R2 ----------
  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: compressed.buffer,
        ContentType: compressed.mimeType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
  } catch (err) {
    console.error("[R2 UPLOAD ERROR]", err);
    throw ApiError.internal("Gagal mengunggah gambar ke storage");
  }

  // ---------- Simpan record ----------
  const image = await prisma.$transaction(async (tx) => {
    const existingCount = await tx.productImage.count({
      where: { productId },
    });

    const shouldBePrimary = isPrimary === true || existingCount === 0;

    if (shouldBePrimary) {
      await tx.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const maxSortOrder = await tx.productImage.aggregate({
      where: { productId },
      _max: { sortOrder: true },
    });

    return tx.productImage.create({
      data: {
        productId,
        key,
        url,
        fileName: file.name,
        fileSize: compressed.buffer.length,
        mimeType: compressed.mimeType,
        isPrimary: shouldBePrimary,
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
      },
    });
  });

  return serializeImage(image);
}

// ============================================================
// Update (isPrimary / sortOrder)
// ============================================================

export async function updateProductImage(
  productId: string,
  imageId: string,
  input: UpdateProductImageInput
): Promise<ProductImageResponse> {
  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
    select: { id: true, productId: true },
  });

  if (!image || image.productId !== productId) {
    throw ApiError.notFound("Gambar tidak ditemukan");
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (input.isPrimary === true) {
      await tx.productImage.updateMany({
        where: {
          productId,
          isPrimary: true,
          NOT: { id: imageId },
        },
        data: { isPrimary: false },
      });
    }

    const result = await tx.productImage.update({
      where: { id: imageId },
      data: {
        ...(input.isPrimary !== undefined && {
          isPrimary: input.isPrimary,
        }),
        ...(input.sortOrder !== undefined && {
          sortOrder: input.sortOrder,
        }),
      },
    });

    if (input.isPrimary === false) {
      const primaryCount = await tx.productImage.count({
        where: { productId, isPrimary: true },
      });
      if (primaryCount === 0) {
        return tx.productImage.update({
          where: { id: imageId },
          data: { isPrimary: true },
        });
      }
    }

    return result;
  });

  return serializeImage(updated);
}

// ============================================================
// Delete
// ============================================================

export async function deleteProductImage(
  productId: string,
  imageId: string
) {
  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
    select: {
      id: true,
      productId: true,
      key: true,
      isPrimary: true,
    },
  });

  if (!image || image.productId !== productId) {
    throw ApiError.notFound("Gambar tidak ditemukan");
  }

  // Hapus dari R2
  try {
    await r2.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: image.key,
      })
    );
  } catch (err) {
    console.error("[R2 DELETE ERROR]", err);
    // lanjut hapus record — anggap file sudah hilang
  }

  await prisma.$transaction(async (tx) => {
    await tx.productImage.delete({ where: { id: imageId } });

    if (image.isPrimary) {
      const nextImage = await tx.productImage.findFirst({
        where: { productId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });
      if (nextImage) {
        await tx.productImage.update({
          where: { id: nextImage.id },
          data: { isPrimary: true },
        });
      }
    }
  });

  return { success: true };
}