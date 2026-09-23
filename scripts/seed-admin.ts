// ============================================================
// SEED ADMIN
//
// - Buat / update user di Firebase Authentication
// - Buat / update User di DB (role ADMIN, status ACTIVE)
//
// Idempotent: bisa dijalankan berkali-kali tanpa error.
// ============================================================

import "dotenv/config";
import { adminAuth } from "../src/lib/firebases/firebase-admin";
import { prisma } from "../src/lib/db";

// ---------- Konfigurasi ----------
const ADMIN_EMAIL = "dandiramdani21@gmail.com";
const ADMIN_PASSWORD = "dandi129";
const ADMIN_NAME = "Dandi Ramdani";
const ADMIN_PHONE: string | null = null;
// --------------------------------

async function main() {
  // -------- 1. Firebase: create or get user --------
  let firebaseUser;

  try {
    firebaseUser = await adminAuth.getUserByEmail(ADMIN_EMAIL);
    console.log(`✓ Firebase user sudah ada: ${firebaseUser.uid}`);

    // Sync password & emailVerified biar konsisten
    await adminAuth.updateUser(firebaseUser.uid, {
      password: ADMIN_PASSWORD,
      emailVerified: true,
    });
    console.log(`✓ Password & emailVerified di-update`);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;

    if (code === "auth/user-not-found") {
      firebaseUser = await adminAuth.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        emailVerified: true,
      });
      console.log(`✓ Firebase user dibuat: ${firebaseUser.uid}`);
    } else {
      throw err;
    }
  }

  // -------- 2. Prisma: upsert User --------
  const user = await prisma.user.upsert({
    where: { firebaseUid: firebaseUser.uid },
    update: {
      role: "ADMIN",
      status: "ACTIVE",
      name: ADMIN_NAME,
      phone: ADMIN_PHONE,
    },
    create: {
      firebaseUid: firebaseUser.uid,
      role: "ADMIN",
      status: "ACTIVE",
      name: ADMIN_NAME,
      phone: ADMIN_PHONE,
    },
  });

  console.log(
    `✓ DB User siap: ${user.id} (${user.name}, role=${user.role}, status=${user.status})`
  );

  console.log("\n✅ Seed selesai!\n");
  console.log("Login WebAdmin dengan:");
  console.log(`  Email    : ${ADMIN_EMAIL}`);
  console.log(`  Password : ${ADMIN_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("❌ Seed gagal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });