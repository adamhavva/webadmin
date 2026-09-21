import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

import serviceAccount from "../../../serviceAccount.json";

const firebaseAdminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount as ServiceAccount),
        databaseURL:
          "https://ascend-v2-4a67d-default-rtdb.asia-southeast1.firebasedatabase.app",
      });

export const adminAuth = getAuth(firebaseAdminApp);
export const adminDatabase = getDatabase(firebaseAdminApp);

export default firebaseAdminApp;