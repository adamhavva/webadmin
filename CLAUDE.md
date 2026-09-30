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

## Order Simulation

Menu `/orders/simulation` - Testing page for order and payment flow.

### Flow

```
1. Pilih barista terdekat (ShopeeFood-style, sorted by Haversine distance)
2. Pilih produk → cart
3. Masukkan nama & no. HP customer
4. Pilih metode pembayaran (QRIS / VA / e-Wallet)
5. Klik "Bayar" → Redirect ke Midtrans Snap page
6. Customer bayar via Midtrans
7. Midtrans webhook → Stok dikurangi → Order SEARCHING + PAID
8. Redirect back → Result
```

### Stock Reduction

After successful payment:
- BaristaStock dikurangi sesuai jumlah order
- BaristaStockMovement recorded (type: SOLD)
- Order broadcasted ke baristas via Firebase RTDB

### Race Condition Protection (Concurrency Safety)

`src/modules/payment/payment.service.ts` — `updatePaymentFromWebhook` + `reduceBaristaStockForOrder`:

1. **Webhook idempotency** — `payment.updateMany WHERE status NOT IN final_statuses` (atomic). Jika dua webhook Midtrans tiba bersamaan, hanya satu yang lolos.
2. **Order transition guard** — `order.updateMany WHERE status = 'PENDING'` (atomic). Hanya satu request yang bisa transisi ke SEARCHING, mencegah double stock deduction.
3. **Stock atomic decrement** — `baristaStock.updateMany WHERE id = X AND quantity = current_qty`. Jika ada perubahan concurrent, count=0 → throw → Prisma transaction rollback otomatis → Midtrans retry akan coba lagi.
4. **Movement idempotency** — cek `BaristaStockMovement` (type=SOLD, orderId, productId) sebelum update. Kalau sudah ada, skip.

> **JANGAN** ganti kembali ke `update()` tanpa WHERE condition. Race condition ini sudah pernah terjadi: stok tinggal 1, dipesan 2 orang bersamaan, keduanya lolos.


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
| `src/app/api/payment/cash/route.ts` | CASH (COD) payment endpoint |
| `src/app/api/payment/checkout/route.ts` | Midtrans Snap checkout endpoint |
| `src/app/api/payment/notification/route.ts` | Midtrans webhook |
| `prisma/schema.prisma` | Database schema |

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
