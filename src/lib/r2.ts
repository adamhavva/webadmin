// ============================================================
// CLOUDFLARE R2 CLIENT
//
// R2 = S3-compatible. Pakai AWS SDK v3.
//
// Bucket diakses via custom domain (PUBLIC).
//
// Struktur R2:
//   ascend-product-images/
//   └── products/
//       └── {productId}/
//           ├── {uuid}.jpg
//           └── {uuid}.png
//
// Public URL:
//   https://adamhavva.com/products/{productId}/{uuid}.{ext}
// ============================================================

import { S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.R2_PUBLIC_URL;

if (!accountId) {
  throw new Error("R2_ACCOUNT_ID belum diset di environment");
}
if (!accessKeyId || !secretAccessKey) {
  throw new Error(
    "R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY belum diset"
  );
}
if (!bucketName) {
  throw new Error("R2_BUCKET_NAME belum diset");
}
if (!publicUrl) {
  throw new Error("R2_PUBLIC_URL belum diset");
}

export const R2_BUCKET = bucketName;
export const R2_PUBLIC_BASE = publicUrl.replace(/\/+$/, "");

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Susun URL publik dari key.
 *
 * Contoh:
 *   key = "products/abc/uuid.jpg"
 *   → "https://adamhavva.com/products/abc/uuid.jpg"
 */
export function publicUrlFor(key: string): string {
  const cleanKey = key.replace(/^\/+/, "");
  return `${R2_PUBLIC_BASE}/${cleanKey}`;
}