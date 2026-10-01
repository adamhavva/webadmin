import "dotenv/config";
import { adminAuth } from "../src/lib/firebases/firebase-admin";
import { prisma } from "../src/lib/db";

// ============================================================
// CONFIG
// ============================================================

const USERS = [
  {
    email: "admin@ascend.com",
    password: "Ascend100%sukseS!",
    name: "ASCEND Admin",
    role: "ADMIN" as const,
    phone: null,
    address: "Jl. Sekecariu No 39, Cimekar, Cileunyi, Bandung, 40623",
    idNumber: null,
    birthDate: null,
    joinDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    addressKtp: "Jl. Asia Afrika No. 10, Bandung"
  }
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