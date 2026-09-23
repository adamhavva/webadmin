/**
 * Seed 3 test orders (2 CASH + 1 QRIS) — full complete flow.
 *
 * Jalankan:
 *   npx tsx scripts/seed-orders.ts
 *
 * Butuh di .env:
 *   - DATABASE_URL
 *   - Firebase config (NEXT_PUBLIC_FIREBASE_*)
 *   - serviceAccount.json di root
 */

import "dotenv/config";

import { prisma } from "../src/lib/db";
import { adminDatabase } from "../src/lib/firebases/firebase-admin";
import {
  createOrder,
  assignOrderToBaristas,
  acceptOrder,
  updateOrderStatus,
  completeOrder,
} from "../src/modules/order/order.service";

// ============================================================
// Config
// ============================================================

const TEST_PREFIX = "TEST_";
const CUSTOMER_LAT = -6.2;
const CUSTOMER_LNG = 106.8;

type OrderSpec = {
  name: string;
  phone: string;
  address: string;
  qty: number;
  method: "CASH" | "QRIS";
};

const ORDERS: OrderSpec[] = [
  {
    name: "TEST_Budi",
    phone: "08111111111",
    address: "Jl. Test No. 1, Jakarta",
    qty: 2,
    method: "CASH",
  },
  {
    name: "TEST_Andi",
    phone: "08222222222",
    address: "Jl. Test No. 2, Jakarta",
    qty: 1,
    method: "QRIS",
  },
  {
    name: "TEST_Cici",
    phone: "08333333333",
    address: "Jl. Test No. 3, Jakarta",
    qty: 3,
    method: "CASH",
  },
];

// ============================================================
// Logging helpers
// ============================================================

const log = (msg: string) => console.log(msg);
const ok = (msg: string) => console.log(`   ✅ ${msg}`);
const info = (msg: string) => console.log(`   ℹ️  ${msg}`);
const warn = (msg: string) => console.log(`   ⚠️  ${msg}`);

// ============================================================
// Force assign (fallback kalau Firebase tidak tersedia)
// ============================================================

async function forceAssign(
  orderId: string,
  baristaId: string,
  distanceKm = 0.1
) {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "ASSIGNED",
      baristaId,
      assignedAt: new Date(),
      distanceKm,
    },
  });

  await prisma.orderStatusHistory.create({
    data: {
      orderId,
      status: "ASSIGNED",
      note: "Force-assigned to barista (test script)",
    },
  });
}

// ============================================================
// Cleanup previous test orders
// ============================================================

async function cleanupPreviousTestOrders() {
  log("\n🧹 Cleaning up previous test orders...");

  const testOrders = await prisma.order.findMany({
    where: { customerName: { startsWith: TEST_PREFIX } },
    select: { id: true },
  });

  if (testOrders.length === 0) {
    ok("No previous test orders");
    return;
  }

  const ids = testOrders.map((o) => o.id);

  // Cleanup child tables (defensive — cascade handles most)
  await prisma.orderCharge.deleteMany({
    where: { orderId: { in: ids } },
  });
  await prisma.orderItem.deleteMany({
    where: { orderId: { in: ids } },
  });
  await prisma.orderStatusHistory.deleteMany({
    where: { orderId: { in: ids } },
  });
  await prisma.payment.deleteMany({
    where: { orderId: { in: ids } },
  });
  await prisma.baristaStockMovement.deleteMany({
    where: { orderId: { in: ids } },
  });
  await prisma.order.deleteMany({ where: { id: { in: ids } } });

  ok(`Deleted ${testOrders.length} old test orders`);
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧪  Seed Test Orders (CASH + QRIS)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 1. Cleanup
  await cleanupPreviousTestOrders();

  // 2. Find barista
  log("\n🔍 Finding active barista...");
  const barista = await prisma.user.findFirst({
    where: { role: "BARISTA", status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });

  if (!barista) {
    throw new Error(
      "Tidak ada BARISTA aktif. Buat barista dulu di /users/new"
    );
  }
  ok(`Barista: ${barista.name} (${barista.id})`);

  // 3. Find product
  log("\n🔍 Finding active product...");
  const product = await prisma.product.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (!product) {
    throw new Error(
      "Tidak ada produk aktif. Buat produk dulu di /inventory/products/new"
    );
  }
  ok(`Product: ${product.name} (${product.id})`);

  // 4. Ensure stock
  log("\n📦 Ensuring barista stock...");
  const stock = await prisma.baristaStock.upsert({
    where: {
      baristaId_productId: {
        baristaId: barista.id,
        productId: product.id,
      },
    },
    update: { quantity: 100 },
    create: {
      baristaId: barista.id,
      productId: product.id,
      quantity: 100,
      minThreshold: 3,
    },
  });
  ok(`Stock: ${stock.quantity} units`);

  // 5. Set Firebase location (barista online)
  log("\n📍 Setting Firebase location...");
  let firebaseReady = false;
  try {
    const now = Date.now();
    await adminDatabase.ref(`locations/${barista.firebaseUid}`).set({
      uid: barista.firebaseUid,
      role: "BARISTA",
      name: barista.name,
      latitude: CUSTOMER_LAT,
      longitude: CUSTOMER_LNG,
      isActive: true,
      status: "online",
      lastSeen: now,
      timestamp: now,
    });
    firebaseReady = true;
    ok("Barista online di Firebase");
  } catch (err) {
    warn(
      `Firebase tidak tersedia: ${(err as Error).message}. Akan pakai force-assign.`
    );
  }

  // 6. Process orders
  const results: Array<{
    orderNumber: string;
    customerName: string;
    method: string;
    qty: number;
    total: number;
  }> = [];

  for (const spec of ORDERS) {
    log(
      `\n📦 Order untuk ${spec.name} (${spec.method}, qty ${spec.qty})...`
    );

    // 6.1 Create order
    const created = await createOrder({
      channel: "ONLINE",
      customerName: spec.name,
      customerPhone: spec.phone,
      deliveryAddress: spec.address,
      deliveryLatitude: CUSTOMER_LAT,
      deliveryLongitude: CUSTOMER_LNG,
      items: [{ productId: product.id, quantity: spec.qty }],
      paymentMethodCode: spec.method,
    });

    const orderId = created.orderId;
    ok(
      `Created: ${created.orderNumber} (status=${created.status}, total=Rp ${created.total.toLocaleString("id-ID")})`
    );

    // 6.2 QRIS: simulate payment
    if (spec.method === "QRIS") {
      info("Simulating DOKU payment success...");
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "PAID",
          paidAt: new Date(),
          status: "SEARCHING",
          dokuPaidAt: new Date(),
        },
      });
      await prisma.payment.update({
        where: { orderId },
        data: { status: "PAID", paidAt: new Date() },
      });
      await prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: "SEARCHING",
          note: "Payment success (simulated) — mencari barista",
        },
      });
      ok("Payment simulated (PAID)");
    }

    // 6.3 Assign
    let order = await prisma.order.findUnique({ where: { id: orderId } });

    if (order!.status === "SEARCHING" && firebaseReady) {
      info("Mencari barista via Firebase location...");
      try {
        await assignOrderToBaristas(orderId);
      } catch (err) {
        info(`Auto-assign gagal: ${(err as Error).message}`);
      }
      order = await prisma.order.findUnique({ where: { id: orderId } });
    }

    // Fallback force-assign
    const assignedStatuses = [
      "ASSIGNED",
      "ACCEPTED",
      "DELIVERING",
      "ARRIVED",
    ];
    if (!assignedStatuses.includes(order!.status)) {
      info("Force-assigning ke barista test...");
      await forceAssign(orderId, barista.id);
      order = await prisma.order.findUnique({ where: { id: orderId } });
    }

    const baristaId = order!.baristaId!;
    ok(`Assigned: ${baristaId}`);

    // 6.4 Accept
    if (order!.status === "ASSIGNED") {
      await acceptOrder(orderId, baristaId);
      ok("Accepted");
    }

    // 6.5 Delivering
    let cur = await prisma.order.findUnique({ where: { id: orderId } });
    if (cur!.status === "ACCEPTED") {
      await updateOrderStatus(orderId, baristaId, {
        status: "DELIVERING",
      });
      ok("Delivering");
    }

    // 6.6 Arrived
    cur = await prisma.order.findUnique({ where: { id: orderId } });
    if (cur!.status === "DELIVERING") {
      await updateOrderStatus(orderId, baristaId, {
        status: "ARRIVED",
      });
      ok("Arrived");
    }

    // 6.7 Complete
    cur = await prisma.order.findUnique({ where: { id: orderId } });
    if (cur!.status === "ARRIVED") {
      await completeOrder(orderId, {
        note: "Auto-completed by seed script",
      });
      ok("Completed 🎉");
    }

    results.push({
      orderNumber: created.orderNumber,
      customerName: spec.name,
      method: spec.method,
      qty: spec.qty,
      total: created.total,
    });
  }

  // 7. Verify
  log("\n📊 Verifying...");

  const finalStock = await prisma.baristaStock.findUnique({
    where: { id: stock.id },
  });
  const totalQty = ORDERS.reduce((s, o) => s + o.qty, 0);
  ok(`Stock: ${stock.quantity} → ${finalStock!.quantity} (-${totalQty})`);

  const soldCount = await prisma.baristaStockMovement.count({
    where: { type: "SOLD", baristaId: barista.id },
  });
  ok(`SOLD movements: ${soldCount}`);

  const completedCount = await prisma.order.count({
    where: {
      customerName: { startsWith: TEST_PREFIX },
      status: "COMPLETED",
    },
  });
  ok(`Completed orders: ${completedCount}`);

  // 8. Summary
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log(
    "No | Order Number        | Customer    | Method | Qty | Total"
  );
  console.log(
    "---|---------------------|-------------|--------|-----|--------------"
  );

  results.forEach((r, i) => {
    const no = String(i + 1).padStart(2);
    const total = `Rp ${r.total.toLocaleString("id-ID")}`;
    console.log(
      `${no} | ${r.orderNumber.padEnd(19)} | ${r.customerName.padEnd(11)} | ${r.method.padEnd(6)} | ${String(r.qty).padStart(3)} | ${total}`
    );
  });

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Semua order created & completed");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

// ============================================================
// Run
// ============================================================

main()
  .catch((err) => {
    console.error("\n❌ ERROR:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });