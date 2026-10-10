# ASCEND Architecture Overview

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ASCEND SYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│  │   WebAdmin  │     │ascend_barista│     │customer_app  │            │
│  │   (Next.js) │     │  (Flutter)   │     │  (Flutter)   │            │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘            │
│         │                    │                    │                        │
│         └────────────────────┼────────────────────┘                        │
│                              │                                             │
│                    ┌─────────▼─────────┐                                 │
│                    │  Supabase PostgreSQL │                                 │
│                    │  (Prisma ORM)        │                                 │
│                    └─────────┬─────────┘                                 │
│                              │                                             │
│         ┌────────────────────┼────────────────────┐                        │
│         ▼                    ▼                    ▼                        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                │
│  │  Supabase   │    │   Vercel    │    │  Firebase   │                │
│  │ Edge Func   │    │   API       │    │   RTDB      │                │
│  │(assign-     │    │  Routes     │    │(location    │                │
│  │ barista)    │    │             │    │ tracking)   │                │
│  └─────────────┘    └─────────────┘    └─────────────┘                │
│         │                    │                    │                        │
│         └────────────────────┼────────────────────┘                        │
│                              │                                             │
│                              ▼                                             │
│                    ┌─────────────────┐                                    │
│                    │    Midtrans     │                                    │
│                    │  (Snap API)     │                                    │
│                    │  Payment GW     │                                    │
│                    └─────────────────┘                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **WebAdmin** | Next.js 16, React 19 | Admin dashboard |
| **Barista App** | Flutter | Order management |
| **Customer App** | Flutter | Order placement |
| **Database** | Supabase PostgreSQL (Prisma) | Persistent data |
| **Auth** | Firebase Auth | Barista & Customer auth |
| **Realtime** | Supabase Realtime | Order assignment push |
| **Location** | Firebase RTDB | Barista GPS tracking |
| **Payment** | Midtrans Snap | Payment gateway |
| **Serverless** | Supabase Edge Functions | Barista assignment logic |
| **Hosting** | Vercel | WebAdmin deployment |

## Data Flow

### Order Creation (Customer App)

```
1. Customer selects products
2. Customer submits checkout
3. POST /api/orders → Order created (status=PENDING)
4. Customer clicks "Bayar"
5. POST /api/payment/checkout → Midtrans Snap Token created
6. Customer redirected to Midtrans payment page
7. Customer completes payment
```

### Payment & Assignment

```
8. Midtrans sends webhook → POST /api/payment/notification
9. WebAdmin verifies signature, updates:
   - paymentStatus = PAID
   - status = SEARCHING
10. WebAdmin calls: POST /functions/v1/assign-barista
11. Edge Function:
    - Reads ACTIVE baristas from Supabase User table
    - Calculates Haversine distance to customer
    - Assigns nearest barista
    - Updates order: status = ASSIGNED
12. Supabase Realtime broadcasts to Barista App
```

### Order Fulfillment

```
13. Barista App receives realtime update
14. Barista sees Order Accept Page (Map + Slide-up panel)
15. Barista taps "✅ TERIMA ORDER"
16. Order proceeds: ACCEPTED → DELIVERING → ARRIVED → COMPLETED
```

## Database Schema (Simplified)

### User Table (Key Fields for Assignment)

```sql
model User {
  id          String     @id @default(cuid())
  firebaseUid String     @unique
  
  role        UserRole   -- ADMIN, CUSTOMER, BARISTA
  status      UserStatus -- ACTIVE, INACTIVE
  
  -- Location (for Haversine calculation)
  latitude    Float?
  longitude   Float?
  
  -- For barista assignment
  -- baristaId stored in Order.baristaId
}
```

### Order Table (Key Fields)

```sql
model Order {
  id          String      @id @default(cuid())
  orderNumber String      @unique
  
  -- Customer
  customerId  String?
  customer    User?       @relation("CustomerOrders")
  
  -- Delivery location (customer's address)
  deliveryLatitude  Float?
  deliveryLongitude Float?
  deliveryAddress   String?
  
  -- Barista assignment
  baristaId   String?
  barista     User?       @relation("BaristaOrders")
  
  status      OrderStatus -- SEARCHING, ASSIGNED, ACCEPTED, etc.
  
  -- Payment
  paymentStatus PaymentStatus -- PENDING, PAID, FAILED, etc.
  paymentProvider String     -- "MIDTRANS"
  
  -- Timestamps
  assignedAt  DateTime?
  acceptedAt  DateTime?
  -- etc.
}
```

## File Structure

```
webadmin/
├── DOCS/
│   ├── README.md                    # This file
│   ├── order/
│   │   ├── how-to-assign-order.md  # Complete assignment flow
│   │   └── api-contract.md         # API endpoints
│   ├── barista/
│   │   └── realtime-integration.md  # Supabase Realtime setup
│   ├── payment/
│   │   └── midtrans-integration.md # Midtrans Snap docs
│   └── architecture/
│       └── overview.md              # This file
│
├── supabase/
│   └── functions/
│       └── assign-barista/
│           └── index.ts            # Edge Function (Haversine)
│
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── orders/             # Order endpoints
│   │       └── payment/           # Payment endpoints
│   └── modules/
│       ├── order/
│       │   └── order.service.ts   # Order business logic
│       └── payment/
│           ├── midtrans.service.ts # Midtrans Snap
│           └── payment.service.ts  # Payment logic
│
└── prisma/
    └── schema.prisma               # Database schema
```

## Key Files

| File | Purpose |
|------|---------|
| `supabase/functions/assign-barista/index.ts` | Haversine calculation + assignment |
| `src/app/api/payment/notification/route.ts` | Midtrans webhook handler |
| `src/app/api/payment/checkout/route.ts` | Create Snap token |
| `src/modules/order/order.service.ts` | Order business logic |
| `prisma/schema.prisma` | Database schema |

## Environment Variables

### Supabase

```env
# Get from: https://supabase.com/dashboard/project/<project-ref>/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Firebase RTDB (Location Tracking)

```env
# Public config (browser-safe)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDFyGlLlXvStJ0XfxiRIZMHB4o19JuaBGk
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ascend-v2-xxxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://ascend-v2-xxxxx-default-rtdb.asia-southeast1.firebasedatabase.app
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ascend-v2-xxxxx

# Admin SDK (server-side only)
FIREBASE_PROJECT_ID=ascend-v2-xxxxx
FIREBASE_DATABASE_URL=https://ascend-v2-xxxxx-default-rtdb.asia-southeast1.firebasedatabase.app
```

### Midtrans

```env
# Get from: https://dashboard.sandbox.midtrans.com/settings/key
MIDTRANS_MERCHANT_ID=<your-merchant-id>
MIDTRANS_SERVER_KEY=Mid-server-...
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=Mid-client-...
MIDTRANS_IS_PRODUCTION=false
```

### Cloudflare R2 (Storage)

```env
R2_ACCOUNT_ID=23d2d62644326d852f29a4c765005af5
R2_BUCKET_NAME=ascend-product-images
R2_PUBLIC_URL=https://pub-38396b04723744d4a3f61813ba1c3a11.r2.dev
```

> **Note:** Full API key documentation available at `credentials/API_KEYS.md`
