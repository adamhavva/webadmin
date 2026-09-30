import "dotenv/config";
import { prisma } from "../src/lib/db";

// ============================================================
// CONFIG - Kopi 1 Seed
// ============================================================

const PRODUCT_NAME = "Kopi 1";
const OUTPUT_QUANTITY = 20; // bikin 20 kopi jadi

// Inventory items untuk Kopi 1 (recipe)
const INVENTORY_ITEMS = [
  { name: "Kopi Bubuk", unit: "GR" as const, quantity: 100, unitCost: 200 }, // 100gr x 200/gr = 20rb
  { name: "Gula Pasir", unit: "GR" as const, quantity: 50, unitCost: 150 }, // 50gr x 150/gr = 7.5rb
  { name: "Krimer", unit: "ML" as const, quantity: 30, unitCost: 100 }, // 30ml x 100/ml = 3rb
];

// ============================================================
// HELPER
// ============================================================

function generateBatchCode(prefix: string): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${dateStr}-${random}`;
}

// ============================================================
// SEED
// ============================================================

async function main() {
  console.log("");
  console.log("========================================");
  console.log("       ASCEND KOPI SEEDER");
  console.log("========================================");

  // 1. Get all baristas
  console.log("\n[1/6] Fetching baristas...");
  const baristas = await prisma.user.findMany({
    where: { role: "BARISTA", status: "ACTIVE" },
    select: { id: true, name: true },
  });

  if (baristas.length === 0) {
    console.log("  ⚠️  No active baristas found. Creating sample baristas...");
    // Create sample baristas
    const sampleBaristas = [
      { firebaseUid: "barista-001", name: "Barista 1", phone: "081234567801" },
      { firebaseUid: "barista-002", name: "Barista 2", phone: "081234567802" },
      { firebaseUid: "barista-003", name: "Barista 3", phone: "081234567803" },
    ];

    for (const barista of sampleBaristas) {
      await prisma.user.upsert({
        where: { firebaseUid: barista.firebaseUid },
        update: {},
        create: {
          firebaseUid: barista.firebaseUid,
          name: barista.name,
          phone: barista.phone,
          role: "BARISTA",
          status: "ACTIVE",
        },
      });
    }

    const newBaristas = await prisma.user.findMany({
      where: { role: "BARISTA", status: "ACTIVE" },
      select: { id: true, name: true },
    });
    baristas.push(...newBaristas);
  }

  console.log(`  ✓ Found ${baristas.length} baristas`);
  for (const b of baristas) {
    console.log(`    - ${b.name} (${b.id.slice(0, 8)}...)`);
  }

  // 2. Create Inventory Items
  console.log("\n[2/6] Creating inventory items...");
  const inventoryItems: Awaited<ReturnType<typeof prisma.inventoryItem.create>>[] = [];

  for (const item of INVENTORY_ITEMS) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { name: item.name, unit: item.unit },
    });

    if (existing) {
      console.log(`  ✓ Already exists: ${item.name}`);
      inventoryItems.push(existing);
    } else {
      const created = await prisma.inventoryItem.create({
        data: {
          name: item.name,
          unit: item.unit,
          isActive: true,
        },
      });
      console.log(`  ✓ Created: ${item.name} (${item.unit})`);
      inventoryItems.push(created);
    }
  }

  // 3. Create Inventory Batches (Restock)
  console.log("\n[3/6] Creating inventory batches...");
  const batches: Awaited<ReturnType<typeof prisma.inventoryBatch.create>>[] = [];

  for (let i = 0; i < inventoryItems.length; i++) {
    const item = inventoryItems[i];
    const config = INVENTORY_ITEMS[i];

    // Buy more than needed for production
    const purchaseQty = config.quantity * 10; // 10x production batch
    const totalCost = purchaseQty * config.unitCost;

    const batch = await prisma.inventoryBatch.create({
      data: {
        inventoryItemId: item.id,
        batchCode: generateBatchCode("BATCH"),
        sourceType: "RESTOCK",
        quantity: purchaseQty, // Prisma 7 accepts numbers
        remainingQuantity: purchaseQty,
        unitCost: config.unitCost,
        totalCost: totalCost,
        restock: {
          create: {
            inventoryItemId: item.id,
            quantity: purchaseQty,
            unitCost: config.unitCost,
            totalCost: totalCost,
            supplierName: "Supplier Lokal",
            status: "ACTIVE",
          },
        },
      },
      include: { restock: true },
    });

    console.log(
      `  ✓ Batch ${batch.batchCode}: ${purchaseQty}${config.unit} ${item.name}`,
    );
    batches.push(batch);
  }

  // 4. Create Product (Kopi 1)
  console.log("\n[4/6] Creating product...");
  const product = await prisma.product.upsert({
    where: { id: "kopi-1" }, // deterministic ID
    update: {},
    create: {
      id: "kopi-1",
      name: PRODUCT_NAME,
      sellingPrice: 25000, // Rp 25.000
      description: "Kopi klasik dengan rasa khas",
      isActive: true,
    },
  });
  console.log(`  ✓ Product: ${product.name} @ Rp ${product.sellingPrice}`);

  // 5. Create Recipe & Recipe Items
  console.log("\n[5/6] Creating recipe...");
  const recipe = await prisma.productRecipe.upsert({
    where: { productId_version: { productId: product.id, version: 1 } },
    update: {},
    create: {
      productId: product.id,
      version: 1,
      isActive: true,
      items: {
        create: INVENTORY_ITEMS.map((item, i) => ({
          inventoryItemId: inventoryItems[i].id,
          quantity: item.quantity,
        })),
      },
    },
    include: { items: true },
  });
  console.log(`  ✓ Recipe v${recipe.version} created with ${recipe.items.length} items`);
  for (const ri of recipe.items) {
    const invItem = inventoryItems.find((ii) => ii.id === ri.inventoryItemId);
    console.log(`    - ${invItem?.name}: ${ri.quantity} ${invItem?.unit}`);
  }

  // 6. Create Production -> Finished Product Batch
  console.log("\n[6/6] Creating production...");
  const totalProductionCost = INVENTORY_ITEMS.reduce(
    (sum, item, i) => sum + item.quantity * item.unitCost,
    0,
  );
  const unitCost = totalProductionCost / OUTPUT_QUANTITY;

  const production = await prisma.production.create({
    data: {
      productId: product.id,
      outputQuantity: OUTPUT_QUANTITY,
      totalCost: totalProductionCost,
      unitCost: unitCost,
      components: {
        create: INVENTORY_ITEMS.map((item, i) => ({
          inventoryItemId: inventoryItems[i].id,
          inventoryBatchId: batches[i].id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unitCost: item.unitCost,
          totalCost: item.quantity * item.unitCost,
        })),
      },
      finishedProductBatch: {
        create: {
          productId: product.id,
          batchCode: generateBatchCode("FP"),
          quantity: OUTPUT_QUANTITY,
          remainingQuantity: OUTPUT_QUANTITY,
          unitCost: unitCost,
          totalCost: totalProductionCost,
        },
      },
    },
    include: {
      components: true,
      finishedProductBatch: true,
    },
  });

  console.log(`  ✓ Production created: ${OUTPUT_QUANTITY} units`);
  console.log(
    `  ✓ Finished Batch: ${production.finishedProductBatch.batchCode}`,
  );
  console.log(
    `  ✓ Unit Cost: Rp ${unitCost.toLocaleString()} per Kopi 1`,
  );

  // 7. Assign 10 stock to each barista
  console.log("\n[7/6] Assigning stock to baristas (10 each)...");
  const finishedBatch = production.finishedProductBatch;

  for (const barista of baristas) {
    // Upsert BaristaRestock
    const restock = await prisma.baristaRestock.create({
      data: {
        baristaId: barista.id,
        totalItems: 10,
        note: "Initial stock from seed",
        items: {
          create: {
            productId: product.id,
            finishedBatchId: finishedBatch.id,
            quantity: 10,
            unitCost: unitCost,
          },
        },
      },
      include: { items: true },
    });

    // Create BaristaStock entry
    const existingStock = await prisma.baristaStock.findUnique({
      where: {
        baristaId_productId: {
          baristaId: barista.id,
          productId: product.id,
        },
      },
    });

    if (existingStock) {
      await prisma.baristaStock.update({
        where: { id: existingStock.id },
        data: {
          quantity: 10,
          lastRestockAt: new Date(),
        },
      });
    } else {
      await prisma.baristaStock.create({
        data: {
          baristaId: barista.id,
          productId: product.id,
          quantity: 10,
          minThreshold: 3,
          lastRestockAt: new Date(),
        },
      });
    }

    // Record movement
    await prisma.baristaStockMovement.create({
      data: {
        baristaId: barista.id,
        productId: product.id,
        type: "RESTOCK",
        quantity: 10,
        balanceAfter: 10,
        baristaRestockId: restock.id,
        note: "Initial stock from seeder",
      },
    });

    console.log(
      `  ✓ ${barista.name}: 10x ${product.name} (Batch: ${finishedBatch.batchCode})`,
    );
  }

  // Summary
  console.log("\n========================================");
  console.log("           SEED BERHASIL");
  console.log("========================================");
  console.log("");
  console.log("SUMMARY:");
  console.log(`  Product: ${product.name}`);
  console.log(`  Recipe: v${recipe.version}`);
  console.log(`  Production: ${OUTPUT_QUANTITY} units`);
  console.log(`  HPP: Rp ${unitCost.toLocaleString()}`);
  console.log(`  Selling Price: Rp ${product.sellingPrice}`);
  console.log(`  Profit/Unit: Rp ${(Number(product.sellingPrice) - unitCost).toLocaleString()}`);
  console.log(`  Baristas Stocked: ${baristas.length} baristas x 10 units`);
  console.log("");
}

// ============================================================
// RUN
// ============================================================

main()
  .catch((error) => {
    console.error("");
    console.error("========================================");
    console.error("             SEED GAGAL");
    console.error("========================================");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
