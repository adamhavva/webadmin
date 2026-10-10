# Barista App Architecture

## Overview

Flutter application untuk barista dalam sistem ASCEND. Barista menerima order, menyiapkan kopi, dan delivering ke customer.

## App Information

| Item | Value |
|------|-------|
| **Location** | `/Users/dandiramdani/Projects/ascend/ascend_barista` |
| **Framework** | Flutter 3.x |
| **State Management** | Riverpod / BLoC (TODO) |
| **Auth** | Firebase Auth (TODO) |
| **Database** | Supabase PostgreSQL (TODO) |
| **Realtime** | Supabase Realtime (TODO) |
| **Location** | Firebase RTDB (TODO) |

## App Structure

```
lib/
├── main.dart
├── app.dart
├── core/
│   ├── constants/
│   │   ├── api_constants.dart
│   │   └── app_colors.dart
│   ├── theme/
│   │   └── app_theme.dart
│   └── utils/
│       └── formatters.dart
├── services/
│   ├── auth_service.dart          # Firebase Auth
│   ├── supabase_service.dart      # Supabase client
│   ├── order_service.dart         # Order API calls
│   ├── realtime_service.dart      # Supabase Realtime
│   └── location_service.dart      # GPS + Firebase RTDB
├── models/
│   ├── order_model.dart
│   ├── product_model.dart
│   ├── barista_model.dart
│   └── location_model.dart
├── providers/
│   ├── auth_provider.dart
│   ├── order_provider.dart
│   └── location_provider.dart
├── pages/
│   ├── login/
│   │   └── login_page.dart
│   ├── home/
│   │   └── home_page.dart
│   ├── orders/
│   │   ├── order_list_page.dart
│   │   ├── order_accept_page.dart
│   │   └── order_detail_page.dart
│   ├── delivery/
│   │   └── delivery_tracking_page.dart
│   └── settings/
│       └── settings_page.dart
└── widgets/
    ├── order_card.dart
    ├── status_badge.dart
    └── map_view.dart
```

## Pages & Navigation

### 1. Login Page

**Route:** `/login`

**Purpose:** Authenticate barista using Firebase Auth.

**Flow:**
```
1. Barista enters phone/email
2. Firebase Auth verify
3. Get Firebase ID Token
4. Call WebAdmin API to verify
5. Navigate to Home
```

**Code:**
```dart
// lib/services/auth_service.dart
class AuthService {
  final _auth = FirebaseAuth.instance;
  final _supabase = Supabase.instance.client;

  Future<UserCredential> signInWithPhone(String phone) async {
    // Send OTP
    await _auth.verifyPhoneNumber(
      phoneNumber: phone,
      verificationCompleted: (credential) {
        // Auto-sign-in on Android
        return _auth.signInWithCredential(credential);
      },
      verificationFailed: (error) {
        throw AuthException(error.message);
      },
      codeSent: (verificationId, resendToken) {
        // Show OTP input
      },
      codeAutoRetrievalTimeout: (verificationId) {
        // Timeout
      },
    );
  }

  Future<String> getIdToken() async {
    final user = _auth.currentUser;
    if (user == null) throw AuthException('Not logged in');
    return await user.getIdToken();
  }
}
```

### 2. Home Page

**Route:** `/home`

**Purpose:** Dashboard showing current status and quick actions.

**Components:**
- Status toggle (ONLINE/OFFLINE)
- Active orders count
- Today's earnings
- Quick actions (Start shift, View orders)

### 3. Order List Page

**Route:** `/orders`

**Purpose:** List all assigned orders.

**Tabs:**
- **Active:** Orders in ASSIGNED, ACCEPTED, DELIVERING, ARRIVED
- **History:** Completed and cancelled orders

**Realtime Subscription:**
```dart
// lib/services/realtime_service.dart
class OrderRealtimeService {
  final _supabase = Supabase.instance.client;
  RealtimeChannel? _channel;

  void subscribeToOrders(String baristaId, Function(Order) onNewOrder) {
    _channel = _supabase
        .channel('orders:${baristaId}')
        .onPostgresChanges(
          schema: 'public',
          table: 'orders',
          filter: PostgresChangeFilter(
            column: 'baristaId',
            value: baristaId,
          ),
          onInsert: (payload) {
            final order = Order.fromJson(payload.newRecord);
            onNewOrder(order);
          },
          onUpdate: (payload) {
            // Handle status updates
          },
        )
        .subscribe();
  }

  void dispose() {
    _channel?.unsubscribe();
  }
}
```

### 4. Order Accept Page

**Route:** `/orders/:id/accept`

**Purpose:** Show order details before accepting.

**Display:**
- Order number
- Customer name & phone
- Delivery address
- Delivery location (lat, lng)
- Order items (list)
- Total amount
- Order time
- Map showing customer location

**Actions:**
- **[Accept]** → `PATCH /api/orders/:id/status` → `ACCEPTED`
- **[Decline]** → `PATCH /api/orders/:id/status` → `CANCELLED`

**Code:**
```dart
// lib/pages/orders/order_accept_page.dart
class OrderAcceptPage extends ConsumerWidget {
  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final order = ref.watch(orderProvider(orderId));

    return Scaffold(
      appBar: AppBar(title: Text('Order #${order.orderNumber}')),
      body: Column(
        children: [
          // Customer info
          Text('Customer: ${order.customerName}'),
          Text('Phone: ${order.customerPhone}'),
          Text('Address: ${order.deliveryAddress}'),

          // Map
          Expanded(
            child: MapView(
              center: LatLng(
                order.deliveryLatitude!,
                order.deliveryLongitude!,
              ),
              markers: [
                Marker(
                  position: LatLng(
                    order.deliveryLatitude!,
                    order.deliveryLongitude!,
                  ),
                  infoWindow: InfoWindow(order.deliveryAddress),
                ),
              ],
            ),
          ),

          // Order items
          Expanded(
            child: ListView.builder(
              itemCount: order.items.length,
              itemBuilder: (context, index) {
                final item = order.items[index];
                return ListTile(
                  title: Text(item.productName),
                  subtitle: Text('Qty: ${item.quantity}'),
                  trailing: Text('Rp ${item.price}'),
                );
              },
            ),
          ),

          // Actions
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _declineOrder(context, orderId),
                  child: Text('Decline'),
                ),
              ),
              SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: () => _acceptOrder(context, orderId),
                  child: Text('Accept'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _acceptOrder(BuildContext context, String orderId) async {
    final orderService = ref.read(orderServiceProvider);
    await orderService.updateStatus(orderId, 'ACCEPTED');

    if (context.mounted) {
      Navigator.pushReplacementNamed(
        context,
        '/delivery/$orderId',
      );
    }
  }
}
```

### 5. Delivery Tracking Page

**Route:** `/delivery/:id`

**Purpose:** Track delivery progress.

**Phases:**
1. **PREPARING** - Barista prepares the order
2. **DELIVERING** - On the way to customer
3. **ARRIVED** - At customer location

**Actions:**
- **[Start Delivery]** → `PATCH .../status` → `DELIVERING`
- **[Arrived]** → `PATCH .../status` → `ARRIVED`
- **[Complete]** → `PATCH .../status` → `COMPLETED`

**Live Location Update:**
```dart
// lib/services/location_service.dart
class BaristaLocationService {
  final _rtdb = FirebaseDatabase.instance.ref();
  StreamSubscription<Position>? _locationSubscription;

  Future<void> startTracking(String baristaId, String baristaName) async {
    // Check permission
    final permission = await Geolocator.checkPermission();
    if (permission.isDenied) {
      await Geolocator.requestPermission();
    }

    // Continuous location updates
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
        'timestamp': ServerValue.timestamp,
      },
      'name': baristaName,
      'role': 'BARISTA',
      'status': 'ONLINE',
    });
  }

  void stopTracking() {
    _locationSubscription?.cancel();
  }
}
```

### 6. Settings Page

**Route:** `/settings`

**Purpose:** App settings.

**Options:**
- Status (ONLINE/OFFLINE)
- Notification settings
- Logout

---

## API Integration

### Order Status Update

```dart
// lib/services/order_service.dart
class OrderService {
  final _supabase = Supabase.instance.client;
  final _authService = AuthService();

  Future<void> updateStatus(String orderId, String status) async {
    final idToken = await _authService.getIdToken();

    await _supabase.rpc('update_order_status', params: {
      'p_order_id': orderId,
      'p_status': status,
    }).execute();

    // Alternative: HTTP call
    // await _supabase.functions.invoke('update-order-status', body: {...});
  }
}
```

### WebAdmin API Endpoints (Barista App)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PATCH | `/api/orders/:id/status` | Update order status |

**Request:**
```json
{
  "status": "ACCEPTED" | "DELIVERING" | "ARRIVED" | "COMPLETED" | "CANCELLED"
}
```

---

## Dependencies (pubspec.yaml)

```yaml
dependencies:
  flutter:
    sdk: flutter

  # Firebase
  firebase_core: ^3.0.0
  firebase_auth: ^5.0.0
  firebase_database: ^11.0.0

  # Supabase
  supabase_flutter: ^2.5.0

  # Location
  geolocator: ^12.0.0

  # Maps
  flutter_map: ^6.0.0
  latlong2: ^0.9.0

  # UI
  cupertino_icons: ^1.0.6

  # Utils
  intl: ^0.19.0
  uuid: ^4.0.0
```

---

## Status Transitions

```
ASSIGNED ────► ACCEPTED ────► DELIVERING ────► ARRIVED ────► COMPLETED
    │                                                                 ▲
    │                                                                 │
    └────────────────────── CANCELLED ◄───────────────────────────────┘
```

| From | To | Action |
|------|-----|--------|
| ASSIGNED | ACCEPTED | Barista accepts order |
| ASSIGNED | CANCELLED | Barista declines |
| ACCEPTED | DELIVERING | Barista starts delivery |
| DELIVERING | ARRIVED | Barista arrives |
| ARRIVED | COMPLETED | Order handed over |
| ANY | CANCELLED | Order cancelled |

---

## Related Documentation

- [Complete Flow](../flow/complete-flow.md) - Cross-app flow
- [Realtime Integration](../barista/realtime-integration.md) - Supabase Realtime setup
- [API Contract](../order/api-contract.md) - Order API endpoints

## Last Updated

2025-10-05
