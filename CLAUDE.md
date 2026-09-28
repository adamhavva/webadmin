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
| Payment | DOKU (QRIS, VA, e-Wallet) |
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
npx tsx scripts/seed-payment-methods.ts  # CASH + QRIS
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

## Payment System - All Methods

### Supported Methods

| Code | Provider | Channel | Type | Flow |
|------|----------|---------|------|------|
| CASH | Internal | COD | Offline | Bayar di tempat |
| QRIS | DOKU | PREPAID | Online | Scan QR via DOKU |
| VA_BCA, VA_MANDIRI, dll | DOKU | PREPAID | Online | Virtual Account |
| EWALLET_OVO, EWALLET_DANA, EWALLET_SHOPEEPAY | DOKU | PREPAID | Online | e-Wallet |

### Payment APIs

| Endpoint | Description |
|----------|-------------|
| `POST /api/payment/cash` | Process CASH (COD) payment |
| `POST /api/payment/checkout` | Create DOKU Checkout session |
| `POST /api/payment/notification` | DOKU webhook callback |
| `GET /api/payment?orderId=` | Query payment status |

### CASH Flow (COD)

```
1. Pilih produk → pilih CASH → input jumlah bayar
2. Sistem hitung kembalian
3. Klik Bayar → POST /api/payment/cash
4. Order SEARCHING + PAID → Stok dikurangi → Broadcast ke baristas
```

### DOKU Flow (QRIS/VA/e-Wallet)

```
1. Pilih produk → pilih metode (QRIS/VA/e-Wallet)
2. Klik Bayar → POST /api/orders + POST /api/payment/checkout
3. Redirect ke DOKU Checkout page
4. Customer bayar via DOKU
5. DOKU webhook → POST /api/payment/notification
6. Order SEARCHING + PAID → Stok dikurangi → Broadcast ke baristas
```

### DOKU Signature Format

```typescript
// Signature header format: HMACSHA256=<base64>
// StringToSign:
Client-Id:{clientId}
Request-Id:{requestId}
Request-Timestamp:{timestamp}
Request-Target:{endpoint}
Digest:{bodyHash}
```

### Timestamp Format

DOKU requires: `YYYY-MM-DDTHH:mm:ssZ` (UTC, no milliseconds)

---

## Order Simulation

Menu `/orders/simulation` - Testing page for order and payment flow.

### Flow

```
1. Pilih barista → produk → cart
2. Masukkan nama & no. HP customer
3. Pilih metode pembayaran (CASH / QRIS / VA / e-Wallet)
4. Klik "Pilih Pembayaran"

For CASH:
  → Input jumlah bayar
  → Klik Bayar → Order langsung selesai
  → Stok dikurangi, broadcast ke baristas

For DOKU:
  → Redirect ke DOKU Checkout page
  → Pilih metode: QRIS / VA / e-Wallet
  → Bayar via DOKU
  → DOKU webhook → Stok dikurangi
  → Redirect back → Result
```

### Stock Reduction

After successful payment:
- BaristaStock dikurangi sesuai jumlah order
- BaristaStockMovement recorded (type: SOLD)
- Order broadcasted ke baristas via Firebase RTDB


---

## Prisma Schema

### Enums

```prisma
PaymentStatus: PENDING, PAID, FAILED, EXPIRED, REFUNDED
PaymentProvider: CASH, DOKU
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
| Payment | Record pembayaran |
| PaymentMethodConfig | Konfigurasi payment (CASH, QRIS) |

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
| `src/modules/payment/doku.service.ts` | DOKU Checkout service |
| `src/app/api/payment/cash/route.ts` | CASH (COD) payment endpoint |
| `src/app/api/payment/checkout/route.ts` | DOKU Checkout endpoint |
| `src/app/api/payment/notification/route.ts` | DOKU webhook |
| `prisma/schema.prisma` | Database schema |

---

## Documentation

| File | Description |
|------|-------------|
| `docs/API.md` | Complete API documentation |
| `docs/PAYMENT.md` | Payment system (CASH + DOKU) |
| `docs/DOKU.md` | DOKU Payment integration |
| `docs/BARISTA.md` | Barista workflow |
| `docs/BARISTA-STOCK.md` | Barista stock management |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
