/**
 * ASCEND Multi Products Seeder
 *
 * Adds variety of coffee products for testing
 *
 * Usage:
 *   npx tsx scripts/seed-products.ts
 */

import "dotenv/config";
import { prisma } from "../src/lib/db";

// ============================================================
// COFFEE PRODUCTS
// ============================================================

const PRODUCTS = [
  {
    id: "americano",
    name: "Americano",
    price: 25000,
    description: "Espresso dengan air panas",
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    price: 30000,
    description: "Espresso dengan steamed milk dan foam",
  },
  {
    id: "latte",
    name: "Latte",
    price: 28000,
    description: "Espresso dengan steamed milk",
  },
  {
    id: "espresso",
    name: "Espresso",
    price: 20000,
    description: "Kopi murni 30ml",
  },
  {
    id: "mocha",
    name: "Mocha",
    price: 35000,
    description: "Espresso dengan coklat dan steamed milk",
  },
  {
    id: "matcha-latte",
    name: "Matcha Latte",
    price: 32000,
    description: "Matcha dengan steamed milk",
  },
  {
    id: "kopi-susu",
    name: "Kopi Susu",
    price: 22000,
    description: "Kopi dengan susu dan gula aren",
  },
  {
    id: "v60",
    name: "V60",
    price: 35000,
    description: "Pour over V60 single origin",
  },
];

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("");
  console.log("========================================");
  console.log("    ASCEND PRODUCTS SEEDER");
  console.log("========================================");

  let created = 0;
  let skipped = 0;

  for (const product of PRODUCTS) {
    const existing = await prisma.product.findUnique({
      where: { id: product.id },
    });

    if (existing) {
      console.log(`  ⏭ Skipping: ${product.name} (already exists)`);
      skipped++;
      continue;
    }

    const createdProduct = await prisma.product.create({
      data: {
        id: product.id,
        name: product.name,
        sellingPrice: product.price,
        description: product.description,
        isActive: true,
      },
    });

    console.log(`  ✅ Created: ${createdProduct.name} @ Rp ${createdProduct.sellingPrice}`);
    created++;
  }

  console.log("");
  console.log("========================================");
  console.log(`  Total created: ${created}`);
  console.log(`  Total skipped: ${skipped}`);
  console.log("========================================");

  // Show all products
  const allProducts = await prisma.product.findMany({
    select: { id: true, name: true, sellingPrice: true, isActive: true },
    orderBy: { name: "asc" },
  });

  console.log("\n📋 All Products:");
  for (const p of allProducts) {
    const status = p.isActive ? "🟢" : "⚪";
    console.log(`  ${status} ${p.name} - Rp ${p.sellingPrice}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
