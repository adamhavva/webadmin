# Plan: Edge Functions & Firebase Integration

## Context

User wants to use Edge Functions for payment webhook handling and Firebase integration. Currently:
- `assign-barista` edge function deployed ✅
- `/api/payment/notification` still a Next.js API route
- Firebase RTDB paths documented: `/users/{uid}`, `/orders/{id}`, `/order_pool/{uid}`

## Current Edge Functions

| Name | Status | Purpose |
|------|--------|---------|
| `assign-barista` | ✅ Deployed | Barista assignment with Haversine + Firebase RTDB |

## Recommended Edge Functions

### 🔴 Critical - Should Migrate to Edge Functions

| Priority | Operation | Edge Function Name | Key Features |
|----------|-----------|------------------|--------------|
| 1 | Payment Webhook | `payment-webhook` | Direct PostgreSQL, Firebase Admin, Midtrans signature |
| 2 | Order Accept | `order-accept` | Direct PostgreSQL, Firebase RTDB, Stock check |
| 3 | Order Reject | `order-reject` | Direct PostgreSQL, Firebase RTDB, Reassignment |
| 4 | Order Complete | `order-complete` | Direct PostgreSQL, Stock deduction, Firebase RTDB |
| 5 | Order Status Update | `order-status` | Firebase RTDB writes |

### 🟡 High Priority - Should Add

| Priority | Operation | Edge Function Name | Key Features |
|----------|-----------|------------------|--------------|
| 6 | Firebase Token Gen | `firebase-token` | Firebase Admin SDK |
| 7 | Order Broadcast | `broadcast-order` | Firebase RTDB, Fire-and-forget |
| 8 | Order Expiry (cron) | `order-expiry` | Scheduled, Direct PostgreSQL |

## Not Edge Functions (Keep as API Routes)

- Payment Checkout (Midtrans API + auth validation)
- Barista Stock CRUD (simple operations)
- Products/Inventory CRUD (standard CRUD)
- Reports (read-only queries)
- Settings (simple key-value)

## Implementation Order

### Phase 1: Payment Webhook → Edge Function

```typescript
// supabase/functions/payment-webhook/index.ts
export async function handler(req: Request): Promise<Response> {
  // 1. Verify Midtrans signature SHA512
  // 2. Direct PostgreSQL: Update Payment
  // 3. Direct PostgreSQL: Update Order status
  // 4. Direct PostgreSQL: Reduce barista stock
  // 5. Firebase RTDB: Write order locations
  // 6. Return 200 fast (don't wait for barista assignment)
  // 7. Barista assignment happens async or via separate edge function call
}
```

### Phase 2: Order Lifecycle → Edge Functions

Each order action (accept, reject, complete, status) becomes its own edge function for independent scaling.

### Phase 3: Firebase Token + Broadcast (if needed)

Firebase token generation for mobile apps, order broadcasting to barista pools.

## Firebase RTDB Paths

| Path | Write | Read | Purpose |
|------|--------|-------|---------|
| `/orders/{id}/locations` | Edge Functions | Customer App | Customer/barista locations for tracking |
| `/order_pool/{uid}/{id}` | Edge Functions | Barista App | Order pool per barista |
| `/users/{uid}/location` | Barista/Customer App | WebAdmin | Live GPS tracking |

## Effort Estimation

| Edge Function | Complexity | Lines |
|---------------|------------|-------|
| `payment-webhook` | High | ~150 |
| `order-accept` | Medium | ~100 |
| `order-reject` | Medium | ~100 |
| `order-complete` | Medium | ~120 |
| `order-status` | Low | ~60 |
| `firebase-token` | Low | ~40 |
| `broadcast-order` | Medium | ~80 |
| `order-expiry` | Medium | ~100 |

**Total: ~750 lines across 8 functions**

## Test Plan

Each edge function gets:
1. Unit tests (pure functions)
2. Integration test (actual Supabase + Firebase call)
3. Test data cleanup in `afterAll`

## Migration Checklist

- [x] Create `payment-webhook` edge function
- [x] Create `order-accept` edge function
- [x] Create `order-reject` edge function
- [x] Create `order-complete` edge function
- [x] Create `order-status` edge function
- [x] Create `firebase-token` edge function
- [x] Create `broadcast-order` edge function
- [x] Create `assign-barista` edge function
- [ ] Create `order-expiry` edge function (scheduled function)
- [ ] Fix postgres import consistency (assign-barista: deno.land → npm:postgres@3)
- [ ] Deploy all 8 edge functions to Supabase
- [ ] Configure secrets in Supabase dashboard
- [ ] Update API routes to call edge functions (or remove routes)
- [ ] Update mobile app to call edge functions directly
- [ ] Update documentation

## Deployment Status (2026-10-06)

| Task | Status | Notes |
|------|--------|-------|
| Edge functions implemented | ✅ DONE | 8 functions (~3200 lines total) |
| deno.json updated | ✅ DONE | All functions registered |
| postgres import fix | ✅ DONE | assign-barista now uses npm:postgres@3 |
| Supabase CLI login | ⏳ PENDING | Need `supabase login` |
| Deploy functions | ⏳ PENDING | `supabase functions deploy` |
| Set secrets | ⏳ PENDING | Via dashboard or `supabase secrets set` |
