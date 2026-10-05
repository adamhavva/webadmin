# Order Assignment Flow

## Overview

Sistem assign order dari customer ke barista menggunakan pattern **ShopeeFood-style** dengan Supabase Edge Functions, Supabase Realtime, dan Firebase RTDB.

## Complete Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           ORDER ASSIGNMENT FLOW                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Customer Checkout                                                        │
│     └── Customer app → Create Order                                          │
│     └── POST /api/orders → Order created (PENDING)                         │
│                                                                              │
│  2. Payment (Midtrans Snap)                                               │
│     └── Customer pays on Midtrans page                                      │
│                                                                              │
│  3. Payment Webhook                                                        │
│     └── POST /api/payment/notification                                    │
│     └── Update paymentStatus = PAID, status = SEARCHING                    │
│                                                                              │
│  4. Barista Assignment (Edge Function)                                     │
│     └── WebAdmin calls: POST /functions/v1/assign-barista                │
│     └── Edge Function reads barista locations from Firebase RTDB             │
│     └── Haversine distance calculation → nearest ACTIVE barista              │
│     └── Filter: no active orders (ASSIGNED/ACCEPTED/DELIVERING)         │
│     └── Order updated: status = ASSIGNED, baristaId = <barista>           │
│                                                                              │
│  5. Realtime Broadcast                                                     │
│     └── Supabase postgres_changes on Order table                           │
│     └── Broadcasts to: Barista App, Customer App, WebAdmin               │
│                                                                              │
│  6. Barista App                                                          │
│     └── Receives Supabase Realtime INSERT event                           │
│     └── Filter: baristaId = myId                                         │
│     └── Order Accept Page → Accept/Decline                                 │
│                                                                              │
│  7. Order Lifecycle                                                       │
│     └── ASSIGNED → ACCEPTED → DELIVERING → ARRIVED → COMPLETED           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Order Status Lifecycle

| Status | Description | Who |
|--------|-------------|-----|
| PENDING | Order dibuat, menunggu pembayaran | System |
| SEARCHING | Payment confirmed, cari barista | System |
| ASSIGNED | Barista ditemukan & ditugaskan | System |
| ACCEPTED | Barista terima order | Barista |
| DELIVERING | Barista dalam perjalanan | Barista |
| ARRIVED | Barista sampai di tujuan | Barista |
| COMPLETED | Order selesai | Barista/Customer |
| CANCELLED | Order dibatalkan | Customer/Admin |

## Edge Function: assign-barista

**Deployed:** `https://wonjentqtxnnrfadkqkd.supabase.co/functions/v1/assign-barista`

**Invoked by:** Payment webhook → `POST /functions/v1/assign-barista`

**Location:** `supabase/functions/assign-barista/index.ts`

**Logic:**
1. Read barista locations from Firebase RTDB (`/users/{firebaseUid}/location`) or Supabase User table (fallback)
2. Filter by: role=BARISTA, status=ACTIVE, has location
3. Filter by: no active orders (ASSIGNED/ACCEPTED/DELIVERING)
4. Haversine distance calculation from customer to barista
5. Sort by distance (nearest first)
6. Assign to nearest barista → order.status=ASSIGNED
7. Order auto-broadcasts via Supabase Realtime (postgres_changes on Order table)

## Haversine Formula

```typescript
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}
```

## Supabase Realtime

**Status:** ✅ Order table enabled in `supabase_realtime` publication

**Flutter Code (Barista App):**

```dart
// Subscribe to Order table changes
supabase
  .channel('orders:${baristaId}')
  .onPostgresChanges(
    event: PostgresChangeEvent.all,
    schema: 'public',
    table: 'orders',
    filter: PostgresChangeFilter(
      column: 'baristaId',
      value: baristaId,
    ),
    callback: (payload) {
      if (payload.eventType == PostgresChangeEvent.insert) {
        final order = payload.newRecord;
        _showNotification('New Order #${order['orderNumber']}');
        _navigateToOrderAcceptPage(order);
      }
    },
  )
  .subscribe();
```

## Database Fields (User Table)

```sql
latitude     Float?   -- dari Firebase RTDB atau update manual
longitude    Float?   -- dari Firebase RTDB atau update manual
status       UserStatus  -- ACTIVE / INACTIVE
role         UserRole    -- BARISTA
firebaseUid   String?    -- Firebase UID untuk RTDB lookup
```

## Database Fields (Order Table)

```sql
customerId          String?
deliveryLatitude    Float?
deliveryLongitude   Float?
baristaId          String?
status              OrderStatus  -- SEARCHING, ASSIGNED, etc.
distanceKm          Float?       -- Haversine distance dalam km
assignedAt          DateTime?    -- timestamp assignment
```

## Firebase RTDB Structure (Barista Location)

```json
{
  "/users/{firebaseUid}": {
    "location": {
      "lat": -6.902,
      "lng": 107.603,
      "accuracy": 10,
      "timestamp": 1728000000000
    },
    "role": "BARISTA",
    "name": "Budi Santoso",
    "status": "ONLINE"
  }
}
```

## Testing

```bash
# Manual test edge function
curl -X POST https://wonjentqtxnnrfadkqkd.supabase.co/functions/v1/assign-barista \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "<uuid>", "customerLat": -6.902, "customerLng": 107.603}'
```

## Related Documentation

- [Complete Flow](flow/complete-flow.md) - Cross-app flow
- [Barista App](barista/app-architecture.md) - Barista app details
- [API Contract](api-contract.md) - Order & payment APIs
- [Payment Integration](../payment/midtrans-integration.md) - Midtrans Snap flow

## Last Updated

2025-10-05
