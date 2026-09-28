"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDatabase = exports.adminAuth = void 0;
var app_1 = require("firebase-admin/app");
var auth_1 = require("firebase-admin/auth");
var database_1 = require("firebase-admin/database");
console.log("CREDS: ".concat(process.env.FIREBASE_PROJECT_ID));
var serviceAccount = {
    type: "service_account",
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: (_a = process.env.FIREBASE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, "\n"), // Fix: proper newline handling
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
    authUri: "https://accounts.google.com/o/oauth2/auth",
    tokenUri: "https://oauth2.googleapis.com/token",
    authProviderX509CertUrl: "https://www.googleapis.com/oauth2/v1/certs",
    clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universeDomain: "googleapis.com",
};
var firebaseAdminApp = (0, app_1.getApps)().length > 0
    ? (0, app_1.getApps)()[0]
    : (0, app_1.initializeApp)({
        credential: (0, app_1.cert)(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
exports.adminAuth = (0, auth_1.getAuth)(firebaseAdminApp);
exports.adminDatabase = (0, database_1.getDatabase)(firebaseAdminApp);
exports.default = firebaseAdminApp;
