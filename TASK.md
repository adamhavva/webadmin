# TASK.md - Supabase Edge Functions Migration

## Completed

- [x] Deploy `assign-barista` edge function
- [x] Set edge function secrets (DATABASE_URL, Firebase config)
- [x] Test edge function ✅ **WORKING**
- [x] Fix tests folder structure ✅ **63 tests passing**
- [x] Move Firebase credentials to JSON file

## Edge Function: assign-barista

**Status**: Deployed ✅ | **Tested**: ✅ Working

### Test Result (2025-01-29)
```json
POST /functions/v1/assign-barista
→ {"success": true, "baristaName": "Barista 96", "distance": "0.4 km"}
```

### Features
- [x] Haversine distance calculation for nearest barista
- [x] PostgreSQL direct connection (bypasses Supabase client)
- [x] Firebase RTDB location lookup (reads from /users/{firebaseUid}/location)
- [x] Firebase ID token auth via Web Crypto API
- [x] Order status update (SEARCHING → ASSIGNED)
- [x] Order locations written to Firebase RTDB (`/orders/{orderId}/locations`)

### Firebase Order Locations Structure
```
/orders/{orderId}/locations = {
  "customer": { "lat": -6.902, "lng": 107.603, "timestamp": 1234567890 },
  "barista": { "lat": -6.92, "lng": 107.61, "timestamp": 1234567890 },
  "distance": 2.5,
  "orderNumber": "ORD-001"
}
```

### Firebase User Location Structure
```
/users/{firebaseUid}/location = {
  "lat": -6.902,
  "lng": 107.603,
  "accuracy": 10,
  "timestamp": 1234567890
}
```

### Edge Function Secrets (Set)
```bash
✅ DATABASE_URL
✅ FIREBASE_PROJECT_ID (for RTDB URL fallback)
✅ FIREBASE_DATABASE_URL (for RTDB URL fallback)
```

## Firebase Configuration

### Credentials File
```
credentials/firebase/serviceAccountKey.json
```
Contains service account with private key for Firebase Admin SDK.

### Usage
- **Next.js**: Reads from `credentials/firebase/serviceAccountKey.json`
- **Edge Functions**: Reads from same file (relative to project root)

### Environment Variables (Removed)
The following are NO LONGER needed:
- `FIREBASE_PRIVATE_KEY` (moved to JSON file)
- `FIREBASE_CLIENT_EMAIL` (moved to JSON file)
- `FIREBASE_CLIENT_ID` (moved to JSON file)
- `FIREBASE_PRIVATE_KEY_ID` (moved to JSON file)
- `FIREBASE_CLIENT_X509_CERT_URL` (moved to JSON file)

## Tests

### Running Tests
```bash
# All tests
npx vitest run

# Unit tests only
npx vitest run tests/edge-functions/assign-barista.test.ts

# Integration tests only
npx vitest run tests/edge-functions/assign-barista.integration.test.ts

# Payment tests only
npx vitest run tests/payment.test.ts
```

### Test Results (Latest)
| Suite | Tests | Status | Notes |
|-------|-------|--------|-------|
| assign-barista.test.ts | 25 | ✅ | Haversine, assignment logic, Firebase ID token |
| assign-barista.integration.test.ts | 8 | ✅ | Full integration with Supabase + Firebase RTDB |
| payment.test.ts | 30 | ✅ | Webhook, signature verification, status updates |
| **Total** | **63** | ✅ | All tests passing |

## Functions to Migrate to Edge Functions

### Already Migrated
| Function | Edge Function | Status |
|---------|---------------|--------|
| assign-barista | ✅ assign-barista | Deployed & Tested |

### Potential Future Migrations
| Function | Description | Priority |
|---------|-------------|---------|
| stock-check | Validate barista stock availability | Low |
| notify-barista | Push notification to barista | Low |
| order-expiry | Auto-cancel expired orders | Low |

## Notes

### Why Edge Functions?
1. **Direct PostgreSQL**: Bypass Supabase client RLS issues
2. **Firebase Auth**: Can use service account for RTDB access
3. **Independent**: No Next.js server dependency
4. **Scalable**: Runs on Supabase infrastructure

### Current Supabase API Keys
```bash
# Publishable key (browser-safe)
sb_publishable_lxUoSapUenHBrn-NO7cAoA_CfTvBZG2

# Service role key (server-only)
sb_secret_GnHv4mwJ6zUd8OpkUZJ87Q_opFJLsyQ
```

### Related Files
- `supabase/functions/assign-barista/index.ts` - Edge function code
- `supabase/functions/assign-barista/deno.json` - Deno config
- `src/lib/supabase.ts` - Contains `assignNearestBarista()` wrapper
- `src/lib/firebases/firebase-admin.ts` - Firebase Admin SDK
- `credentials/firebase/serviceAccountKey.json` - Firebase credentials

---
Updated: 2025-01-29
