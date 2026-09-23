-- ============================================================
-- Self-healing migration: hanya satu recipe aktif per product
--
-- Step 1: Kalau ada product yang punya >1 recipe aktif,
--         non-aktifkan semua kecuali yang paling baru (version tertinggi).
-- Step 2: Buat partial unique index.
-- ============================================================

WITH ranked AS (
  SELECT
    id,
    "productId",
    ROW_NUMBER() OVER (
      PARTITION BY "productId"
      ORDER BY version DESC, "createdAt" DESC
    ) AS rn
  FROM "ProductRecipe"
  WHERE "isActive" = true
)
UPDATE "ProductRecipe" pr
SET "isActive" = false
FROM ranked
WHERE pr.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX "unique_active_recipe_per_product"
ON "ProductRecipe" ("productId")
WHERE "isActive" = true;