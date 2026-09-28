# ⚠️ DEPRECATED - DOKU SNAP API Adapters

**This folder contains legacy code for the DOKU SNAP API integration.**

## Current Architecture

ASCEND now uses **DOKU Checkout API** (hosted payment page) instead of SNAP API:

- **Checkout API**: Hosted payment page at `/checkout/v1/payment`
  - Returns a `paymentUrl` that redirects customer to DOKU's hosted page
  - All payment methods appear automatically on DOKU's page
  - Simpler integration, less code

- **SNAP API (this folder)**: Direct API integration
  - Requires handling each payment method separately
  - More complex, more code
  - **No longer used**

## Files in This Folder

| File | Status | Notes |
|------|--------|-------|
| `client.ts` | Deprecated | SNAP API client |
| `qris.ts` | Deprecated | QRIS direct integration |
| `va.ts` | Deprecated | Virtual Account direct integration |
| `ewallet.ts` | Deprecated | e-Wallet direct integration |

## Why Not Removed?

Kept for reference in case we need to switch back to SNAP API for:
- Custom payment UI flows
- Lower transaction fees (SNAP sometimes has better rates)
- Direct API control

## Current Payment Flow

```
1. POST /api/payment/checkout
2. createDOKUCheckout() in doku.service.ts
3. DOKU returns paymentUrl
4. Customer redirected to DOKU hosted page
5. DOKU webhook → /api/payment/notification
6. Order status updated
```

## To Remove

When ready to clean up:
```bash
rm -rf src/modules/payment/providers/doku-snap
```

Also update `registry.ts` to remove imports.
