# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
| Real-time | Firebase RTDB |
| Payment | Midtrans Snap (QRIS, VA, e-Wallet) |
| Storage | Cloudflare R2 |

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

| Code | Provider | Type | Flow |
|------|----------|------|------|
| QRIS | Midtrans | Online | Scan QR via Midtrans Snap |
| VA_BCA, VA_MANDIRI, VA_BNI | Midtrans | Online | Virtual Account via Midtrans Snap |
| EWALLET_OVO, EWALLET_DANA, EWALLET_SHOPEEPAY | Midtrans | Online | e-Wallet via Midtrans Snap |

> **NOTE**: Tidak ada COD/CASH. Semua pembayaran melalui Midtrans Snap.

### Payment APIs

| Endpoint | Description |
|----------|-------------|
| `POST /api/payment/checkout` | Create Midtrans Snap token |
| `POST /api/payment/notification` | Midtrans webhook callback |
| `GET /api/payment?orderId=` | Query payment status |

### Midtrans Flow (semua metode)

```
1. Pilih produk → pilih metode (QRIS/VA/e-Wallet)
2. Klik Bayar → POST /api/orders + POST /api/payment/checkout
3. Redirect ke Midtrans Snap page (redirectUrl)
4. Customer bayar via Midtrans
5. Midtrans webhook → POST /api/payment/notification
6. Order SEARCHING + PAID → Stok dikurangi → Broadcast ke baristas
```

### Midtrans Signature Verification

```
SHA512(order_id + status_code + gross_amount + serverKey)
```

---
---

## Prisma Schema

### Enums

```prisma
PaymentStatus: PENDING, PAID, FAILED, EXPIRED, REFUNDED
PaymentProvider: CASH, MIDTRANS
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

> **NOTE**: `PaymentProviderConfig`, `PaymentMethodConfig`, dan `CustomerPaymentAccount` telah dihapus. Payment methods di-hardcode (QRIS, VA, e-Wallet) karena hanya pakai Midtrans.

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
| `src/app/api/payment/checkout/route.ts` | Midtrans Snap checkout endpoint |
| `src/app/api/payment/notification/route.ts` | Midtrans webhook |
| `prisma/schema.prisma` | Database schema |

---

---

## Knowledge Graph (graphify-out/)

This project has a navigable knowledge graph built with graphify — run `/graphify .` to rebuild, or `/graphify query "question"` to query it.

**Stats:** 291 files · 1,892 nodes · 4,651 edges · 99 communities

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
| `Maps & Leaflet` | 0.06 | Tracking map, inline checkout map |
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

## Documentation

| File | Description |
|------|-------------|
| `docs/API.md` | Complete API documentation |
| `docs/PAYMENT.md` | Payment system (CASH + Midtrans) |
| `docs/MIDTRANS.md` | Midtrans Payment integration |
| `docs/BARISTA.md` | Barista workflow |
| `docs/BARISTA-STOCK.md` | Barista stock management |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
