# Barista Realtime Integration

## Current Status

| Feature | Status | Notes |
|---------|--------|-------|
| Edge Function `assign-barista` | ✅ Done | Deployed to Supabase |
| Supabase Realtime (Order table) | ✅ Done | Enabled on orders table |
| Flutter SDK setup | ❌ TODO | Separate repository |
| Barista GPS → Firebase RTDB | ❌ TODO | Implement in Flutter |
| Order Accept Page | ❌ TODO | Implement in Flutter |
| Order Status Updates | ❌ TODO | Implement in Flutter |
| Maps page (WebAdmin) | ✅ Done | Leaflet + barista markers |

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
  └── Writes Order.baristaId on assignment
       (Supabase JS SDK)

Edge Function
  │
  ├── Updates Order.baristaId = baristaId
  │    (status = 'ASSIGNED')
  │
  └── Supabase Realtime broadcasts on the orders table
       (automatic — postgres_changes publication)

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
| `supabase/functions/assign-barista/index.ts` | Edge Function |
| `DOCS/order/how-to-assign-order.md` | Complete assignment flow |
| `DOCS/flow/complete-flow.md` | Three-app flow |

## Last Updated

2025-10-05
