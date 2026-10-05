# Midtrans Snap Integration

## Overview

ASCEND menggunakan **Midtrans Snap** sebagai payment gateway. Customer melakukan pembayaran melalui halaman Snap yang di-host oleh Midtrans.

## Payment Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MIDTRANS SNAP FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Customer Checkout                                                       │
│     └── POST /api/orders → Order created (PENDING)                        │
│                                                                             │
│  2. Create Snap Token                                                     │
│     └── POST /api/payment/checkout                                        │
│     └── Server calls Midtrans API → get snap_token                        │
│     └── Server stores snap_token in Order.snapToken                       │
│     └── Returns redirectUrl to frontend                                    │
│                                                                             │
│  3. Customer Payment                                                       │
│     └── Frontend redirects to redirectUrl (Midtrans page)                  │
│     └── Customer selects payment method & pays                             │
│                                                                             │
│  4. Midtrans Notification (Webhook)                                        │
│     └── POST /api/payment/notification                                    │
│     └── Verify signature                                                   │
│     └── Update payment status                                              │
│     └── Call assign-barista edge function                                  │
│                                                                             │
│  5. Finish Redirect                                                        │
│     └── Customer redirected to /checkout/finish?order_id=xxx               │
│     └── Frontend polls /api/payment?orderId=xxx                          │
│     └── Shows success/failure page                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### 1. Create Snap Token

```
POST /api/payment/checkout
```

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
    "snapToken": "your_snap_token",
    "redirectUrl": "https://app.midtrans.com/v2/vtweb/v1.js?token=..."
  }
}
```

### 2. Payment Notification (Webhook)

```
POST /api/payment/notification
```

Midtrans POSTs notification. Server must:
1. Verify `order_id` + `status_code` + `gross_amount` + `SERVER_KEY` signature
2. Update Order paymentStatus
3. Call assign-barista if payment SUCCESS
4. Return HTTP 200

### 3. Get Payment Status

```
GET /api/payment?orderId=xxx
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "paymentStatus": "PAID",
    "status": "ASSIGNED",
    "transactionStatus": "settlement"
  }
}
```

## Midtrans Configuration

### Sandbox (Development)

| Setting | URL |
|---------|-----|
| Payment Notification URL | `http://localhost:3000/api/payment/notification` |
| Finish Redirect URL | `http://localhost:3000/checkout/finish` |

### Production

| Setting | URL |
|---------|-----|
| Payment Notification URL | `https://api.ascend.com/api/payment/notification` |
| Finish Redirect URL | `https://api.ascend.com/checkout/finish` |

### Environment Variables

```env
# .env
# Get from: https://dashboard.sandbox.midtrans.com/settings/key
MIDTRANS_MERCHANT_ID=<your-merchant-id>
MIDTRANS_SERVER_KEY=Mid-server-...
MIDTRANS_CLIENT_KEY=Mid-client-...
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=Mid-client-...
MIDTRANS_IS_PRODUCTION=false
```

## Signature Verification

```typescript
// SHA512(order_id + status_code + gross_amount + server_key)
import crypto from 'crypto';

function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string
): boolean {
  const signatureKey = crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest('hex');
  
  return signatureKey === providedSignature;
}
```

## Transaction Status

| Midtrans Status | Our paymentStatus | Action |
|-----------------|-------------------|--------|
| settlement | PAID | Trigger barista assignment |
| capture | PAID | Trigger barista assignment |
| pending | PENDING | Wait |
| expire | EXPIRED | Order cancelled |
| deny | FAILED | Order cancelled |
| cancel | CANCELLED | Order cancelled |

## Payment Method Snapshot

When payment succeeds, we store payment method info for reporting:

```typescript
// Stored in Order
{
  paymentMethodCode: "qris",      // from Midtrans payment_type
  paymentMethodName: "QRIS",      // from Midtrans payment_name
  paymentMethodGroup: "qr_payment", // from Midtrans display_group
}
```

**Note:** This is a SNAPSHOT only. Not used for business logic.

## Files

| File | Purpose |
|------|---------|
| `src/modules/payment/midtrans.service.ts` | Midtrans Snap API client |
| `src/app/api/payment/checkout/route.ts` | Create snap token |
| `src/app/api/payment/notification/route.ts` | Webhook handler |
| `src/app/api/payment/route.ts` | Get payment status |
| `src/app/(dashboard)/checkout/finish/page.tsx` | Redirect finish page |

## Related Documentation

- [Order Assignment](../order/how-to-assign-order.md) - Complete flow
- [API Contract](../order/api-contract.md) - API endpoints
