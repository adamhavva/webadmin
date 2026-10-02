# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# STRICT BOUNDARY:
1. JANGAN menambahkan fitur, endpoint, atau method API di luar yang diminta secara eksplisit dalam prompt ini (misalnya: JANGAN buat fitur subscription, atau payout).
2. Fokus HANYA pada alur utama: Pembuatan Transaksi Snap + Notification Webhook Callback + Finish Redirect.
3. Terapkan prinsip YAGNI: Jangan menambahkan helper, service, atau file utilitas "untuk persiapan masa depan" jika tidak digunakan secara langsung oleh endpoint yang diminta.
4. Saat merujuk ke skill Midtrans, baca HANYA dokumentasi untuk "Snap API" dan "Notification Webhook Handler". Abaikan dokumentasi untuk Direct Refund, Account Linking, dan Core API.


# [ATURAN KETAT / NO OVER-ENGINEERING]
1. Hanya buat endpoint & fungsi yang diminta secara eksplisit.
2. DILARANG membuat endpoint/method recurring, atau payout.
3. Terapkan prinsip YAGNI (You Aren't Gonna Need It).

## Project Overview

ASCEND is a **three-application system** for a coffee business:

| App | Platform | Purpose | User | Data Source |
|-----|----------|---------|------|-------------|
| **WebAdmin** | Next.js Web | Dashboard admin | Admin | Supabase PostgreSQL |
| **Barista App** | Flutter Mobile | Order, stok, delivery | Barista | Firebase Auth + Supabase |
| **Customer App** | Flutter Mobile | Pesan, lacak pesanan | Customer | Firebase Auth + Supabase |

### Teknologi Stack

| Komponen | Teknologi |
|----------|----------|
| Frontend Web | Next.js 16, React 19, Tailwind v4, shadcn |
| Frontend Mobile | Flutter |
| Backend | Next.js API Routes |
| Database | PostgreSQL ≥ 15, Prisma 7, **Supabase PostgreSQL** |
| Authentication | **Firebase Auth** (barista & customer apps) |
| Real-time | **Supabase Realtime** |
| Payment | Midtrans Snap (dynamic — from Midtrans API) |
| Storage | Cloudflare R2 |
| Serverless Functions | **Supabase Edge Functions** |

### WebAdmin Navigation (Simplified)

| Route | Page | Description |
|-------|------|-------------|
| `/orders` | Order | Order list & management |
| `/maps` | Maps | Barista locations on Leaflet map |
| `/settings` | Pengaturan | App settings |

> **Note:** No Home page — direct to Orders.

---

## WebAdmin Commands

```bash
npm run dev      # dev server, http://localhost:3000
npm run build    # production build
npm run start    # serve production build
```

```bash
npx prisma db push          # sync schema
npx prisma generate         # regenerate client
npx tsx scripts/seed-admin.ts
npx tsx scripts/seed-kopi.ts  # seed products
```

---

## Architecture

### Data Source Separation

| App | Authentication | Data Storage | Location Data |
|-----|----------------|--------------|---------------|
| WebAdmin | NextAuth | Supabase PostgreSQL | Supabase User table (latitude, longitude) |
| Barista App | Firebase Auth | Supabase PostgreSQL | Firebase RTDB (barista app only) |
| Customer App | Firebase Auth | Supabase PostgreSQL | Firebase RTDB (customer app only) |

### Path Aliases

- `@/*` → `src/*`
- `@/prisma/*` → `prisma/*`

### API Routes Pattern

```typescript
import { handle, handleAuth, ok, created } from '@/lib/api-response';
import { ApiError } from '@/lib/api-error';

export const GET = handle(async () => ok(data));
export const POST = handleAuth(async () => created(data), { roles: ['ADMIN'] });
```

### Business Logic

Business logic lives in `src/modules/<domain>/`:
- `<name>.service.ts` — core business logic
- `<name>.validator.ts` — Zod schemas

Route handlers stay thin: validate → call service → respond.

Domains: `order`, `product`, `recipe`, `production`, `barista-stock`, `user`, `setting`, `payment`, etc.

---

## Data Flow

```
InventoryItem → Restock → InventoryBatch (FIFO)
Product + Recipe → Production → FinishedProductBatch
FinishedProductBatch → BaristaStock (restock) → Order → Customer
```

**Rules:**
- Product ≠ InventoryItem (product jadi vs bahan baku)
- HPP traceable: item → batch → recipe → production → component
- FIFO consumption untuk InventoryBatch
- BaristaStock.quantity >= 0

---

## Order Lifecycle

```
PENDING → SEARCHING → ASSIGNED → ACCEPTED → DELIVERING → ARRIVED → COMPLETED
   ↓           ↓
CANCELLED    CANCELLED
```

| Status | Description | Who |
|--------|-------------|-----|
| PENDING | Order dibuat, menunggu pembayaran | System |
| SEARCHING | Mencari barista | System |
| ASSIGNED | Barista ditugaskan | System |
| ACCEPTED | Barista accept | Barista |
| DELIVERING | Dalam perjalanan | Barista |
| ARRIVED | Sampai | Barista |
| COMPLETED | Selesai | Barista/Customer/Admin |
| CANCELLED | Dibatalkan | Customer/Admin |

---

## Payment System

### Supported Methods

Payment methods are **dynamic** — fetched from Midtrans API (`GET /v1/payment-options`) based on your Midtrans Dashboard configuration. No hardcoded method codes.

Supported method types: QRIS, Virtual Account (BCA/Mandiri/BNI), E-Wallet (OVO/DANA/ShopeePay), Credit Card, Convenience Store, Cicilan.

Semua pembayaran melalui Midtrans Snap — tidak ada COD/CASH.

### Payment APIs

| Endpoint | Description |
|----------|-------------|
| `POST /api/payment/checkout` | Create Midtrans Snap token → redirectUrl |
| `POST /api/payment/notification` | Midtrans webhook callback |
| `GET /api/payment?orderId=` | Query payment status |
| `GET /api/payment/methods` | List available payment methods (dynamic from Midtrans) |

### Midtrans Dashboard Configuration

Before going live, configure these in your Midtrans Dashboard:

| Setting | URL / Value |
|---------|-------------|
| Payment Notification URL | `https://api.ascend.com/api/payment/notification` |
| Finish Redirect URL | `https://api.ascend.com/checkout/finish` |
| Sandbox Notification URL | `http://localhost:3000/api/payment/notification` |
| Sandbox Finish URL | `http://localhost:3000/checkout/finish` |

### Payment Flow (Complete)

```
1. Customer selects products → adds to cart
2. Customer submits order → POST /api/orders → status=PENDING
3. Customer clicks "Bayar" → POST /api/payment/checkout → Midtrans Snap token created
4. Customer redirected to Midtrans Snap page (payment method selected there)
5. Customer completes payment on Midtrans
6. Midtrans sends webhook → POST /api/payment/notification
7. Payment status updated → Order status → SEARCHING + PAID
8. Stock reduced → Order broadcasted to baristas
9. Customer redirected to /checkout/finish?order_id=xxx
```

### Midtrans Signature Verification

```
SHA512(order_id + status_code + gross_amount + serverKey)
```

> **Note**: Payment method information (methodCode, methodName, methodGroup) is captured as a SNAPSHOT from Midtrans webhook. It is not used for filtering or business logic — only for display in admin reports.

---

## Supabase Integration

### Barista Assignment Flow

```
Payment Webhook
    ↓
POST /api/payment/notification
    ↓
Call Supabase Edge Function: assign-barista
    ↓
Read barista locations from Supabase User table
    ↓
Haversine distance calculation
    ↓
Assign nearest ACTIVE barista
    ↓
Update order: status=ASSIGNED, baristaId
    ↓
Supabase Realtime broadcast to barista app
    ↓
Barista receives order (Order Accept Page)
```

### Edge Function: assign-barista

Reads barista locations from **Supabase User table** (not Firebase RTDB).

```typescript
// supabase/functions/assign-barista/index.ts
// Key: Reads from User table with latitude, longitude columns

const { data: baristas } = await supabase
  .from('User')
  .select('id, name, phone, role, status, latitude, longitude')
  .eq('role', 'BARISTA')
  .eq('status', 'ACTIVE')
  .not('latitude', 'is', null)
  .not('longitude', 'is', null);
```

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Server-side only!
```

### API Endpoint

```
POST /functions/v1/assign-barista

Request:
{
  "orderId": "uuid",
  "customerLat": -6.902,
  "customerLng": 107.603
}

Response:
{
  "success": true,
  "baristaId": "uuid",
  "baristaName": "Budi Santoso",
  "baristaPhone": "6281234567890",
  "distance": "1.5 km",
  "assignedAt": "2025-01-01T12:00:00Z"
}
```

---

## Firebase Integration

### Overview

Firebase is used **only for Authentication** in barista and customer apps.

| App | Firebase Usage |
|-----|----------------|
| WebAdmin | ❌ Not used |
| Barista App | Firebase Auth (login) |
| Customer App | Firebase Auth (login) |

### Firebase Auth Flow

```
Barista App:
  Firebase Auth → Get ID Token → Send to API → Verify with Firebase Admin SDK

Customer App:
  Firebase Auth → Get ID Token → Send to API → Verify with Firebase Admin SDK
```

### Environment Variables

```env
FIREBASE_DATABASE_URL=https://xxx.firebaseio.com  # Not used (Supabase for data)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}  # For token verification only
```

---

## Maps Page

WebAdmin includes a **Maps page** (`/maps`) showing barista locations on a Leaflet map.

### Features

- Display all ACTIVE baristas on map with markers
- Real-time updates via Supabase Realtime subscriptions
- Show barista info on marker click (name, phone, status)

### Data Source

Barista locations are read from **Supabase User table**:
```sql
SELECT id, name, phone, latitude, longitude, status
FROM "User"
WHERE role = 'BARISTA' AND status = 'ACTIVE'
AND latitude IS NOT NULL AND longitude IS NOT NULL
```

---

## Barista Assignment Flow (Complete)

```
1. Customer completes payment on Midtrans
2. Midtrans sends webhook → POST /api/payment/notification
3. Payment status updated → Order status → SEARCHING + PAID
4. Stock reduced → Order ready for assignment
5. Call Supabase Edge Function: assign-barista
6. Haversine calculation → find nearest ACTIVE barista from User table
7. Update order: baristaId + status = ASSIGNED
8. Supabase Realtime broadcasts to barista app
9. Barista sees new order → Order Accept Page
10. Barista accepts → status = ACCEPTED
```

---

---

## Prisma Schema

### Enums

```prisma
PaymentStatus: PENDING, PAID, FAILED, EXPIRED, REFUNDED
PaymentProvider: MIDTRANS
OrderStatus: PENDING, SEARCHING, ASSIGNED, ACCEPTED, DELIVERING, ARRIVED, COMPLETED, CANCELLED, FAILED
BaristaStockMovementType: RESTOCK, SOLD, ADJUSTMENT, RETURN, WASTE
UserRole: ADMIN, CUSTOMER, BARISTA
UserStatus: ACTIVE, INACTIVE
```

### Key Models

| Model | Description |
|-------|-------------|
| User | ADMIN, CUSTOMER, BARISTA (with latitude, longitude columns) |
| Product | Master produk jadi |
| BaristaStock | Stok produk di gerobak |
| Order | Order dengan payment info, baristaId |
| Payment | Record pembayaran via Midtrans Snap |
| PaymentWebhookLog | Log webhook Midtrans |

> **NOTE**: `PaymentProviderConfig`, `PaymentMethodConfig`, dan `CustomerPaymentAccount` telah dihapus.

---

## API Response Format

```json
{ "success": true, "data": { ... } }
```

```json
{ "success": false, "error": { "code": "ERROR", "message": "..." } }
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 500 | Internal Server Error |

---

## Important Files

| File | Purpose |
|------|---------|
| `src/proxy.ts` | Page protection |
| `src/lib/auth.ts` | NextAuth config + Firebase token verification |
| `src/lib/api-response.ts` | Response helpers |
| `src/lib/db.ts` | Prisma client |
| `src/lib/supabase.ts` | Supabase client |
| `src/modules/payment/midtrans.service.ts` | Midtrans Snap service |
| `src/modules/payment/payment.service.ts` | Payment business logic |
| `src/modules/payment/payment.validator.ts` | Payment Zod schemas |
| `src/app/api/payment/checkout/route.ts` | Midtrans Snap checkout endpoint |
| `src/app/api/payment/notification/route.ts` | Midtrans webhook |
| `src/app/(dashboard)/checkout/finish/page.tsx` | Midtrans redirect finish page |
| `src/app/(dashboard)/orders/page.tsx` | Order management page |
| `src/app/(dashboard)/maps/page.tsx` | Barista locations map (Leaflet) |
| `supabase/functions/assign-barista/index.ts` | Barista assignment edge function |
| `prisma/schema.prisma` | Database schema |
| `tests/payment.test.ts` | Payment module unit tests |
| `tests/payment_test.html` | Midtrans integration test page |

---

---

## Knowledge Graph (graphify-out/)

This project has a navigable knowledge graph built with graphify — run `/graphify .` to rebuild, or `/graphify query "question"` to query it.

**Stats:** 297 files · 1,954 nodes · 5,504 edges · 87 communities

### God Nodes (most-connected abstractions)

These 10 nodes bridge the most communities — they are the backbone of the codebase:

| Node | Degree | Role |
|------|--------|------|
| `Button()` | 153 | Primary UI component |
| `ok()` | 146 | API response helper — used everywhere |
| `buttonVariants` | 95 | shadcn button styling — used in 50+ places |
| `react` | 91 | React library import — core rendering |
| `Card()` | 90 | shadcn card wrapper |
| `CardContent()` | 90 | shadcn card content |
| `CardHeader()` | 88 | shadcn card header |
| `CardTitle()` | 86 | shadcn card title |
| `Badge()` | 85 | shadcn badge component |
| `lucide-react` | 83 | Icon library — used across all UI |

### Key Communities (architectural clusters)

Groups of tightly-coupled code, ranked by cohesion:

| Community | Cohesion | Description |
|----------|----------|-------------|
| `login-form.tsx` | 0.06 | Login/auth pages |
| `DialogContent` | 0.06 | Dialog/modal components |
| `recipe-form.tsx` | 0.06 | Recipe management forms |
| `react` | 0.08 | React core imports |
| `order-report-page.tsx` | 0.15 | Order reporting |
| `ok()` | 0.17 | API response helpers |
| `payment/index.ts` | 0.19 | Midtrans payment integration |
| `barista-stock.service.ts` | 0.22 | Barista stock management |
| `assign-barista/index.ts` | 0.25 | Supabase Edge Function |

### Cross-Cutting Concerns

These nodes span the most communities and deserve extra care when changing:

- **`Button()`** — connects 50+ files: primary UI component
- **`ok()`** — connects 146 files: API response helper used everywhere
- **`react`** — connects 33 communities: universal rendering
- **`zod`** — connects 18 API communities: validation backbone

### Hyperedges (Grouped Relationships)

- **ASCEND Payment Architecture** — Midtrans Snap integration
- **Midtrans Integration Testing Stack** — Payment test pages
- **Knowledge Graph Meta Statistics** — Graph documentation

---

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with this work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
