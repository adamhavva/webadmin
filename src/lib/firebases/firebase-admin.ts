import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { readFileSync } from 'fs';
import { join } from 'path';

// Path to service account JSON file
const SERVICE_ACCOUNT_PATH = join(process.cwd(), 'credentials/firebase/serviceAccountKey.json');

// Lazy initialization
let _firebaseAdminApp: ReturnType<typeof initializeApp> | null = null;
let _adminAuth: ReturnType<typeof getAuth> | null = null;
let _adminDatabase: ReturnType<typeof getDatabase> | null = null;
let _initialized = false;
let _initError: Error | null = null;

function initializeFirebase(): void {
  if (_initialized) return;
  _initialized = true;

  try {
    // Read service account from JSON file
    let serviceAccount: ServiceAccount;

    try {
      const raw = readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8');
      const json = JSON.parse(raw);

      serviceAccount = {
        type: json.type,
        projectId: json.project_id,
        privateKeyId: json.private_key_id,
        privateKey: json.private_key,
        clientEmail: json.client_email,
        clientId: json.client_id,
        authUri: json.auth_uri,
        tokenUri: json.token_uri,
        authProviderX509CertUrl: json.auth_provider_x509_cert_url,
        clientX509CertUrl: json.client_x509_cert_url,
        universeDomain: json.universe_domain || 'googleapis.com',
      };

      console.log('[Firebase Admin] Loaded service account from:', SERVICE_ACCOUNT_PATH);
    } catch (fileErr) {
      console.log('[Firebase Admin] Could not load service account file:', fileErr);
      _initError = fileErr as Error;
      return;
    }

    _firebaseAdminApp = getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL,
        });

    _adminAuth = getAuth(_firebaseAdminApp);
    _adminDatabase = getDatabase(_firebaseAdminApp);

    console.log('[Firebase Admin] Initialized successfully with project:', serviceAccount.projectId);
  } catch (err) {
    _initError = err as Error;
    console.log('[Firebase Admin] Initialization failed:', err);
  }
}

// Getter functions that lazily initialize
export function getAdminAuth() {
  initializeFirebase();
  if (!_adminAuth) {
    throw _initError || new Error('Firebase Admin Auth not initialized');
  }
  return _adminAuth;
}

export function getAdminDatabase() {
  initializeFirebase();
  if (!_adminDatabase) {
    throw _initError || new Error('Firebase Admin Database not initialized');
  }
  return _adminDatabase;
}

// Re-export for backwards compatibility
export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get: (_, prop) => {
    return (...args: any[]) => {
      const auth = getAdminAuth();
      const fn = (auth as any)[prop];
      return typeof fn === 'function' ? fn.apply(auth, args) : fn;
    };
  }
});

export const adminDatabase = new Proxy({} as ReturnType<typeof getDatabase>, {
  get: (_, prop) => {
    return (...args: any[]) => {
      const db = getAdminDatabase();
      const fn = (db as any)[prop];
      return typeof fn === 'function' ? fn.apply(db, args) : fn;
    };
  }
});

export const firebaseAdminApp = new Proxy({} as ReturnType<typeof initializeApp>, {
  get: (_, prop) => {
    initializeFirebase();
    if (!_firebaseAdminApp) {
      throw _initError || new Error('Firebase Admin not initialized');
    }
    return (_firebaseAdminApp as any)[prop];
  }
});

// Export for testing
export function getFirebaseInitError(): Error | null {
  return _initError;
}

export function isFirebaseInitialized(): boolean {
  return _firebaseAdminApp !== null;
}

// Default export
export default firebaseAdminApp;
