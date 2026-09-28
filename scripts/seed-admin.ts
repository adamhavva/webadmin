import "dotenv/config";
import { adminAuth } from "../src/lib/firebases/firebase-admin";
import { prisma } from "../src/lib/db";

// ============================================================
// CONFIG
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
// FIREBASE
// ============================================================

async function syncFirebaseUser(user: (typeof USERS)[number]) {
  try {
    const existing = await adminAuth.getUserByEmail(user.email);

    const updated = await adminAuth.updateUser(existing.uid, {
      password: user.password,
      displayName: user.name,
      emailVerified: true,
    });

    console.log(`  ✓ Firebase updated: ${updated.uid}`);

    return updated;
  } catch (error: any) {
    if (error?.code !== "auth/user-not-found") {
      throw error;
    }

    const created = await adminAuth.createUser({
      email: user.email,
      password: user.password,
      displayName: user.name,
      emailVerified: true,
    });

    console.log(`  ✓ Firebase created: ${created.uid}`);

    return created;
  }
}

// ============================================================
// DATABASE
// ============================================================

async function syncDatabaseUser(
  user: (typeof USERS)[number],
  firebaseUid: string,
) {
  const dbUser = await prisma.user.upsert({
    where: {
      firebaseUid,
    },

    update: {
      role: user.role,
      status: "ACTIVE",
      name: user.name,
      phone: user.phone,
      address: user.address,
      idNumber: user.idNumber,
      birthDate: user.birthDate,
      joinDate: user.joinDate,
      addressKtp: user.addressKtp,
    },

    create: {
      firebaseUid,
      role: user.role,
      status: "ACTIVE",
      name: user.name,
      phone: user.phone,
      address: user.address,
      idNumber: user.idNumber,
      birthDate: user.birthDate,
      joinDate: user.joinDate,
      addressKtp: user.addressKtp,
    },
  });

  console.log(`  ✓ PostgreSQL synced: ${dbUser.id}`);

  return dbUser;
}

// ============================================================
// SEED
// ============================================================

async function main() {
  console.log("");
  console.log("========================================");
  console.log("       ASCEND USER SEED");
  console.log("========================================");

  for (const user of USERS) {
    console.log("");
    console.log("----------------------------------------");
    console.log(`${user.name} <${user.email}>`);
    console.log(`Role: ${user.role}`);
    console.log("----------------------------------------");

    // 1. Firebase
    const firebaseUser = await syncFirebaseUser(user);

    // 2. PostgreSQL
    const dbUser = await syncDatabaseUser(
      user,
      firebaseUser.uid,
    );

    console.log(`  ✓ ${dbUser.name} siap`);
  }

  console.log("");
  console.log("========================================");
  console.log("           SEED BERHASIL");
  console.log("========================================");

  console.log("");
  console.log("LOGIN:");

  for (const user of USERS) {
    console.log(
      `${user.role.padEnd(10)} | ${user.email} | ${user.password}`,
    );
  }

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