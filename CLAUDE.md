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

Tolong jalankan migrasi pembayaran Midtrans ini dengan membaginya ke dalam 3 sub-agent...

## Project Overview

ASCEND is a **three-application system** for a coffee business:

| App | Platform | Purpose | User |
|-----|----------|---------|------|
| **WebAdmin** | Next.js Web | Dashboard admin | Admin |
| **Barista App** | Flutter Mobile | Order, stok, delivery | Barista |
| **Customer App** | Flutter Mobile | Pesan, lacak pesanan | Customer |

### Teknologi Stack

| Komponen | Teknologi |
|----------|----------|
| Frontend Web | Next.js 16, React 19, Tailwind v4, shadcn |
| Frontend Mobile | Flutter |
| Backend | Next.js API Routes |
| Database | PostgreSQL ≥ 15, Prisma 7 |
| Authentication | Firebase Auth |
| Real-time | Firebase RTDB + **Supabase Realtime** |
| Payment | Midtrans Snap (dynamic — from Midtrans API) |
| Storage | Cloudflare R2 |
| Serverless Functions | **Supabase Edge Functions** (gratis, untuk barista assignment) |

### API Base URL

```
Development: http://localhost:3000/api
Production: https://api.ascend.com/api
```

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

## Supabase Integration (Barista Assignment)

**INFO:** Plan lengkap ada di `PLANS/supabase-barista-assignment.md`

### Flow Barista Assignment via Supabase

```
Payment Webhook
    ↓
POST /api/payment/notification (existing)
    ↓
Call Supabase Edge Function: assignNearestBarista
    ↓
Haversine distance calculation
    ↓
Assign nearest online barista
    ↓
Supabase Realtime broadcast to barista app
    ↓
Barista receives order (Order Accept Page)
```

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Server-side only!
```

### Supabase Edge Functions

```
supabase/
  functions/
    assign-barista/
      index.ts    # Haversine + assign logic
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
  "distance": "1.5 km"
}
```

### Dependencies

```bash
npm install @supabase/supabase-js
```

---

## Barista Assignment Flow (Updated)

```
7. Midtrans sends webhook → POST /api/payment/notification
7a. Update order status → PAID
7b. Call Supabase Edge Function: assignNearestBarista
7c. Haversine calculation → find nearest ONLINE barista
7d. Update order: assignedBaristaId + status ASSIGNED
7e. Supabase Realtime broadcasts to barista app
8. Barista sees new order → Order Accept Page
9. Barista accepts → status ACCEPTED
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
```

### Key Models

| Model | Description |
|-------|-------------|
| User | ADMIN, CUSTOMER, BARISTA |
| Product | Master produk jadi |
| BaristaStock | Stok produk di gerobak |
| Order | Order dengan payment info |
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
| `src/lib/auth.ts` | NextAuth config |
| `src/lib/api-response.ts` | Response helpers |
| `src/lib/db.ts` | Prisma client |
| `src/modules/payment/midtrans.service.ts` | Midtrans Snap service |
| `src/modules/payment/payment.service.ts` | Payment business logic |
| `src/modules/payment/payment.validator.ts` | Payment Zod schemas |
| `src/app/api/payment/checkout/route.ts` | Midtrans Snap checkout endpoint |
| `src/app/api/payment/notification/route.ts` | Midtrans webhook |
| `src/app/(dashboard)/checkout/finish/page.tsx` | Midtrans redirect finish page |
| `prisma/schema.prisma` | Database schema |
| `tests/payment.test.ts` | Payment module unit tests |
| `tests/payment_test.html` | Midtrans integration test page |

---

---

## Knowledge Graph (graphify-out/)

This project has a navigable knowledge graph built with graphify — run `/graphify .` to rebuild, or `/graphify query "question"` to query it.

**Stats:** 293 files · 1,918 nodes · 5,505 edges · 90 communities

### God Nodes (most-connected abstractions)

These 10 nodes bridge the most communities — they are the backbone of the codebase:

| Node | Degree | Role |
|------|--------|------|
| `ok()` | 146 | API response helper — used everywhere |
| `buttonVariants` | 96 | shadcn button styling — used in 50+ places |
| `react` | 91 | React library import — core rendering |
| `lucide-react` | 83 | Icon library — used across all UI |
| `next` | 73 | Next.js framework — page/route root |
| `Button()` | 63 | Primary UI component |
| `handleAuth()` | 63 | Auth guard — protects API routes |
| `Card()` | 44 | shadcn card wrapper |
| `CardContent()` | 44 | shadcn card content |
| `CardHeader()` | 43 | shadcn card header |

### Key Communities (architectural clusters)

Groups of tightly-coupled code, ranked by cohesion:

| Community | Cohesion | Description |
|----------|----------|-------------|
| `FIFO Batch Logic` | 0.24 | FIFO consumption engine |
| `Midtrans Payment` | 0.14 | Snap token + signature |
| `Order Assignment` | 0.17 | Haversine distance assignment |
| `Auth & Firebase Admin` | 0.12 | NextAuth + Firebase Admin |
| `Maps & Leaflet` | 0.06 | Tracking map |
| `Dashboard Stats API` | 0.32 | Stats aggregation |
| `Cost History API` | 0.36 | Cost tracking API |
| `Production API` | 0.17 | Production lifecycle |
| `Report API` | 0.23 | Reporting queries |
| `Finished Products API` | 0.22 | Finished batch management |

### Cross-Cutting Concerns

These nodes span the most communities and deserve extra care when changing:

- **`next`** — connects 24 communities (betweenness 0.321): framework spine
- **`react`** — connects 33 communities (betweenness 0.130): universal rendering
- **`zod`** — connects 18 API communities (betweenness 0.088): validation backbone
- **`ok()`** — connects all API routes via `handle()` wrapper

### Low-Cohesion Communities (consider splitting)

These communities have cohesion < 0.10 — nodes are weakly interconnected:

- `UI Forms & Cards` (0.05) — 54 nodes, too broad
- `Detail Views & Dialogs` (0.04) — 52 nodes
- `List Pages & Badges` (0.05) — 42 nodes
- `Edit Pages & Utils` (0.07) — 37 nodes

### Isolated Nodes (430 nodes with ≤1 connection)

These are mostly `$schema`, `style`, `rsc`, `tsx`, `config` references — they may indicate documentation gaps or missing AST edges.

---

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
