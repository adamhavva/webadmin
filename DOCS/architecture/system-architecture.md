# System Architecture

## System Overview

ASCEND is a coffee delivery platform with 3 apps communicating through Supabase PostgreSQL, Supabase Edge Functions, Supabase Realtime, and Firebase RTDB.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER APP (Flutter)                                  │
│  - Browse menu, add to cart                                                 │
│  - Create order, pay with Midtrans Snap                                      │
│  - Track order status & barista location                                    │
│                                                                             │
│  Technologies: Firebase Auth, Supabase PostgreSQL, Supabase Realtime,         │
│                Firebase RTDB, Midtrans Snap                                 │
└─────────────────────────────┬─────────────────────────────────────────────────┘
                              │
                              │ HTTP REST / Supabase Realtime
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     SUPABASE POSTGRESQL                               │   │
│  │  Tables: User, Order, OrderItem, Product, BaristaStock, Payment    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SUPABASE REALTIME                                   │   │
│  │  postgres_changes on Order table                                     │   │
│  │  Subscribers: Barista App, WebAdmin, Customer App                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                 SUPABASE EDGE FUNCTIONS                               │   │
│  │  assign-barista: Haversine distance → nearest barista → assign       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                  FIREBASE REALTIME DATABASE                            │   │
│  │  /users/{firebaseUid}/location → { lat, lng, timestamp }             │   │
│  │  /orders/{orderId}/tracking → delivery status                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬─────────────────────────────────────────────────┘
                              │
                              │ HTTP POST (Webhooks)
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       WEBADMIN (Next.js)                                      │
│  - Dashboard for admin management                                           │
│  - Order list & management                                                │
│  - Maps page: barista locations on Leaflet                                 │
│  - Payment webhook handler                                                 │
│                                                                             │
│  Technologies: Next.js 16, Prisma 7, Supabase PostgreSQL                   │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
                    ┌─────────────────┐
                    │   MIDTRANS      │
                    │   SNAP API      │
                    └─────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BARISTA APP (Flutter)                                  │
│  - Receive orders via Supabase Realtime                                    │
│  - Accept/decline orders                                                  │
│  - Update delivery status                                                  │
│  - GPS location → Firebase RTDB                                            │
│                                                                             │
│  Technologies: Firebase Auth, Supabase PostgreSQL, Supabase Realtime,         │
│                Firebase RTDB, Geolocator                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Infrastructure Per App

| App | Auth | Database | Realtime | Location | Edge Functions |
|-----|------|----------|----------|----------|-----------------|
| **WebAdmin** | NextAuth | Supabase PostgreSQL | ✅ | Supabase (admin) | ✅ assign-barista |
| **Barista App** | Firebase Auth | Supabase PostgreSQL | ✅ | Firebase RTDB | ❌ |
| **Customer App** | Firebase Auth | Supabase PostgreSQL | ✅ | Firebase RTDB | ❌ |

---

## Edge Functions

| Function | Status | Trigger | Action |
|----------|--------|---------|--------|
| `assign-barista` | ✅ Done | Payment webhook | Haversine → nearest barista → status=ASSIGNED |
| (future) `notify-barista` | ❌ TODO | Order assigned | Push notification |
| (future) `stock-check` | ❌ TODO | Order creation | Validate barista stock |

---

## Supabase Realtime Configuration

| Channel | Source | Subscribers | Events |
|---------|--------|-------------|--------|
| `postgres_changes:orders` | PostgreSQL `orders` table | Barista App, Customer App, WebAdmin | INSERT, UPDATE |

### Enable Realtime on Table

```sql
-- Enable publication for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE "Order";

-- Verify
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

---

## Firebase RTDB Structure

```json
{
  "ascend-v2-4a67d": {
    "users": {
      "{firebaseUid}": {
        "location": {
          "lat": -6.902484,
          "lng": 107.603595,
          "accuracy": 10,
          "timestamp": 1728072345000
        },
        "role": "BARISTA",
        "name": "Budi Santoso",
        "status": "ONLINE"
      }
    },
    "orders": {
      "{orderId}": {
        "tracking": {
          "status": "DELIVERING",
          "baristaLocation": {
            "lat": -6.90,
            "lng": 107.60
          },
          "eta": "2024-10-04T14:30:00Z"
        }
      }
    }
  }
}
```

---

## Payment Flow (Midtrans Snap)

```
Customer App         WebAdmin API        Midtrans         Webhook         Edge Function
   │                     │                 │                │                  │
   │ 1. POST /orders    │                 │                │                  │
   │────────────────►   │                 │                │                  │
   │                     │                 │                │                  │
   │                     │ 2. Create Snap  │                │                  │
   │                     │────────────────►│                │                  │
   │                     │◄────────────────│ Snap token     │                  │
   │◄────────────────────│                 │                │                  │
   │                     │                 │                │                  │
   │ 3. Customer pays on Midtrans page     │                │                  │
   │                     │                 │                │                  │
   │                     │ 4. POST notification         │                  │
   │                     │◄────────────────────────────────│ Webhook         │
   │                     │                 │                │                  │
   │                     │ 5. Verify & Update             │                  │
   │                     │ 6. Call assign-barista          │                  │
   │                     │────────────────────────────────►│                  │
   │                     │                 │                │◄── Haversine     │
   │                     │                 │                │◄── Assign        │
   │                     │                 │                │                  │
```

---

## Database Schema Summary

| Table | Purpose | RLS |
|-------|---------|-----|
| User | barista/customer/admin | ❌ TODO |
| Order | orders | ❌ TODO |
| OrderItem | line items | ❌ TODO |
| Product | coffee products | ❌ TODO |
| BaristaStock | barista inventory | ❌ TODO |
| Payment | payment records | ❌ TODO |
| PaymentWebhookLog | webhook audit | ❌ TODO |
| ProductImage | product photos | |
| ProductMetadata | key-value product attrs | |
| ProductRecipe | recipe/bom | |
| RecipeItem | recipe ingredients | |
| InventoryItem | raw materials | |
| InventoryBatch | stock batches | |
| Restock | restock records | |
| Production | production runs | |
| FinishedProductBatch | finished goods batches | |
| BaristaRestock | barista restock records | |
| BaristaRestockItem | restock line items | |
| BaristaStockMovement | stock audit log | |
| OrderStatusHistory | order timeline | |
| OrderCharge | fees/taxes | |
| Setting | global config | |
| Pusat | kitchen locations | |

---

## Security Checklist

- [ ] **TODO** RLS on Order, User, BaristaStock tables
- [ ] **TODO** Firebase RTDB rules
- [ ] **TODO** Supabase API key rotation
- [x] No hardcoded secrets (all in .env / secrets manager)
- [x] Webhook signature verification (SHA512 Midtrans)
- [x] Idempotency on webhook (check existing status before update)
- [x] Atomic stock deduction (WHERE quantity >= needed)

---

## Environment

```
.env.local (WebAdmin)
.env.staging, .env.production (per-environment)
```

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [Complete Flow](flow/complete-flow.md) | Cross-app flow diagrams |
| [Order Assignment](order/how-to-assign-order.md) | Barista assignment flow |
| [Barista App](barista/app-architecture.md) | Barista app details |
| [Customer App](customer/app-architecture.md) | Customer app details |
| [Payment Integration](payment/midtrans-integration.md) | Midtrans setup |
| [Realtime Integration](barista/realtime-integration.md) | Supabase Realtime |

---

## Last Updated

2025-10-05

## Change Log

| Date | Change |
|------|--------|
| 2025-10-05 | Added complete 3-app architecture |
| 2025-10-05 | Added Edge Functions section |
| 2025-10-05 | Added Firebase RTDB structure |
| 2025-10-04 | Initial architecture |
