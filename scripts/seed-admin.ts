// ============================================================
// SEED USERS
//
// - Buat / update user di Firebase Authentication
// - Buat / update User di PostgreSQL melalui Prisma
// - Menyimpan metadata user ke database
// - Idempotent: aman dijalankan berkali-kali
//
// USERS:
// 1. iqbal@ascend.com     → ADMIN
// 2. dandi@ascend.com     → ADMIN
// 3. customer@ascend.com  → CUSTOMER
// 4. barista@ascend.com   → BARISTA
// ============================================================

import "dotenv/config";
import { adminAuth } from "../src/lib/firebases/firebase-admin";
import { prisma } from "../src/lib/db";

// ============================================================
// KONFIGURASI USERS
// ============================================================

const USERS = [
  {
    email: "iqbal@ascend.com",
    password: "iqbal123",
    name: "Iqbal",
    role: "ADMIN" as const,

    phone: "081234567801",
    address: "Jl. Asia Afrika No. 10, Bandung",

    idNumber: "3273010101900001",
    birthDate: new Date("1990-01-01"),
    joinDate: new Date("2026-09-01"),
    addressKtp: "Jl. Asia Afrika No. 10, Bandung",
  },

  {
    email: "dandi@ascend.com",
    password: "dandi123",
    name: "Dandi",
    role: "ADMIN" as const,

    phone: "081234567802",
    address: "Jl. Braga No. 25, Bandung",

    idNumber: "3273010202920002",
    birthDate: new Date("1992-02-02"),
    joinDate: new Date("2026-09-01"),
    addressKtp: "Jl. Braga No. 25, Bandung",
  },

  {
    email: "customer@ascend.com",
    password: "customer123",
    name: "Customer",
    role: "CUSTOMER" as const,

    phone: "081234567803",
    address: "Jl. Buah Batu No. 50, Bandung",

    idNumber: "3273010303950003",
    birthDate: new Date("1995-03-03"),
    joinDate: null,
    addressKtp: "Jl. Buah Batu No. 50, Bandung",
  },

  {
    email: "barista@ascend.com",
    password: "barista123",
    name: "Barista",
    role: "BARISTA" as const,

    phone: "081234567804",
    address: "Jl. Cihampelas No. 75, Bandung",

    idNumber: "3273010404970004",
    birthDate: new Date("1997-04-04"),
    joinDate: new Date("2026-09-15"),
    addressKtp: "Jl. Cihampelas No. 75, Bandung",
  },
];

// ============================================================
// SEED SATU USER
// ============================================================

async function seedUser(userData: (typeof USERS)[number]) {
  const {
    email,
    password,
    name,
    role,
    phone,
    address,
    idNumber,
    birthDate,
    joinDate,
    addressKtp,
  } = userData;

  console.log("\n--------------------------------------------");
  console.log(`Processing : ${email}`);
  console.log(`Name       : ${name}`);
  console.log(`Role       : ${role}`);
  console.log("--------------------------------------------");

  // ==========================================================
  // 1. FIREBASE AUTHENTICATION
  // ==========================================================

  let firebaseUser;

  try {
    // Cari user berdasarkan email
    firebaseUser = await adminAuth.getUserByEmail(email);

    console.log(
      `✓ Firebase user sudah ada: ${firebaseUser.uid}`
    );

    // Sync data Firebase
    await adminAuth.updateUser(firebaseUser.uid, {
      password,
      emailVerified: true,
      displayName: name,
    });

    console.log(
      "✓ Firebase password, emailVerified & displayName di-update"
    );
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;

    // ========================================================
    // USER BELUM ADA → CREATE
    // ========================================================

    if (code === "auth/user-not-found") {
      firebaseUser = await adminAuth.createUser({
        email,
        password,
        emailVerified: true,
        displayName: name,
      });

      console.log(
        `✓ Firebase user dibuat: ${firebaseUser.uid}`
      );
    } else {
      throw err;
    }
  }

  // ==========================================================
  // 2. POSTGRESQL / PRISMA
  // ==========================================================

  const dbUser = await prisma.user.upsert({
    where: {
      firebaseUid: firebaseUser.uid,
    },

    // --------------------------------------------------------
    // Jika user sudah ada → update
    // --------------------------------------------------------

    update: {
      role,
      status: "ACTIVE",

      name,
      phone,
      address,

      idNumber,
      birthDate,
      joinDate,
      addressKtp,
    },

    // --------------------------------------------------------
    // Jika user belum ada → create
    // --------------------------------------------------------

    create: {
      firebaseUid: firebaseUser.uid,

      role,
      status: "ACTIVE",

      name,
      phone,
      address,

      idNumber,
      birthDate,
      joinDate,
      addressKtp,
    },
  });

  console.log("\n✓ PostgreSQL user siap:");
  console.log(`  DB ID       : ${dbUser.id}`);
  console.log(`  Firebase UID: ${dbUser.firebaseUid}`);
  console.log(`  Name        : ${dbUser.name}`);
  console.log(`  Role        : ${dbUser.role}`);
  console.log(`  Status      : ${dbUser.status}`);
  console.log(`  Phone       : ${dbUser.phone ?? "-"}`);
  console.log(`  Address     : ${dbUser.address ?? "-"}`);
  console.log(`  ID Number   : ${dbUser.idNumber ?? "-"}`);
  console.log(
    `  Birth Date  : ${
      dbUser.birthDate
        ? dbUser.birthDate.toISOString().split("T")[0]
        : "-"
    }`
  );
  console.log(
    `  Join Date   : ${
      dbUser.joinDate
        ? dbUser.joinDate.toISOString().split("T")[0]
        : "-"
    }`
  );
  console.log(`  Address KTP : ${dbUser.addressKtp ?? "-"}`);

  return {
    email,
    password,
    firebaseUid: firebaseUser.uid,
    dbId: dbUser.id,
    role: dbUser.role,
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("\n");
  console.log("============================================");
  console.log("         ASCEND USER SEED");
  console.log("============================================");

  const results = [];

  // Jalankan satu per satu supaya log mudah dibaca
  for (const user of USERS) {
    const result = await seedUser(user);
    results.push(result);
  }

  // ==========================================================
  // SUMMARY
  // ==========================================================

  console.log("\n");
  console.log("============================================");
  console.log("             SEED SELESAI");
  console.log("============================================");

  console.log("\nDatabase users:");

  for (const user of results) {
    console.log(
      `✓ ${user.email} | ${user.role} | DB: ${user.dbId}`
    );
  }

  console.log("\n============================================");
  console.log("             LOGIN CREDENTIALS");
  console.log("============================================");

  for (const user of USERS) {
    console.log(`\n[${user.role}]`);
    console.log(`Email    : ${user.email}`);
    console.log(`Password : ${user.password}`);
  }

  console.log("\n============================================");
  console.log("          FIREBASE + POSTGRESQL OK");
  console.log("============================================\n");
}

// ============================================================
// EXECUTE
// ============================================================

main()
  .catch((err) => {
    console.error("\n❌ Seed gagal:");
    console.error(err);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });