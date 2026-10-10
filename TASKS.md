# ASCEND Development Tasks

## Status Summary

### ✅ DONE - WebAdmin (Next.js)

| Feature | Status | Notes |
|---------|--------|-------|
| Order CRUD API | ✅ Done | `/api/orders` |
| Payment Webhook | ✅ Done | `/api/payment/notification` |
| Midtrans Snap Checkout | ✅ Done | `/api/payment/checkout` |
| Haversine distance calculation | ✅ Done | In edge function |
| Maps page (`/maps`) | ✅ Done | Leaflet + barista markers |
| Barista Stock API | ✅ Done | Restock, movements |
| Inventory Management | ✅ Done | Products, recipes |
| NextAuth + Firebase token verify | ✅ Done | Admin login |
| API Response helpers | ✅ Done | `ok()`, `created()`, etc. |

### ✅ DONE - Supabase Edge Functions

| Function | Status | Notes |
|---------|--------|-------|
| `assign-barista` | ✅ Done | Deployed, tested, working |
| Haversine calculation | ✅ Done | Part of assign-barista |
| Barista availability check | ✅ Done | No active orders |
| Direct PostgreSQL connection | ✅ Done | Uses `postgres.Client` |
| Firebase RTDB location read | ✅ Partial | Falls back to Supabase lat/long |
| Firebase order tracking update | ✅ Done | Updates RTDB on assignment |
| UUID validation | ✅ Done | Proper UUID format check |

### ❌ IN PROGRESS - Firebase Auth Token

| Feature | Status | Notes |
|---------|--------|-------|
| Firebase JWT signing | ❌ Debugging | 401 error, needs fix |
| Firebase RTDB auth | ❌ Fallback | Uses Supabase lat/long instead |

### ❌ TODO - Flutter Barista App (`ascend_barista/`)

| Feature | Status | Priority |
|---------|--------|----------|
| Firebase Auth integration | ❌ TODO | HIGH |
| Supabase Flutter SDK | ❌ TODO | HIGH |
| Supabase Realtime (Order) | ❌ TODO | HIGH |
| Barista GPS → Firebase RTDB | ❌ TODO | HIGH |
| Order Accept Page | ❌ TODO | HIGH |
| Order Decline Page | ❌ TODO | MEDIUM |
| Delivery Tracking Page | ❌ TODO | MEDIUM |
| Order History Page | ❌ TODO | MEDIUM |
| Status Update API (PATCH) | ❌ TODO | HIGH |
| Push Notifications | ❌ TODO | LOW |
| Maps/Navigation to customer | ❌ TODO | MEDIUM |

### ❌ TODO - Flutter Customer App (`ascend_customer/`)

| Feature | Status | Priority |
|---------|--------|----------|
| Firebase Auth integration | ❌ TODO | HIGH |
| Supabase Flutter SDK | ❌ TODO | HIGH |
| Product Catalog Page | ❌ TODO | HIGH |
| Cart/Checkout Page | ❌ TODO | HIGH |
| Order Creation API | ❌ TODO | HIGH |
| Payment (Midtrans Snap WebView) | ❌ TODO | HIGH |
| Order Tracking Page | ❌ TODO | HIGH |
| Customer GPS → Firebase RTDB | ❌ TODO | MEDIUM |
| Order History Page | ❌ TODO | MEDIUM |
| Push Notifications | ❌ TODO | LOW |

### ✅ DONE - Database Grants

| Grant | Status |
|-------|--------|
| `GRANT USAGE ON SCHEMA public TO postgres` | ✅ Done |
| `GRANT SELECT, UPDATE ON "Order" TO postgres` | ✅ Done |
| `GRANT SELECT, UPDATE ON "User" TO postgres` | ✅ Done |

---

## Edge Function Test Results

### Test: assign-barista (2025-10-05)

```bash
curl -X POST https://wonjentqtxnnrfadkqkd.supabase.co/functions/v1/assign-barista \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "<uuid>"}'
```

**Result:**
```json
{
  "success": true,
  "baristaId": "9d66775f-f436-4729-af9d-3f41a92782f3",
  "baristaName": "Test Barista Surabaya",
  "baristaPhone": "6281234567891",
  "distance": "568.47 km",
  "assignedAt": "2026-10-05T07:57:39.052Z",
  "durationMs": 129,
  "locationSource": "supabase"
}
```

**Notes:**
- Duration: 129ms (fast!)
- Location source: supabase (Firebase fallback to Supabase lat/long)
- Order status: SEARCHING → ASSIGNED ✅

---

## Docs Index

| Document | Status |
|----------|--------|
| `DOCS/README.md` | ✅ Updated |
| `DOCS/architecture/system-architecture.md` | ✅ Updated |
| `DOCS/order/how-to-assign-order.md` | ✅ Updated |
| `DOCS/order/api-contract.md` | ✅ Done |
| `DOCS/payment/midtrans-integration.md` | ✅ Done |
| `DOCS/barista/realtime-integration.md` | ✅ Updated |
| `DOCS/barista/app-architecture.md | ✅ NEW |
| `DOCS/customer/app-architecture.md | ✅ NEW |
| `DOCS/flow/complete-flow.md | ✅ NEW |

---

## Testing

### Edge Function

```bash
# Get service role key
SERVICE_KEY=$(cat .env | grep SUPABASE_SERVICE_ROLE_KEY | cut -d'=' -f2)

# Test with order ID
curl -X POST https://wonjentqtxnnrfadkqkd.supabase.co/functions/v1/assign-barista \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "<uuid>"}'
```

### Database Grants Verification

```sql
SELECT 
  has_schema_privilege('postgres', 'public', 'USAGE') as schema_usage,
  has_table_privilege('postgres', 'public."Order"', 'SELECT') as order_select,
  has_table_privilege('postgres', 'public."Order"', 'UPDATE') as order_update;
```

---

## Issues & Next Steps

### Firebase JWT Signing (Priority: HIGH)

**Problem:** Edge function returns 401 when trying to fetch Firebase RTDB with token.

**Root Cause:** JWT signing algorithm needs verification.

**Workaround:** Falls back to Supabase lat/long columns for barista locations.

**Fix Needed:** Debug JWT signing with test tokens.

### Flutter Apps (Priority: HIGH)

**Next Step:** Start with Barista App authentication flow.

---

## Last Updated

2025-10-05
