"use client";

import * as React from "react";
import {
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { useSession } from "next-auth/react";

import { auth } from "@/lib/firebases/firebase";

// ============================================================
// Hook: auto-login Firebase setelah NextAuth session ready
// ============================================================

type UseFirebaseLoginReturn = {
  isFirebaseReady: boolean;
  firebaseUid: string | null;
  error: string | null;
};

export function useFirebaseLogin(): UseFirebaseLoginReturn {
  const { data: session, status } = useSession();

  const [isFirebaseReady, setIsFirebaseReady] = React.useState(false);
  const [firebaseUid, setFirebaseUid] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Subscribe auth state
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUid(user.uid);
        setIsFirebaseReady(true);
      } else {
        setFirebaseUid(null);
        setIsFirebaseReady(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto login saat NextAuth ready
  React.useEffect(() => {
    let cancelled = false;

    async function login() {
      if (status !== "authenticated" || !session?.user?.firebaseUid) return;

      // Sudah login dengan uid yang sama
      if (auth.currentUser?.uid === session.user.firebaseUid) {
        setIsFirebaseReady(true);
        return;
      }

      try {
        setError(null);

        const res = await fetch("/api/auth/firebase-token", {
          method: "POST",
          headers: { Accept: "application/json" },
        });

        const json = await res.json();

        if (!res.ok || !json.success || !json.data?.customToken) {
          throw new Error(
            json.error?.message ?? "Gagal generate Firebase token"
          );
        }

        await signInWithCustomToken(auth, json.data.customToken);

        if (!cancelled) {
          setIsFirebaseReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Firebase login gagal"
          );
        }
      }
    }

    void login();

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.firebaseUid]);

  // Auto logout Firebase saat NextAuth logout
  React.useEffect(() => {
    if (status === "unauthenticated" && auth.currentUser) {
      void signOut(auth);
    }
  }, [status]);

  return { isFirebaseReady, firebaseUid, error };
}