# Barista Realtime Integration

## Current Status

| Feature | Status | Notes |
|---------|--------|-------|
| Edge Function `assign-barista` | ✅ Done | Deployed to Supabase |
| Edge Function `payment-webhook` | ✅ Done | Process Midtrans notifications |
| Edge Function `order-accept` | ✅ Done | Barista accepts order |
| Edge Function `order-reject` | ✅ Done | Barista rejects order |
| Edge Function `order-complete` | ✅ Done | Mark order completed |
| Edge Function `order-status` | ✅ Done | Update order status |
| Edge Function `broadcast-order` | ✅ Done | Broadcast to order pool |
| Supabase Realtime (Order table) | ✅ Done | Enabled on orders table |
| Flutter SDK setup | ❌ TODO | Separate repository |
| Barista GPS → Firebase RTDB | ❌ TODO | Implement in Flutter |
| Order Accept Page | ❌ TODO | Implement in Flutter |
| Order Status Updates | ❌ TODO | Implement in Flutter |
| Maps page (WebAdmin) | ✅ Done | Leaflet + barista markers |
| Firebase RTDB `/order_pool/{uid}/{id}` | ✅ Done | Order pool for baristas |

## Architecture

```
Barista App (Flutter)
  │
  ├── Firebase RTDB writes barista GPS to /users/{uid}/location
  │   (Firebase Realtime Database SDK)
  │
  └── Supabase postgresChanges subscribes to Order table
      (Supabase Flutter SDK)
```

```
Edge Function assign-barista (Supabase)
  │
  ├── Reads barista locations from Firebase RTDB via REST API
  │   GET /users/{uid}/location.json
  │
  ├── Writes Order.baristaId on assignment
  │    (status = 'ASSIGNED')
  │
  └── Writes order tracking to Firebase RTDB
       PUT /orders/{orderId}/locations.json

Barista App (Flutter)                    WebAdmin
  │
  ├── Receives postgresChanges event ──────────────────► (Map markers update)
  └── Navigates to Order Accept Page (if INSERT)    │
                                                   │
                                                   └── WebAdmin maps page shows barista markers
```

## Flutter: Subscribe to Postgres Changes

```dart
// lib/services/realtime_service.dart
import 'package:supabase_flutter/supabase_flutter.dart';

class OrderRealtimeService {
  final _client = Supabase.instance.client;
  PostgresChangeEvent? _subscription;

  void subscribeToOrder(String baristaId) {
    _subscription = _client
        .channel('orders:${baristaId}')
        .postgresChanges(
          schema: 'public',
          table: 'orders',
          filter: PostgresChangeFilter(
            column: 'baristaId',
            value: baristaId,
          ),
          onInsert: (INSERT) {
            final order = INSERT.newRow;
            _onNewOrderAssigned(order);
          },
          onUpdate: (UPDATE) {
            _onOrderUpdated(UPDATE.new);
          },
          onDelete: (DELETE) {
            // Order was cancelled
          },
        )
        .subscribe();
  }

  void _onNewOrderAssigned(Map<String, dynamic> order) {
    // Show notification
    _showLocalNotification(
      title: 'New Order!',
      body: 'Order #${order['orderNumber']} assigned to you',
    );

    // Navigate to Order Accept Page
    _navigatorKey.currentState?.pushNamed(
      '/orders/${order['id']}/accept',
    );
  }

  void _onOrderUpdated(Map<String, dynamic> order) {
    final status = order['status'];
    if (status == 'CANCELLED') {
      // Order was cancelled — navigate back
      _showSnackBar('Order was cancelled');
    }
  }

  void dispose() {
    _subscription?.unsubscribe();
  }
}
```

## Flutter: Write Barista GPS to Firebase RTDB

```dart
// lib/services/location_service.dart
import 'package:firebase_database/firebase_database.dart';
import 'package:geolocator/geolocator.dart';

class BaristaLocationService {
  final _rtdb = FirebaseDatabase.instance.ref();
  StreamSubscription<Position>? _locationSubscription;

  Future<void> startTracking(String baristaId, String baristaName) async {
    // Check permission
    final permission = await Geolocator.checkPermission();
    if (permission.isDenied) {
      await Geolocator.requestPermission();
    }

    _locationSubscription = Geolocator.getPositionStream(
      locationSettings: LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10, // Update every 10 meters
      ),
    ).listen((position) {
      _updateLocation(baristaId, baristaName, position);
    });
  }

  Future<void> _updateLocation(
    String baristaId,
    String baristaName,
    Position position,
  ) async {
    await _rtdb.child('users').child(baristaId).update({
      'location': {
        'lat': position.latitude,
        'lng': position.longitude,
        'accuracy': position.accuracy,
        'bearing': position.heading,
        'speed': position.speed,
        'speedKmh': position.speed * 3.6,
        'timestamp': position.timestamp.millisecondsSinceEpoch,
        'updatedAt': ServerValue.timestamp,
      },
      'name': baristaName,
      'role': 'BARISTA',
      'status': 'ONLINE',
    });
  }

  Future<void> setOffline(String baristaId) async {
    await _rtdb.child('users').child(baristaId).update({
      'status': 'OFFLINE',
    });
    _locationSubscription?.cancel();
  }

  void dispose() {
    _locationSubscription?.cancel();
  }
}
```

## Firebase RTDB Structure

### Barista/Customer Location
```
/users/{firebaseUid}/location = {
  "lat": -6.902484,
  "lng": 107.603595,
  "accuracy": 10,
  "timestamp": 1728072345000
}
```

### Order Tracking
```
/orders/{orderId}/locations = {
  "customer": {
    "lat": -6.902,
    "lng": 107.603,
    "timestamp": 1728000000000
  },
  "barista": {
    "lat": -6.92,
    "lng": 107.61,
    "timestamp": 1728000001000
  },
  "distance": 2.5,
  "orderNumber": "ORD-001"
}
```

### Order Pool (for baristas to claim)
```
/order_pool/{baristaUid}/{orderId} = {
  "orderId": "uuid",
  "orderNumber": "ORD-001",
  "status": "PENDING",
  "createdAt": 1728000000000
}
```

## Enable Realtime on Orders Table

```sql
-- Enable publication for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE "Order";

-- Verify
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

## Testing the Postgres Changes

1. Open Supabase Dashboard → Realtime
2. Select the `orders` table
3. INSERT test row with barista_id
4. Check Flutter receives the change

## Related Documentation

| Document | Description |
|----------|-------------|
| [Complete Flow](../flow/complete-flow.md) | Cross-app flow diagrams |
| [Barista App](app-architecture.md) | Barista app architecture |
| [Order Assignment](../order/how-to-assign-order.md) | Complete assignment flow |
| [System Architecture](../architecture/system-architecture.md) | System map |

## Files

| File | Purpose |
|------|---------|
| `supabase/functions/assign-barista/index.ts` | Barista assignment with Haversine |
| `supabase/functions/payment-webhook/index.ts` | Payment webhook processing |
| `supabase/functions/order-accept/index.ts` | Barista accepts order |
| `supabase/functions/order-reject/index.ts` | Barista rejects order |
| `supabase/functions/order-complete/index.ts` | Order completion |
| `supabase/functions/order-status/index.ts` | Status updates |
| `supabase/functions/broadcast-order/index.ts` | Order pool broadcast |
| `supabase/functions/firebase-token/index.ts` | Firebase token generation |
| `DOCS/order/how-to-assign-order.md` | Complete assignment flow |
| `DOCS/flow/complete-flow.md` | Three-app flow |

## Last Updated

2025-10-05
