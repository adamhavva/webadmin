# Complete Cross-App Flow

## Overview

Dokumentasi ini menjelaskan alur lengkap dari customer order hingga order selesai, melewati 3 aplikasi dan multiple services.

## System Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           CUSTOMER APP (Flutter)                              │
│                                                                              │
│  1. Login (Firebase Auth)                                                   │
│     └── Firebase Auth → Get ID Token                                         │
│                                                                              │
│  2. Browse Products                                                         │
│     └── GET /api/products → Product catalog                                  │
│                                                                              │
│  3. Add to Cart                                                            │
│     └── Local state (Riverpod/BLoC)                                         │
│                                                                              │
│  4. Checkout                                                                │
│     └── POST /api/orders                                                    │
│     └── Order created: status=PENDING                                        │
│                                                                              │
│  5. Payment                                                                 │
│     └── POST /api/payment/checkout                                          │
│     └── Midtrans Snap token → Open WebView                                   │
│     └── Customer pays on Midtrans page                                       │
│                                                                              │
│  6. Wait for Payment                                                       │
│     └── Poll /api/payment?orderId=xxx (or WebSocket)                      │
│                                                                              │
│  7. Order Confirmed                                                         │
│     └── Payment success → status=SEARCHING → ASSIGNED                        │
│     └── Supabase Realtime subscription                                      │
│     └── Show: "Searching for barista..." → "Barista assigned!"             │
│                                                                              │
│  8. Track Delivery                                                          │
│     └── Realtime updates: ACCEPTED → DELIVERING → ARRIVED → COMPLETED      │
│     └── Customer location on map                                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP POST (Webhook)
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           WEBADMIN API (Next.js)                             │
│                                                                              │
│  POST /api/payment/notification (Midtrans Webhook)                         │
│                                                                              │
│  1. Verify Signature                                                        │
│     └── SHA512(order_id + status_code + gross_amount + SERVER_KEY)          │
│                                                                              │
│  2. Update Payment Status                                                  │
│     └── Payment.status = settlement → PAID                                  │
│                                                                              │
│  3. Update Order                                                           │
│     └── Order.paymentStatus = PAID                                          │
│     └── Order.status = SEARCHING                                            │
│                                                                              │
│  4. Trigger Barista Assignment                                             │
│     └── POST /functions/v1/assign-barista                                   │
│                                                                              │
│  5. Order status = ASSIGNED                                                │
│     └── Supabase Realtime broadcasts on orders table                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP POST
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS: Order Lifecycle                     │
│                                                                              │
│  1. payment-webhook                                                         │
│     └── Process Midtrans payment notification                                │
│     └── Call assign-barista                                                 │
│                                                                              │
│  2. assign-barista                                                          │
│     └── Read barista locations from Firebase RTDB                            │
│     └── Haversine calculation → nearest barista                              │
│     └── Update order: status = ASSIGNED                                     │
│     └── Broadcast to order pool                                             │
│                                                                              │
│  3. broadcast-order                                                        │
│     └── Write to /order_pool/{baristaUid}/{orderId}                        │
│     └── Push notification                                                   │
│                                                                              │
│  4. order-accept (Barista action)                                          │
│     └── Mark order: status = ACCEPTED                                       │
│     └── Remove from order pool                                             │
│                                                                              │
│  5. order-reject (Barista action)                                          │
│     └── Mark order: status = SEARCHING                                       │
│     └── Call assign-barista (reassign)                                     │
│                                                                              │
│  6. order-complete (Barista action)                                         │
│     └── Mark order: status = COMPLETED                                      │
│     └── Cleanup order pool                                                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Supabase Realtime (postgres_changes)
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           BARISTA APP (Flutter)                               │
│                                                                              │
│  1. Subscribe to Orders                                                     │
│     └── Supabase Realtime channel                                           │
│     └── postgresChanges on orders table                                      │
│     └── Filter: baristaId = myId                                           │
│                                                                              │
│  2. Receive New Order                                                       │
│     └── INSERT event on orders table                                        │
│     └── Supabase Realtime pushes to Flutter                                 │
│     └── Show notification: "New order #ORD-xxx"                            │
│                                                                              │
│  3. Order Accept Page                                                      │
│     └── Show: Order details, customer address                               │
│     └── Show: Customer location on map                                      │
│     └── Buttons: [Accept] [Decline]                                         │
│                                                                              │
│  4. Accept Order                                                           │
│     └── PATCH /api/orders/:id/status → ACCEPTED                           │
│     └── Order accepted by barista                                           │
│                                                                              │
│  5. Prepare & Start Delivery                                               │
│     └── Barista prepares coffee                                             │
│     └── PATCH /api/orders/:id/status → DELIVERING                         │
│                                                                              │
│  6. Update Location (Continuous)                                            │
│     └── Geolocator.getPositionStream()                                     │
│     └── Write to Firebase RTDB: /users/{uid}/location                      │
│                                                                              │
│  7. Arrived                                                                │
│     └── PATCH /api/orders/:id/status → ARRIVED                             │
│                                                                              │
│  8. Complete                                                               │
│     └── PATCH /api/orders/:id/status → COMPLETED                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Supabase Realtime
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           CUSTOMER APP (Flutter)                               │
│                                                                              │
│  Realtime subscription on orders table                                      │
│                                                                              │
│  Receive updates:                                                          │
│  - ASSIGNED: "Barista Budi assigned!"                                      │
│  - ACCEPTED: "Budi is preparing your order..."                              │
│  - DELIVERING: "Your order is on the way!"                                │
│  - ARRIVED: "Budi has arrived!"                                            │
│  - COMPLETED: "Order completed. Enjoy!"                                     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Sequence

### Phase 1: Customer Order Creation

| # | App | Action | API/Service | Result |
|---|-----|--------|-------------|--------|
| 1.1 | Customer App | Login | Firebase Auth | Get Firebase ID Token |
| 1.2 | Customer App | Browse products | GET /api/products | Product list |
| 1.3 | Customer App | Add to cart | Local state | Cart items |
| 1.4 | Customer App | Checkout | POST /api/orders | Order created (PENDING) |
| 1.5 | Customer App | Pay | POST /api/payment/checkout | Midtrans Snap token |
| 1.6 | Customer App | Open Snap | Midtrans WebView | Customer pays |

### Phase 2: Payment Processing

| # | App | Action | API/Service | Result |
|---|-----|--------|-------------|--------|
| 2.1 | Midtrans | Customer pays | - | Payment confirmed |
| 2.2 | Midtrans | Webhook | POST /api/payment/notification | Payment status update |
| 2.3 | WebAdmin | Verify signature | SHA512 check | Signature valid |
| 2.4 | WebAdmin | Update payment | Payment.status = PAID | Payment recorded |
| 2.5 | WebAdmin | Update order | Order.paymentStatus = PAID | Payment linked |
| 2.6 | WebAdmin | Update status | Order.status = SEARCHING | Searching barista |

### Phase 3: Barista Assignment

| # | App | Action | API/Service | Result |
|---|-----|--------|-------------|--------|
| 3.1 | WebAdmin | Call edge function | POST /functions/v1/assign-barista | Assignment triggered |
| 3.2 | Edge Function | Read locations | Firebase RTDB | Barista locations |
| 3.3 | Edge Function | Filter available | Haversine | Nearest barista |
| 3.4 | Edge Function | Assign order | Update Order | Order assigned |
| 3.5 | Supabase | Broadcast | postgres_changes | Realtime event |
| 3.6 | Barista App | Receive event | Realtime subscription | New order notification |

### Phase 4: Order Fulfillment

| # | App | Action | API/Service | Result |
|---|-----|--------|-------------|--------|
| 4.1 | Barista App | View order | Order Accept Page | Order details shown |
| 4.2 | Barista App | Accept | PATCH /api/orders/:id/status | status = ACCEPTED |
| 4.3 | Barista App | Start delivery | PATCH /api/orders/:id/status | status = DELIVERING |
| 4.4 | Barista App | Update GPS | Firebase RTDB | Live location |
| 4.5 | Barista App | Arrived | PATCH /api/orders/:id/status | status = ARRIVED |
| 4.6 | Barista App | Complete | PATCH /api/orders/:id/status | status = COMPLETED |
| 4.7 | Customer App | Track | Realtime subscription | Live status updates |

---

## Data Flow Summary

```
Customer App                        WebAdmin API                      Edge Function
    │                                   │                                   │
    │──── Login (Firebase) ─────────────►                                   │
    │──── POST /orders ─────────────────►                                   │
    │◄───── Order ID ────────────────────                                   │
    │                                   │                                   │
    │──── POST /payment/checkout ───────►                                   │
    │◄───── Snap Token ──────────────────                                   │
    │                                   │                                   │
    │   [Customer pays on Midtrans]     │                                   │
    │                                   │                                   │
    │                                   │◄── POST /payment/notification ───┤
    │                                   │                                   │
    │                                   │──── POST /assign-barista ────────►│
    │                                   │                                   │
    │                                   │◄─────── Assignment Result ────────┤
    │                                   │                                   │
    │◄──── Supabase Realtime ────────────                                   │
    │   (status = ASSIGNED)             │                                   │


Barista App                         Supabase                          Edge Function
    │                                   │                                   │
    │──── Supabase Realtime ─────────────►                                   │
    │   (INSERT: barista_id = myId)     │                                   │
    │                                   │                                   │
    │──── PATCH /orders/:id/status ────►                                   │
    │   (status = ACCEPTED)             │                                   │
    │                                   │                                   │
    │──── Firebase RTDB ────────────────►                                   │
    │   (GPS location update)           │                                   │
    │                                   │                                   │
    │──── PATCH /orders/:id/status ────►                                   │
    │   (status = DELIVERING)           │                                   │
    │                                   │                                   │
    │   [Continuously update GPS]        │                                   │
    │                                   │                                   │
    │──── PATCH /orders/:id/status ────►                                   │
    │   (status = ARRIVED)              │                                   │
    │                                   │                                   │
    │──── PATCH /orders/:id/status ────►                                   │
    │   (status = COMPLETED)            │                                   │
    │                                   │                                   │


Customer App                         Supabase
    │                                   │
    │──── Supabase Realtime ─────────────►
    │   (INSERT, UPDATE events)
    │
    │   [Receive all status updates]
```

---

## Services Used Per App

### Customer App

| Service | Purpose | FREE TIER |
|---------|---------|-----------|
| Firebase Auth | Login | ✅ 10k/month |
| Firebase RTDB | GPS location | ✅ 1GB storage |
| Supabase PostgreSQL | Data storage | ✅ 500MB |
| Supabase Realtime | Order updates | ✅ |
| Midtrans Snap | Payment | Per transaction |

### Barista App

| Service | Purpose | FREE TIER |
|---------|---------|-----------|
| Firebase Auth | Login | ✅ 10k/month |
| Firebase RTDB | GPS location | ✅ 1GB storage |
| Supabase PostgreSQL | Data storage | ✅ 500MB |
| Supabase Realtime | Order notifications | ✅ |

### WebAdmin

| Service | Purpose | FREE TIER |
|---------|---------|-----------|
| Supabase PostgreSQL | Data storage | ✅ 500MB |
| Supabase Edge Functions | Barista assignment | ✅ 500k/month |
| Supabase Realtime | Maps page | ✅ |
| Midtrans API | Payment gateway | Per transaction |

---

## Files Index

### WebAdmin (This Repo)

| File | Purpose |
|------|---------|
| `src/app/api/orders/route.ts` | Order CRUD |
| `src/app/api/payment/checkout/route.ts` | Midtrans Snap |
| `src/app/api/payment/notification/route.ts` | Webhook handler |
| `src/app/api/payment/route.ts` | Payment status |
| `src/lib/supabase.ts` | `assignNearestBarista()` helper |
| `supabase/functions/assign-barista/index.ts` | Barista assignment |
| `supabase/functions/payment-webhook/index.ts` | Payment webhook |
| `supabase/functions/order-accept/index.ts` | Order accept |
| `supabase/functions/order-reject/index.ts` | Order reject |
| `supabase/functions/order-complete/index.ts` | Order complete |
| `supabase/functions/order-status/index.ts` | Order status |
| `supabase/functions/broadcast-order/index.ts` | Order pool broadcast |
| `supabase/functions/firebase-token/index.ts` | Firebase token |

### Barista App (`ascend_barista/`)

| File | Purpose |
|------|---------|
| `lib/services/auth_service.dart` | Firebase Auth |
| `lib/services/order_service.dart` | Order API calls |
| `lib/services/realtime_service.dart` | Supabase Realtime |
| `lib/services/location_service.dart` | GPS + Firebase RTDB |

### Customer App (`ascend_customer/`)

| File | Purpose |
|------|---------|
| `lib/services/auth_service.dart` | Firebase Auth |
| `lib/services/product_service.dart` | Product catalog |
| `lib/services/order_service.dart` | Order API calls |
| `lib/services/payment_service.dart` | Midtrans Snap |
| `lib/services/realtime_service.dart` | Supabase Realtime |
| `lib/services/location_service.dart` | GPS + Firebase RTDB |

---

## Related Documentation

- [System Architecture](../architecture/system-architecture.md) - Architecture overview
- [Order Assignment](../order/how-to-assign-order.md) - Barista assignment flow
- [Barista App Architecture](../barista/app-architecture.md) - Barista app details
- [Customer App Architecture](../customer/app-architecture.md) - Customer app details
- [API Contract](../order/api-contract.md) - REST endpoints

## Last Updated

2025-10-05
