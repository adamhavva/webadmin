# Firebase Realtime Database Structure Specification

**Project:** ASCEND Coffee App Migration  
**Date:** 2026-10-02  
**Status:** Draft

---

## Overview

This document specifies the Firebase Realtime Database (RTDB) structure for the ASCEND three-app system. Firebase RTDB is used for **real-time location tracking** and **live order status updates**, while PostgreSQL remains the source of truth for business records and historical data.

### Why Firebase RTDB?

| Use Case | PostgreSQL | Firebase RTDB |
|----------|------------|---------------|
| Barista location (live) | ❌ Too slow for high-frequency updates | ✅ Sub-second sync |
| Order tracking (live) | ❌ Polling required | ✅ Push-based updates |
| Historical records | ✅ Full audit trail | ❌ Not designed for this |
| Location history | ✅ After completion | ❌ Only real-time |

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FIREBASE REALTIME DATABASE                    │
├─────────────────────────────────────────────────────────────────────┤
│  /users/{firebaseId}/           │  /orders/{orderId}/tracking/    │
│  ├─ location                    │  ├─ customerLat                  │
│  ├─ status                     │  ├─ customerLng                  │
│  ├─ role                       │  ├─ status                      │
│  ├─ name                       │  ├─ baristaId                   │
│  ├─ phone                      │  ├─ baristaLat                  │
│  └─ lastActiveAt               │  └─ baristaLng                  │
└─────────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Read/Write
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
   │ Barista │         │Customer │         │ WebAdmin │
   │   App   │         │   App   │         │   API    │
   │ (Write) │         │ (Write) │         │ (Sync)   │
   └─────────┘         └─────────┘         └─────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │ Sync
                        ┌─────▼─────┐
                        │ Supabase   │
                        │ Edge Fn    │
                        └───────────┘
```

---

## Database Path Structure

### 1. User Locations

**Path:** `/users/{firebaseId}`

```json
{
  "users": {
    "{firebaseId}": {
      "location": {
        "lat": -6.902478,
        "lng": 107.603421,
        "accuracy": 10.5,
        "updatedAt": 1696234567890
      },
      "status": "ONLINE",
      "role": "BARISTA",
      "name": "Budi Santoso",
      "phone": "+6281234567890",
      "lastActiveAt": 1696234567890
    }
  }
}
```

**Field Definitions:**

| Field | Type | Description |
|-------|------|-------------|
| `location.lat` | number | Latitude (-90 to 90) |
| `location.lng` | number | Longitude (-180 to 180) |
| `location.accuracy` | number | GPS accuracy in meters |
| `location.updatedAt` | timestamp | Unix ms of last location update |
| `status` | string | `ONLINE` or `OFFLINE` |
| `role` | string | `BARISTA`, `CUSTOMER`, or `ADMIN` |
| `name` | string | Display name |
| `phone` | string | Phone number (E.164 format) |
| `lastActiveAt` | timestamp | Unix ms of last activity |

---

### 2. Order Tracking

**Path:** `/orders/{orderId}/tracking`

```json
{
  "orders": {
    "{orderId}": {
      "tracking": {
        "customerLat": -6.902478,
        "customerLng": 107.603421,
        "customerName": "John Doe",
        "status": "DELIVERING",
        "baristaId": "firebase_abc123",
        "baristaName": "Budi Santoso",
        "baristaLat": -6.901000,
        "baristaLng": 107.604000,
        "updatedAt": 1696234567890,
        "createdAt": 1696234500000
      }
    }
  }
}
```

**Field Definitions:**

| Field | Type | Description |
|-------|------|-------------|
| `customerLat` | number | Delivery destination latitude |
| `customerLng` | number | Delivery destination longitude |
| `customerName` | string | Customer display name |
| `status` | string | Current order status |
| `baristaId` | string\|null | Assigned barista's firebaseId |
| `baristaName` | string\|null | Assigned barista's name |
| `baristaLat` | number\|null | Barista's current latitude |
| `baristaLng` | number\|null | Barista's current longitude |
| `updatedAt` | timestamp | Last update time |
| `createdAt` | timestamp | Order creation time |

**Status Values:**

| Status | Description |
|--------|-------------|
| `PENDING` | Awaiting payment |
| `SEARCHING` | Payment confirmed, searching barista |
| `ASSIGNED` | Barista assigned |
| `ACCEPTED` | Barista accepted order |
| `DELIVERING` | Barista en route |
| `ARRIVED` | Barista arrived |
| `COMPLETED` | Order completed |
| `CANCELLED` | Order cancelled |

---

## Security Rules

### `database.rules.json`

```json
{
  "rules": {
    "users": {
      "$firebaseId": {
        ".read": true,
        ".write": "auth != null && auth.uid == $firebaseId",
        "location": {
          ".write": "auth != null && auth.uid == $firebaseId"
        },
        "status": {
          ".write": "auth != null && auth.uid == $firebaseId"
        }
      }
    },
    "orders": {
      ".read": "auth != null",
      "$orderId": {
        "tracking": {
          ".read": "auth != null",
          ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'ADMIN'",
          "baristaLat": {
            ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'BARISTA'"
          },
          "baristaLng": {
            ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'BARISTA'"
          },
          "status": {
            ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() == 'BARISTA' || root.child('users').child(auth.uid).child('role').val() == 'ADMIN')"
          }
        }
      }
    }
  }
}
```

### Rule Explanations

| Path | Read | Write |
|------|------|-------|
| `/users/{id}` | Public (for tracking) | Owner only |
| `/users/{id}/location` | Public | Owner only |
| `/users/{id}/status` | Public | Owner only |
| `/orders/{id}/tracking` | Auth users | Admin only |
| `/orders/{id}/tracking/baristaLat/Lng` | Auth users | Barista only |
| `/orders/{id}/tracking/status` | Auth users | Barista or Admin |

---

## Flutter Integration

### 1. Pub Dependencies

```yaml
# pubspec.yaml
dependencies:
  firebase_core: ^3.6.0
  firebase_database: ^11.2.0
  geolocator: ^13.0.0
  permission_handler: ^11.3.0
```

### 2. Firebase Initialization

```dart
// lib/firebase_realtime.dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_database/firebase_database.dart';

class FirebaseRealtimeService {
  static final FirebaseRealtimeService _instance = FirebaseRealtimeService._internal();
  factory FirebaseRealtimeService() => _instance;
  FirebaseRealtimeService._internal();

  late FirebaseDatabase _db;
  DatabaseReference? _userRef;
  DatabaseReference? _orderTrackingRef;
  
  // Current user's Firebase ID (from Prisma User.firebaseId)
  String? _currentFirebaseId;
  String? _currentRole;
  StreamSubscription<DatabaseEvent>? _locationSubscription;
  StreamSubscription<DatabaseEvent>? _orderSubscription;

  Future<void> initialize({
    required String firebaseId,
    required String role,
  }) async {
    await Firebase.initializeApp(
      name: 'ascend-rtdb',
      options: FirebaseOptions(
        databaseURL: 'https://YOUR-PROJECT.firebaseio.com',
        // Use your Firebase config
      ),
    );

    _db = FirebaseDatabase.instance;
    _currentFirebaseId = firebaseId;
    _currentRole = role;
    
    await _db.setPersistenceEnabled(true);
    await _db.setPersistenceCacheSizeBytes(1024 * 1024); // 1MB cache
  }

  // ─────────────────────────────────────────────
  // USER LOCATION METHODS (Barista & Customer)
  // ─────────────────────────────────────────────

  /// Start tracking user's location and syncing to Firebase
  Future<void> startLocationTracking() async {
    if (_currentFirebaseId == null) return;

    _userRef = _db.ref('users').child(_currentFirebaseId!);
    
    // Set initial online status
    await _userRef!.update({
      'status': 'ONLINE',
      'role': _currentRole,
      'lastActiveAt': ServerValue.timestamp,
    });

    // Listen to GPS updates
    LocationSettings settings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // meters
    );

    Geolocator.getPositionStream(locationSettings: settings)
        .listen((position) async {
      await _userRef!.child('location').update({
        'lat': position.latitude,
        'lng': position.longitude,
        'accuracy': position.accuracy,
        'updatedAt': ServerValue.timestamp,
      });
      await _userRef!.update({
        'lastActiveAt': ServerValue.timestamp,
      });
    });

    // Handle app lifecycle
    AppLifecycleListener(onResume: _onResume);
    AppLifecycleListener(onPause: _onPause);
  }

  Future<void> _onResume() async {
    await _userRef?.update({'status': 'ONLINE'});
  }

  Future<void> _onPause() async {
    await _userRef?.update({
      'status': 'OFFLINE',
      'lastActiveAt': ServerValue.timestamp,
    });
  }

  Future<void> stopLocationTracking() async {
    await _locationSubscription?.cancel();
    await _userRef?.update({
      'status': 'OFFLINE',
      'lastActiveAt': ServerValue.timestamp,
    });
  }

  /// Get nearby online baristas (for customer app)
  Stream<List<Map<String, dynamic>>> watchNearbyBaristas({
    required double customerLat,
    required double customerLng,
    double radiusKm = 5.0,
  }) {
    return _db
        .ref('users')
        .orderByChild('status')
        .equalTo('ONLINE')
        .onValue
        .map((event) {
      if (event.snapshot.value == null) return [];
      
      final users = Map<String, dynamic>.from(event.snapshot.value as Map);
      return users.entries
          .where((e) {
            final user = Map<String, dynamic>.from(e.value as Map);
            return user['role'] == 'BARISTA' && user['location'] != null;
          })
          .where((e) {
            final user = Map<String, dynamic>.from(e.value as Map);
            final loc = Map<String, dynamic>.from(user['location'] as Map);
            final distance = _calculateDistance(
              customerLat, customerLng,
              loc['lat'] as double, loc['lng'] as double,
            );
            return distance <= radiusKm;
          })
          .map((e) => Map<String, dynamic>.from(e.value as Map))
          .toList();
    });
  }

  // ─────────────────────────────────────────────
  // ORDER TRACKING METHODS
  // ─────────────────────────────────────────────

  /// Initialize order tracking (called after payment confirmation)
  Future<void> initOrderTracking({
    required String orderId,
    required double customerLat,
    required double customerLng,
    required String customerName,
  }) async {
    _orderTrackingRef = _db.ref('orders').child(orderId).child('tracking');
    
    await _orderTrackingRef!.set({
      'customerLat': customerLat,
      'customerLng': customerLng,
      'customerName': customerName,
      'status': 'PENDING',
      'baristaId': null,
      'baristaName': null,
      'baristaLat': null,
      'baristaLng': null,
      'createdAt': ServerValue.timestamp,
      'updatedAt': ServerValue.timestamp,
    });
  }

  /// Update order status (Barista/Admin)
  Future<void> updateOrderStatus({
    required String orderId,
    required String status,
    String? baristaId,
    String? baristaName,
  }) async {
    final ref = _db.ref('orders').child(orderId).child('tracking');
    
    final updates = {
      'status': status,
      'updatedAt': ServerValue.timestamp,
    };
    
    if (baristaId != null) updates['baristaId'] = baristaId;
    if (baristaName != null) updates['baristaName'] = baristaName;
    
    await ref.update(updates);
  }

  /// Update barista location during delivery
  Future<void> updateBaristaLocation({
    required String orderId,
    required double lat,
    required double lng,
  }) async {
    await _db
        .ref('orders')
        .child(orderId)
        .child('tracking')
        .update({
      'baristaLat': lat,
      'baristaLng': lng,
      'updatedAt': ServerValue.timestamp,
    });
  }

  /// Watch order tracking updates (Customer)
  Stream<Map<String, dynamic>?> watchOrderTracking(String orderId) {
    return _db
        .ref('orders')
        .child(orderId)
        .child('tracking')
        .onValue
        .map((event) {
      if (event.snapshot.value == null) return null;
      return Map<String, dynamic>.from(event.snapshot.value as Map);
    });
  }

  /// Clear order tracking after completion
  Future<void> clearOrderTracking(String orderId) async {
    await _db.ref('orders').child(orderId).remove();
  }

  // ─────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────

  double _calculateDistance(
    double lat1, double lng1,
    double lat2, double lng2,
  ) {
    const p = 0.017453292519943295;
    final a = 0.5 -
        cos((lat2 - lat1) * p) / 2 +
        cos(lat1 * p) * cos(lat2 * p) *
            (1 - cos((lng2 - lng1) * p)) / 2;
    return 12742 * asin(sqrt(a)); // 2 * R; R = 6371 km
  }

  void dispose() {
    stopLocationTracking();
    _locationSubscription?.cancel();
    _orderSubscription?.cancel();
  }
}
```

### 3. Usage in Barista App

```dart
// lib/screens/order_screen.dart
class OrderScreen extends StatefulWidget {
  @override
  _OrderScreenState createState() => _OrderScreenState();
}

class _OrderScreenState extends State<OrderScreen> {
  final _fb = FirebaseRealtimeService();
  String? _currentOrderId;
  Map<String, dynamic>? _orderData;

  @override
  void initState() {
    super.initState();
    _fb.startLocationTracking();
  }

  void _acceptOrder(String orderId) async {
    setState(() => _currentOrderId = orderId);
    
    await _fb.updateOrderStatus(
      orderId: orderId,
      status: 'ACCEPTED',
    );

    // Start watching for status changes
    _fb.watchOrderTracking(orderId).listen((data) {
      if (data != null) {
        setState(() => _orderData = data);
        
        // Auto-update location when delivering
        if (data['status'] == 'DELIVERING') {
          _updateLocationDuringDelivery(orderId);
        }
      }
    });
  }

  void _updateLocationDuringDelivery(String orderId) {
    Geolocator.getPositionStream(
      locationSettings: LocationSettings(accuracy: LocationAccuracy.high),
    ).listen((pos) {
      _fb.updateBaristaLocation(
        orderId: orderId,
        lat: pos.latitude,
        lng: pos.longitude,
      );
    });
  }

  void _markArrived() async {
    await _fb.updateOrderStatus(
      orderId: _currentOrderId!,
      status: 'ARRIVED',
    );
  }

  void _completeOrder() async {
    await _fb.updateOrderStatus(
      orderId: _currentOrderId!,
      status: 'COMPLETED',
    );
    // PostgreSQL will be updated via webhook
  }
}
```

---

## WebAdmin API Sync

### Next.js API Route: Location Sync

```typescript
// src/app/api/firebase/sync-location/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handle, handleAuth } from '@/lib/api-response';
import { ApiError } from '@/lib/api-error';

const FIREBASE_RTDB_URL = process.env.FIREBASE_RTDB_URL!;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY!;

export const POST = handleAuth(async (req: Request) => {
  const { firebaseId, location, status } = await req.json();
  
  if (!firebaseId) {
    throw ApiError.badRequest('firebaseId is required');
  }

  // Update Firebase RTDB
  const response = await fetch(
    `${FIREBASE_RTDB_URL}/users/${firebaseId}.json?auth=${FIREBASE_API_KEY}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: location || null,
        status: status || 'ONLINE',
        lastActiveAt: Date.now(),
      }),
    }
  );

  if (!response.ok) {
    throw ApiError.internal('Failed to sync location to Firebase');
  }

  return NextResponse.json({ success: true });
});
```

### Next.js API Route: Order Tracking Sync

```typescript
// src/app/api/firebase/sync-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handle, handleAuth } from '@/lib/api-response';
import { ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/db';

const FIREBASE_RTDB_URL = process.env.FIREBASE_RTDB_URL!;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY!;

export const POST = handleAuth(async (req: Request) => {
  const { orderId, status, baristaId } = await req.json();
  
  if (!orderId) {
    throw ApiError.badRequest('orderId is required');
  }

  // Fetch order from PostgreSQL
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { 
      user: true,
      assignedBarista: { include: { user: true } },
    },
  });

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  // Get barista location if assigned
  let baristaLocation = null;
  if (baristaId) {
    const baristaResponse = await fetch(
      `${FIREBASE_RTDB_URL}/users/${baristaId}.json?auth=${FIREBASE_API_KEY}`
    );
    if (baristaResponse.ok) {
      const baristaData = await baristaResponse.json();
      baristaLocation = baristaData?.location;
    }
  }

  // Build tracking data
  const trackingData = {
    customerLat: order.latitude,
    customerLng: order.longitude,
    customerName: order.user.name,
    status: status || order.status,
    baristaId: baristaId || order.assignedBarista?.user.firebaseId || null,
    baristaName: order.assignedBarista?.user.name || null,
    baristaLat: baristaLocation?.lat || null,
    baristaLng: baristaLocation?.lng || null,
    updatedAt: Date.now(),
  };

  // Update Firebase RTDB
  const response = await fetch(
    `${FIREBASE_RTDB_URL}/orders/${orderId}/tracking.json?auth=${FIREBASE_API_KEY}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackingData),
    }
  );

  if (!response.ok) {
    throw ApiError.internal('Failed to sync order tracking to Firebase');
  }

  return NextResponse.json({ success: true });
});
```

### Webhook Integration: Payment Notification

```typescript
// src/app/api/payment/notification/route.ts (excerpt)
import { prisma } from '@/lib/db';

async function handlePaymentSuccess(orderId: string) {
  // 1. Update PostgreSQL
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { 
        status: 'SEARCHING',
        paymentStatus: 'PAID',
      },
    }),
    prisma.payment.update({
      where: { orderId },
      data: { status: 'PAID' },
    }),
  ]);

  // 2. Sync to Firebase (non-blocking)
  fetch(`${BASE_URL}/api/firebase/sync-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, status: 'SEARCHING' }),
  }).catch(console.error);

  // 3. Call Supabase Edge Function for barista assignment
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { latitude: true, longitude: true },
  });

  await fetch(`${SUPABASE_URL}/functions/v1/assign-barista`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderId,
      customerLat: order!.latitude,
      customerLng: order!.longitude,
    }),
  });
}
```

---

## Supabase Edge Function Integration

### Reading from Firebase RTDB

```typescript
// supabase/functions/assign-barista/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@^2.45.0';

const FIREBASE_RTDB_URL = Deno.env.get('FIREBASE_RTDB_URL')!;
const FIREBASE_API_KEY = Deno.env.get('FIREBASE_API_KEY')!;

interface BaristaLocation {
  uid: string;
  name: string;
  lat: number;
  lng: number;
  distance: number;
}

Deno.serve(async (req: Request) => {
  const { orderId, customerLat, customerLng } = await req.json();

  // 1. Fetch all ONLINE baristas from Firebase RTDB
  const response = await fetch(
    `${FIREBASE_RTDB_URL}/users.json?auth=${FIREBASE_API_KEY}&orderBy="status"&equalTo="ONLINE"`
  );
  
  if (!response.ok) {
    return Response.json(
      { success: false, error: 'Failed to fetch baristas' },
      { status: 500 }
    );
  }

  const users = await response.json();
  
  // 2. Filter BARISTA role and calculate distances
  const nearbyBaristas: BaristaLocation[] = [];
  
  for (const [uid, userData] of Object.entries(users)) {
    const user = userData as any;
    
    if (user.role !== 'BARISTA' || !user.location) continue;
    
    const distance = haversineDistance(
      customerLat, customerLng,
      user.location.lat, user.location.lng
    );
    
    nearbyBaristas.push({
      uid,
      name: user.name,
      lat: user.location.lat,
      lng: user.location.lng,
      distance,
    });
  }

  // 3. Sort by distance and pick nearest
  nearbyBaristas.sort((a, b) => a.distance - b.distance);
  
  if (nearbyBaristas.length === 0) {
    return Response.json({
      success: true,
      baristaId: null,
      message: 'No available baristas nearby',
    });
  }

  const nearestBarista = nearbyBaristas[0];

  // 4. Update Supabase (main database)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Find barista by firebaseId
  const { data: baristaUser } = await supabase
    .from('User')
    .select('id')
    .eq('firebaseId', nearestBarista.uid)
    .single();

  if (baristaUser) {
    // Update order assignment
    await supabase
      .from('Order')
      .update({
        assignedBaristaId: baristaUser.id,
        status: 'ASSIGNED',
      })
      .eq('id', orderId);
  }

  // 5. Sync to Firebase (update order tracking)
  await fetch(
    `${FIREBASE_RTDB_URL}/orders/${orderId}/tracking.json?auth=${FIREBASE_API_KEY}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ASSIGNED',
        baristaId: nearestBarista.uid,
        baristaName: nearestBarista.name,
        baristaLat: nearestBarista.lat,
        baristaLng: nearestBarista.lng,
        updatedAt: Date.now(),
      }),
    }
  );

  return Response.json({
    success: true,
    baristaId: nearestBarista.uid,
    baristaName: nearestBarista.name,
    distance: `${nearestBarista.distance.toFixed(2)} km`,
  });
});

// Haversine distance calculation
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
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
```

---

## Environment Variables

```env
# Firebase RTDB
FIREBASE_RTDB_URL=https://ascend-coffee-default-rtdb.firebaseio.com
FIREBASE_API_KEY=AIzaSy...

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

---

## Data Lifecycle

### Real-time Data (Firebase RTDB)

| Event | Action |
|-------|--------|
| User opens app | Write `status: ONLINE`, start location stream |
| User closes app | Write `status: OFFLINE`, stop location stream |
| Order created | Write to `/orders/{id}/tracking` |
| Payment confirmed | Update status → SEARCHING |
| Barista assigned | Update `baristaId`, `baristaLat`, `baristaLng` |
| Order completed | Remove from `/orders/{id}/tracking` |
| Order cancelled | Remove from `/orders/{id}/tracking` |

### Historical Data (PostgreSQL)

| Event | Action |
|-------|--------|
| Order completed | Write location history to `OrderLocationHistory` table |
| Order cancelled | Write location history to `OrderLocationHistory` table |
| Audit required | Query PostgreSQL, not Firebase |

### PostgreSQL Schema for Location History

```prisma
model OrderLocationHistory {
  id          String   @id @default(uuid())
  orderId     String
  latitude    Float
  longitude   Float
  recordedAt  DateTime @default(now())
  trigger     String   // "COMPLETED", "CANCELLED", "PERIODIC"
  
  order      Order    @relation(fields: [orderId], references: [id])
  
  @@index([orderId])
  @@index([recordedAt])
}
```

---

## Performance Considerations

### Optimization Strategies

1. **Flatten Data Structure**
   - Avoid nested objects beyond 2 levels
   - Use flat paths for frequently updated fields

2. **Batch Writes**
   ```dart
   // Instead of multiple updates
   await ref.update({
     'field1': value1,
     'field2': value2,
   });
   ```

3. **Connection Management**
   - Reuse Firebase connections
   - Enable offline persistence for mobile apps

4. **Indexing**
   - Index `/users/status` for filtering online users
   - Index `/orders/{id}/tracking/status` for filtering active orders

5. **Cleanup**
   - Remove completed/cancelled orders from RTDB after 24 hours
   - Use Cloud Functions scheduled cleanup

---

## Testing Checklist

- [ ] Barista can see their location updated in Firebase
- [ ] Customer can see nearby baristas on map
- [ ] Order tracking updates reflect in customer app
- [ ] Barista location updates during delivery
- [ ] Supabase Edge Function correctly reads from Firebase
- [ ] Webhook updates both PostgreSQL and Firebase
- [ ] Security rules prevent unauthorized writes
- [ ] Offline mode works correctly
- [ ] Location permissions handled gracefully

---

## Migration Path

1. **Phase 1: Dual Write**
   - Keep existing PostgreSQL location writes
   - Add Firebase RTDB writes in parallel

2. **Phase 2: Read from Firebase**
   - Customer app reads barista locations from Firebase
   - Order tracking reads from Firebase

3. **Phase 3: Deprecate PostgreSQL Location**
   - Remove location write from PostgreSQL
   - Keep only Firebase RTDB for live tracking
   - PostgreSQL stores only historical snapshots

---

## Appendix: Firebase SDK Setup

### Web (JavaScript)

```javascript
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "https://ascend-coffee-default-rtdb.firebaseio.com",
  projectId: "ascend-coffee",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
```

### React Native

```typescript
import { initializeApp } from '@react-native-firebase/app';
import '@react-native-firebase/database';

const config = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "https://ascend-coffee-default-rtdb.firebaseio.com",
  projectId: "ascend-coffee",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

initializeApp(config);
```
