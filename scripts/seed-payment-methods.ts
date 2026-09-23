import { prisma } from "../src/lib/db";

// ============================================================
// Seed Payment Method Config — channel DOKU + CASH
//
// Jalankan: npx tsx scripts/seed-payment-methods.ts
// ============================================================

const METHODS = [
  // ---------- CASH ----------
  {
    code: "CASH",
    name: "Tunai",
    provider: "CASH" as const,
    dokuChannelCode: null,
    feeType: "NONE" as const,
    feeValue: 0,
    icon: "💵",
    description: "Bayar tunai di tempat",
    displayGroup: "Tunai",
    sortOrder: 1,
  },

  // ---------- Virtual Account ----------
  {
    code: "VA_BCA",
    name: "BCA Virtual Account",
    provider: "DOKU" as const,
    dokuChannelCode: "VIRTUAL_ACCOUNT_BCA",
    feeType: "NOMINAL" as const,
    feeValue: 4000,
    icon: "🏦",
    description: "Transfer via BCA Virtual Account",
    displayGroup: "Virtual Account",
    sortOrder: 10,
  },
  {
    code: "VA_MANDIRI",
    name: "Mandiri Virtual Account",
    provider: "DOKU" as const,
    dokuChannelCode: "VIRTUAL_ACCOUNT_BANK_MANDIRI",
    feeType: "NOMINAL" as const,
    feeValue: 4000,
    icon: "🏦",
    description: "Transfer via Mandiri Virtual Account",
    displayGroup: "Virtual Account",
    sortOrder: 11,
  },
  {
    code: "VA_BSI",
    name: "BSI Virtual Account",
    provider: "DOKU" as const,
    dokuChannelCode: "VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI",
    feeType: "NOMINAL" as const,
    feeValue: 4000,
    icon: "🏦",
    description: "Transfer via BSI Virtual Account",
    displayGroup: "Virtual Account",
    sortOrder: 12,
  },
  {
    code: "VA_BNI",
    name: "BNI Virtual Account",
    provider: "DOKU" as const,
    dokuChannelCode: "VIRTUAL_ACCOUNT_BNI",
    feeType: "NOMINAL" as const,
    feeValue: 4000,
    icon: "🏦",
    description: "Transfer via BNI Virtual Account",
    displayGroup: "Virtual Account",
    sortOrder: 13,
  },
  {
    code: "VA_BRI",
    name: "BRI Virtual Account",
    provider: "DOKU" as const,
    dokuChannelCode: "VIRTUAL_ACCOUNT_BRI",
    feeType: "NOMINAL" as const,
    feeValue: 4000,
    icon: "🏦",
    description: "Transfer via BRI Virtual Account",
    displayGroup: "Virtual Account",
    sortOrder: 14,
  },
  {
    code: "VA_PERMATA",
    name: "Permata Virtual Account",
    provider: "DOKU" as const,
    dokuChannelCode: "VIRTUAL_ACCOUNT_BANK_PERMATA",
    feeType: "NOMINAL" as const,
    feeValue: 4000,
    icon: "🏦",
    description: "Transfer via Permata Virtual Account",
    displayGroup: "Virtual Account",
    sortOrder: 15,
  },
  {
    code: "VA_CIMB",
    name: "CIMB Virtual Account",
    provider: "DOKU" as const,
    dokuChannelCode: "VIRTUAL_ACCOUNT_BANK_CIMB",
    feeType: "NOMINAL" as const,
    feeValue: 4000,
    icon: "🏦",
    description: "Transfer via CIMB Virtual Account",
    displayGroup: "Virtual Account",
    sortOrder: 16,
  },
  {
    code: "VA_DANAMON",
    name: "Danamon Virtual Account",
    provider: "DOKU" as const,
    dokuChannelCode: "VIRTUAL_ACCOUNT_BANK_DANAMON",
    feeType: "NOMINAL" as const,
    feeValue: 4000,
    icon: "🏦",
    description: "Transfer via Danamon Virtual Account",
    displayGroup: "Virtual Account",
    sortOrder: 17,
  },

  // ---------- QRIS ----------
  {
    code: "QRIS",
    name: "QRIS",
    provider: "DOKU" as const,
    dokuChannelCode: "QRIS",
    feeType: "PERCENTAGE" as const,
    feeValue: 0.7,
    icon: "📱",
    description: "Scan QRIS dengan aplikasi bank atau e-wallet apapun",
    displayGroup: "QRIS",
    sortOrder: 20,
  },

  // ---------- E-Wallet ----------
  {
    code: "OVO",
    name: "OVO",
    provider: "DOKU" as const,
    dokuChannelCode: "EMONEY_OVO",
    feeType: "PERCENTAGE" as const,
    feeValue: 2,
    icon: "💳",
    description: "Bayar via OVO",
    displayGroup: "E-Wallet",
    sortOrder: 30,
  },
  {
    code: "DANA",
    name: "DANA",
    provider: "DOKU" as const,
    dokuChannelCode: "EMONEY_DANA",
    feeType: "PERCENTAGE" as const,
    feeValue: 2,
    icon: "💳",
    description: "Bayar via DANA",
    displayGroup: "E-Wallet",
    sortOrder: 31,
  },
  {
    code: "SHOPEEPAY",
    name: "ShopeePay",
    provider: "DOKU" as const,
    dokuChannelCode: "EMONEY_SHOPEE_PAY",
    feeType: "PERCENTAGE" as const,
    feeValue: 2,
    icon: "💳",
    description: "Bayar via ShopeePay",
    displayGroup: "E-Wallet",
    sortOrder: 32,
  },
  {
    code: "LINKAJA",
    name: "LinkAja",
    provider: "DOKU" as const,
    dokuChannelCode: "EMONEY_LINKAJA",
    feeType: "PERCENTAGE" as const,
    feeValue: 2,
    icon: "💳",
    description: "Bayar via LinkAja",
    displayGroup: "E-Wallet",
    sortOrder: 33,
  },
  {
    code: "DOKU_WALLET",
    name: "DOKU Wallet",
    provider: "DOKU" as const,
    dokuChannelCode: "EMONEY_DOKU",
    feeType: "PERCENTAGE" as const,
    feeValue: 2,
    icon: "💳",
    description: "Bayar via DOKU Wallet",
    displayGroup: "E-Wallet",
    sortOrder: 34,
  },

  // ---------- Kartu ----------
  {
    code: "CC",
    name: "Kartu Kredit",
    provider: "DOKU" as const,
    dokuChannelCode: "CREDIT_CARD",
    feeType: "PERCENTAGE" as const,
    feeValue: 2.9,
    icon: "💳",
    description: "Visa / Mastercard / JCB",
    displayGroup: "Kartu",
    sortOrder: 40,
  },
  {
    code: "CC_GPN",
    name: "Kartu Debit (GPN)",
    provider: "DOKU" as const,
    dokuChannelCode: "KARTU_KREDIT_INDONESIA",
    feeType: "PERCENTAGE" as const,
    feeValue: 2.9,
    icon: "💳",
    description: "Kartu debit berlogo GPN",
    displayGroup: "Kartu",
    sortOrder: 41,
  },

  // ---------- Retail ----------
  {
    code: "ALFAMART",
    name: "Alfamart",
    provider: "DOKU" as const,
    dokuChannelCode: "ONLINE_TO_OFFLINE_ALFA",
    feeType: "NOMINAL" as const,
    feeValue: 5000,
    icon: "🏪",
    description: "Bayar di Alfamart / Alfamidi / Lawson",
    displayGroup: "Retail",
    sortOrder: 50,
  },
  {
    code: "INDOMARET",
    name: "Indomaret",
    provider: "DOKU" as const,
    dokuChannelCode: "ONLINE_TO_OFFLINE_INDOMARET",
    feeType: "NOMINAL" as const,
    feeValue: 5000,
    icon: "🏪",
    description: "Bayar di Indomaret",
    displayGroup: "Retail",
    sortOrder: 51,
  },

  // ---------- PayLater ----------
  {
    code: "AKULAKU",
    name: "Akulaku PayLater",
    provider: "DOKU" as const,
    dokuChannelCode: "PEER_TO_PEER_AKULAKU",
    feeType: "PERCENTAGE" as const,
    feeValue: 3,
    icon: "⏳",
    description: "Bayar nanti via Akulaku",
    displayGroup: "PayLater",
    sortOrder: 60,
  },
  {
    code: "KREDIVO",
    name: "Kredivo",
    provider: "DOKU" as const,
    dokuChannelCode: "PEER_TO_PEER_KREDIVO",
    feeType: "PERCENTAGE" as const,
    feeValue: 3,
    icon: "⏳",
    description: "Bayar nanti via Kredivo",
    displayGroup: "PayLater",
    sortOrder: 61,
  },
];

async function seed() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("💳  Seed Payment Methods");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  let created = 0;
  let skipped = 0;

  for (const m of METHODS) {
    const existing = await prisma.paymentMethodConfig.findUnique({
      where: { code: m.code },
    });

    if (existing) {
      console.log(`   ⏭  ${m.code} — sudah ada, skip`);
      skipped++;
      continue;
    }

    await prisma.paymentMethodConfig.create({
      data: {
        code: m.code,
        name: m.name,
        provider: m.provider,
        dokuChannelCode: m.dokuChannelCode,
        feeType: m.feeType,
        feeValue: m.feeValue,
        icon: m.icon,
        description: m.description,
        displayGroup: m.displayGroup,
        isActive: true,
        sortOrder: m.sortOrder,
      },
    });

    console.log(`   ✅ ${m.code} — ${m.name}`);
    created++;
  }

  console.log("");
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

seed()
  .catch((err) => {
    console.error("❌ Seed gagal:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());