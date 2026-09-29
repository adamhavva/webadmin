import { prisma } from "../src/lib/db";

// ============================================================
// Seed Payment Method Config — DOKU Checkout
//
// Jalankan: npx tsx scripts/seed-payment-methods.ts
// ============================================================

const METHODS = [
  // ---------- Virtual Account ----------
  {
    code: "VA_BCA",
    name: "BCA Virtual Account",
    dokuChannelCode: "VIRTUAL_ACCOUNT_BCA",
    feeType: "NOMINAL" as const,
    feeValue: 4000,
    icon: "🏦",
    groupCode: "VA",
    groupName: "Virtual Account",
    sortOrder: 10,
    isActive: true,
    availableForCustomer: true,
    availableForAdmin: true,
  },
  {
    code: "VA_MANDIRI",
    name: "Mandiri Virtual Account",
    dokuChannelCode: "VIRTUAL_ACCOUNT_MANDIRI",
    feeType: "NOMINAL" as const,
    feeValue: 4000,
    icon: "🏦",
    groupCode: "VA",
    groupName: "Virtual Account",
    sortOrder: 11,
    isActive: true,
    availableForCustomer: true,
    availableForAdmin: true,
  },
  {
    code: "VA_BNI",
    name: "BNI Virtual Account",
    dokuChannelCode: "VIRTUAL_ACCOUNT_BNI",
    feeType: "NOMINAL" as const,
    feeValue: 4000,
    icon: "🏦",
    groupCode: "VA",
    groupName: "Virtual Account",
    sortOrder: 12,
    isActive: true,
    availableForCustomer: true,
    availableForAdmin: true,
  },
  {
    code: "VA_BRI",
    name: "BRI Virtual Account",
    dokuChannelCode: "VIRTUAL_ACCOUNT_BRI",
    feeType: "NOMINAL" as const,
    feeValue: 4000,
    icon: "🏦",
    groupCode: "VA",
    groupName: "Virtual Account",
    sortOrder: 13,
    isActive: true,
    availableForCustomer: true,
    availableForAdmin: true,
  },
  {
    code: "VA_BSI",
    name: "BSI Virtual Account",
    dokuChannelCode: "VIRTUAL_ACCOUNT_BSI",
    feeType: "NOMINAL" as const,
    feeValue: 4000,
    icon: "🏦",
    groupCode: "VA",
    groupName: "Virtual Account",
    sortOrder: 14,
    isActive: true,
    availableForCustomer: true,
    availableForAdmin: true,
  },

  // ---------- QRIS ----------
  {
    code: "QRIS",
    name: "QRIS",
    dokuChannelCode: "QRIS",
    feeType: "PERCENTAGE" as const,
    feeValue: 0.7,
    icon: "📱",
    groupCode: "QRIS",
    groupName: "QRIS",
    sortOrder: 20,
    isActive: true,
    availableForCustomer: true,
    availableForAdmin: true,
  },

  // ---------- E-Wallet ----------
  {
    code: "EWALLET_OVO",
    name: "OVO",
    dokuChannelCode: "EWALLET_OVO",
    feeType: "PERCENTAGE" as const,
    feeValue: 2,
    icon: "💳",
    groupCode: "EWALLET",
    groupName: "E-Wallet",
    sortOrder: 30,
    isActive: true,
    availableForCustomer: true,
    availableForAdmin: true,
  },
  {
    code: "EWALLET_DANA",
    name: "DANA",
    dokuChannelCode: "EWALLET_DANA",
    feeType: "PERCENTAGE" as const,
    feeValue: 2,
    icon: "💳",
    groupCode: "EWALLET",
    groupName: "E-Wallet",
    sortOrder: 31,
    isActive: true,
    availableForCustomer: true,
    availableForAdmin: true,
  },
  {
    code: "EWALLET_SHOPEEPAY",
    name: "ShopeePay",
    dokuChannelCode: "EWALLET_SHOPEEPAY",
    feeType: "PERCENTAGE" as const,
    feeValue: 2,
    icon: "💳",
    groupCode: "EWALLET",
    groupName: "E-Wallet",
    sortOrder: 32,
    isActive: true,
    availableForCustomer: true,
    availableForAdmin: true,
  },
  {
    code: "EWALLET_LINKAJA",
    name: "LinkAja",
    dokuChannelCode: "EWALLET_LINKAJA",
    feeType: "PERCENTAGE" as const,
    feeValue: 2,
    icon: "💳",
    groupCode: "EWALLET",
    groupName: "E-Wallet",
    sortOrder: 33,
    isActive: true,
    availableForCustomer: true,
    availableForAdmin: true,
  },
];

async function main() {
  console.log("🌱 Seeding payment methods...\n");

  // Get or create DOKU provider
  let dokuProvider = await prisma.paymentProviderConfig.findFirst({
    where: { code: "DOKU" },
  });

  if (!dokuProvider) {
    dokuProvider = await prisma.paymentProviderConfig.create({
      data: {
        code: "DOKU",
        name: "DOKU Payment Gateway",
        isActive: true,
      },
    });
    console.log("✅ Created DOKU provider");
  }

  // Upsert each method
  for (const method of METHODS) {
    const existing = await prisma.paymentMethodConfig.findUnique({
      where: { code: method.code },
    });

    const data = {
      code: method.code,
      name: method.name,
      providerId: dokuProvider.id,
      dokuChannelCode: method.dokuChannelCode,
      feeType: method.feeType,
      feeValue: method.feeValue,
      icon: method.icon,
      groupCode: method.groupCode,
      groupName: method.groupName,
      sortOrder: method.sortOrder,
      isActive: method.isActive,
      availableForCustomer: method.availableForCustomer,
      availableForAdmin: method.availableForAdmin,
    };

    if (existing) {
      await prisma.paymentMethodConfig.update({
        where: { id: existing.id },
        data,
      });
      console.log(`  🔄 Updated: ${method.code}`);
    } else {
      await prisma.paymentMethodConfig.create({ data });
      console.log(`  ➕ Created: ${method.code}`);
    }
  }

  console.log("\n✅ Payment methods seeded successfully!");
  console.log(`   Total: ${METHODS.length} methods`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
