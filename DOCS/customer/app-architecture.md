# Customer App Architecture

## Overview

Flutter application untuk customer dalam sistem ASCEND. Customer browse menu, order kopi, dan track delivery.

## App Information

| Item | Value |
|------|-------|
| **Location** | `/Users/dandiramdani/Projects/ascend/ascend_customer` |
| **Framework** | Flutter 3.x |
| **State Management** | Riverpod / BLoC (TODO) |
| **Auth** | Firebase Auth (TODO) |
| **Database** | Supabase PostgreSQL (TODO) |
| **Realtime** | Supabase Realtime (TODO) |
| **Payment** | Midtrans Snap SDK (TODO) |
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
│       ├── formatters.dart
│       └── currency_formatter.dart
├── services/
│   ├── auth_service.dart          # Firebase Auth
│   ├── supabase_service.dart      # Supabase client
│   ├── product_service.dart       # Product catalog
│   ├── cart_service.dart         # Cart management
│   ├── order_service.dart        # Order API calls
│   ├── payment_service.dart      # Midtrans Snap
│   ├── realtime_service.dart     # Supabase Realtime
│   └── location_service.dart     # GPS + Firebase RTDB
├── models/
│   ├── product_model.dart
│   ├── cart_item_model.dart
│   ├── order_model.dart
│   ├── customer_model.dart
│   └── location_model.dart
├── providers/
│   ├── auth_provider.dart
│   ├── product_provider.dart
│   ├── cart_provider.dart
│   ├── order_provider.dart
│   └── location_provider.dart
├── pages/
│   ├── auth/
│   │   ├── login_page.dart
│   │   └── register_page.dart
│   ├── home/
│   │   └── home_page.dart
│   ├── menu/
│   │   ├── menu_page.dart
│   │   └── product_detail_page.dart
│   ├── cart/
│   │   ├── cart_page.dart
│   │   └── checkout_page.dart
│   ├── orders/
│   │   ├── order_history_page.dart
│   │   └── order_detail_page.dart
│   ├── tracking/
│   │   └── order_tracking_page.dart
│   └── profile/
│       └── profile_page.dart
└── widgets/
    ├── product_card.dart
    ├── cart_item_card.dart
    ├── order_card.dart
    ├── status_badge.dart
    └── map_view.dart
```

## Pages & Navigation

### 1. Auth Flow

**Routes:** `/login`, `/register`

**Purpose:** Register and login using Firebase Auth.

**Flow:**
```
1. Customer enters phone number
2. Firebase Auth sends OTP
3. Customer enters OTP
4. Firebase Auth verifies
5. Create/update Supabase User record
6. Navigate to Home
```

**Code:**
```dart
// lib/services/auth_service.dart
class AuthService {
  final _auth = FirebaseAuth.instance;
  final _supabase = Supabase.instance.client;

  Future<User> signInWithPhone(String phone) async {
    // Send OTP
    await _auth.verifyPhoneNumber(
      phoneNumber: phone,
      // ... verification handlers
    );
  }

  Future<void> createOrUpdateUser(String firebaseUid, String phone) async {
    // Check if user exists
    final existing = await _supabase
        .from('User')
        .select()
        .eq('firebaseUid', firebaseUid)
        .maybeSingle();

    if (existing == null) {
      // Create new user
      await _supabase.from('User').insert({
        'firebaseUid': firebaseUid,
        'phone': phone,
        'role': 'CUSTOMER',
        'status': 'ACTIVE',
      });
    }
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

**Purpose:** Dashboard with quick access to menu and orders.

**Components:**
- Banner/promo section
- Categories
- Featured products
- Quick actions (View cart, My orders)

### 3. Menu Page

**Route:** `/menu`

**Purpose:** Browse product catalog.

**Features:**
- Category tabs
- Product grid/list
- Search
- Filter by availability

**API:**
```dart
// lib/services/product_service.dart
class ProductService {
  final _supabase = Supabase.instance.client;

  Future<List<Product>> getProducts({
    String? category,
    bool availableOnly = true,
  }) async {
    var query = _supabase.from('Product').select();

    if (category != null) {
      query = query.eq('category', category);
    }
    if (availableOnly) {
      query = query.eq('isAvailable', true);
    }

    final data = await query.execute();
    return data.map((json) => Product.fromJson(json)).toList();
  }
}
```

### 4. Product Detail Page

**Route:** `/menu/:id`

**Purpose:** View product details and add to cart.

**Display:**
- Product image
- Name & description
- Price
- Size options (if any)
- Add to cart button

### 5. Cart Page

**Route:** `/cart`

**Purpose:** Review cart and proceed to checkout.

**Features:**
- List cart items
- Edit quantity
- Remove items
- Subtotal calculation
- Proceed to checkout

**State Management:**
```dart
// lib/providers/cart_provider.dart
@riverpod
class CartNotifier extends _$CartNotifier {
  @override
  List<CartItem> build() => [];

  void addItem(Product product, int quantity) {
    final existingIndex = state.indexWhere((i) => i.productId == product.id);

    if (existingIndex >= 0) {
      // Update quantity
      state[existingIndex] = state[existingIndex].copyWith(
        quantity: state[existingIndex].quantity + quantity,
      );
    } else {
      // Add new item
      state.add(CartItem(
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: quantity,
      ));
    }
  }

  void removeItem(String productId) {
    state.removeWhere((i) => i.productId == productId);
  }

  void updateQuantity(String productId, int quantity) {
    final index = state.indexWhere((i) => i.productId == productId);
    if (index >= 0) {
      state[index] = state[index].copyWith(quantity: quantity);
    }
  }

  int get totalAmount => state.fold(0, (sum, item) => sum + item.total);
}
```

### 6. Checkout Page

**Route:** `/cart/checkout`

**Purpose:** Enter delivery details and confirm order.

**Form Fields:**
- Delivery address (text)
- Delivery location (map picker)
- Delivery note (optional)
- Payment method (Midtrans options)

**Flow:**
```
1. Customer fills delivery details
2. Customer clicks "Place Order"
3. POST /api/orders → Order created (PENDING)
4. POST /api/payment/checkout → Midtrans Snap token
5. Open Midtrans WebView
6. Customer pays
7. Webhook → Order updated
8. Navigate to Order Tracking
```

**Code:**
```dart
// lib/pages/cart/checkout_page.dart
class CheckoutPage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final cartTotal = ref.watch(cartTotalProvider);

    return Scaffold(
      appBar: AppBar(title: Text('Checkout')),
      body: Column(
        children: [
          // Delivery address
          TextFormField(
            decoration: InputDecoration(
              labelText: 'Delivery Address',
              hintText: 'Enter your address',
            ),
            onChanged: (value) {
              ref.read(deliveryAddressProvider.notifier).state = value;
            },
          ),

          // Map picker
          MapPicker(
            onLocationSelected: (lat, lng) {
              ref.read(deliveryLocationProvider.notifier).state = (lat, lng);
            },
          ),

          // Delivery note
          TextFormField(
            decoration: InputDecoration(
              labelText: 'Note (optional)',
              hintText: 'E.g., Call when arriving',
            ),
            onChanged: (value) {
              ref.read(deliveryNoteProvider.notifier).state = value;
            },
          ),

          // Order summary
          ...cart.map((item) => ListTile(
            title: Text(item.productName),
            subtitle: Text('Qty: ${item.quantity}'),
            trailing: Text('Rp ${item.total}'),
          )),

          // Total
          ListTile(
            title: Text('Total'),
            trailing: Text('Rp $cartTotal'),
          ),

          // Place order button
          ElevatedButton(
            onPressed: () => _placeOrder(context, ref),
            child: Text('Place Order'),
          ),
        ],
      ),
    );
  }

  Future<void> _placeOrder(BuildContext context, WidgetRef ref) async {
    final cart = ref.read(cartProvider);
    final address = ref.read(deliveryAddressProvider);
    final location = ref.read(deliveryLocationProvider);
    final note = ref.read(deliveryNoteProvider);

    // Create order
    final orderService = ref.read(orderServiceProvider);
    final order = await orderService.createOrder(
      items: cart,
      deliveryAddress: address,
      deliveryLatitude: location.$1,
      deliveryLongitude: location.$2,
      deliveryNote: note,
    );

    // Start payment
    final paymentService = ref.read(paymentServiceProvider);
    final result = await paymentService.startPayment(order.id);

    // Open Midtrans Snap
    if (result.success) {
      // Midtrans SDK handles the rest
      // Webhook will update order status
    }
  }
}
```

### 7. Order Tracking Page

**Route:** `/orders/:id/tracking`

**Purpose:** Track order status and barista location.

**Display:**
- Order status (timeline)
- Current status with animation
- Barista info (when assigned)
- Barista location (map)
- Order details

**Realtime Subscription:**
```dart
// lib/services/realtime_service.dart
class OrderRealtimeService {
  final _supabase = Supabase.instance.client;
  RealtimeChannel? _channel;

  void subscribeToOrder(String orderId, Function(Order) onUpdate) {
    _channel = _supabase
        .channel('order:$orderId')
        .onPostgresChanges(
          schema: 'public',
          table: 'orders',
          filter: PostgresChangeFilter(
            column: 'id',
            value: orderId,
          ),
          onUpdate: (payload) {
            final order = Order.fromJson(payload.newRecord);
            onUpdate(order);
          },
        )
        .subscribe();
  }

  void dispose() {
    _channel?.unsubscribe();
  }
}
```

**Status Display:**
```
┌─────────────────────────────────────────────────────────────┐
│                    ORDER STATUS                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ● PENDING ────● SEARCHING ────● ASSIGNED ────● ACCEPTED │
│                                                              │
│  ● DELIVERING ────● ARRIVED ────● COMPLETED                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8. Order History Page

**Route:** `/orders`

**Purpose:** View past orders.

**Tabs:**
- **Active:** In progress orders
- **History:** Completed orders

---

## API Integration

### Create Order

**Endpoint:** `POST /api/orders`

**Request:**
```json
{
  "items": [
    { "productId": "uuid", "quantity": 2 }
  ],
  "deliveryAddress": "Jl. Braga No. 1, Bandung",
  "deliveryLatitude": -6.9175,
  "deliveryLongitude": 107.6191,
  "deliveryNote": "Pintu merah"
}
```

### Payment Checkout

**Endpoint:** `POST /api/payment/checkout`

**Request:**
```json
{
  "orderId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "snapToken": "token_from_midtrans",
    "redirectUrl": "https://app.midtrans.com/..."
  }
}
```

---

## Payment Integration (Midtrans Snap)

```dart
// lib/services/payment_service.dart
class PaymentService {
  final _midtransSdk = MidtransSDK();

  Future<PaymentResult> startPayment(String orderId) async {
    // Get snap token from backend
    final response = await _supabase.functions.invoke('get-snap-token', body: {
      'orderId': orderId,
    });

    final snapToken = response.data['snapToken'];
    final redirectUrl = response.data['redirectUrl'];

    // Initialize Midtrans SDK
    _midtransSdk.init(
      clientKey: Config.midtransClientKey,
      isProduction: Config.isProduction,
    );

    // Start payment
    final result = await _midtransSdk.startPaymentUiFlow(
      token: snapToken,
    );

    return PaymentResult(
      success: result.isSuccess,
      transactionId: result.transactionId,
      status: result.transactionStatus,
    );
  }
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

  # Payment
  midtrans_sdk: ^1.0.0

  # State Management
  flutter_riverpod: ^2.0.0
  riverpod_annotation: ^2.0.0

  # UI
  cupertino_icons: ^1.0.6
  cached_network_image: ^3.0.0

  # Utils
  intl: ^0.19.0
  uuid: ^4.0.0
  equatable: ^2.0.0
  json_annotation: ^4.0.0
```

---

## Order Status Lifecycle

```
PENDING ────► SEARCHING ────► ASSIGNED ────► ACCEPTED ────► DELIVERING ────► ARRIVED ────► COMPLETED
  │             │               │              │              │               │
  │             │               │              │              │               │
  ▼             ▼               ▼              ▼              ▼               ▼
EXPIRED ◄──────┴────────── CANCELLED ◄──────┴──────────────┴───────────────┘
```

| Status | Description | Who |
|--------|-------------|-----|
| PENDING | Order created, awaiting payment | System |
| SEARCHING | Payment confirmed, searching barista | System |
| ASSIGNED | Barista found & assigned | System |
| ACCEPTED | Barista accepted the order | Barista |
| DELIVERING | Barista on the way | Barista |
| ARRIVED | Barista arrived at destination | Barista |
| COMPLETED | Order delivered | Customer/Barista |
| CANCELLED | Order cancelled | Customer/Admin |
| EXPIRED | Payment expired | System |

---

## Related Documentation

- [Complete Flow](../flow/complete-flow.md) - Cross-app flow
- [Payment Integration](../payment/midtrans-integration.md) - Midtrans setup
- [API Contract](../order/api-contract.md) - Order API endpoints

## Last Updated

2025-10-05
