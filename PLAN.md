# Plan: DOKU Payment Flow & Product Pages

## Phase 1: Fix "Input tidak valid" Error
**Root Cause:** The payment-methods list or settings page renders an object as React child.

**Fix:** Review and ensure all components properly serialize objects before rendering. Check for direct object rendering in error displays.

## Phase 2: Create Products List Page (`/products`)
**File:** `src/app/(dashboard)/products/page.tsx` (new)

**Features:**
- Two-column grid layout for products
- Infinite scroll / "Load More" pagination
- Skeleton loading states during data fetch
- Product cards showing: image, name, price, stock count
- Navigate to product detail on click

**API Enhancement:** `src/app/api/products/route.ts`
- Add cursor-based or offset pagination support
- Return all images per product (not just primary)

## Phase 3: Create Product Detail Page (`/products/[id]`)
**File:** `src/app/(dashboard)/products/[id]/page.tsx` (new)

**Features:**
- Multiple image carousel/gallery (click to enlarge)
- Full description display
- Metadata display (category, size, temperature, etc.)
- Stock information
- **Leaflet map** with:
  - Browser Geolocation API to get current position
  - Draggable marker to adjust coordinates
  - Display selected lat/lng values
  - Save button to persist location

**Existing Pattern:** Use same Leaflet/react-leaflet pattern as `orders-live-map.tsx` and `tracking-map.tsx`

## Phase 4: Test DOKU Payment Flow
**Goal:** Verify full checkout → DOKU → webhook → stock deduction works end-to-end

1. Add products to cart in simulation page
2. Navigate to checkout
3. Enter customer info and location
4. Click "Bayar Sekarang"
5. Monitor server logs for webhook notification
6. Verify order status updates correctly
7. Verify stock deduction

## Implementation Order
1. Enhance products API with pagination
2. Create products list page with skeletons
3. Create product detail page with Leaflet map
4. Fix any validation errors
5. Test payment flow end-to-end

## Key Dependencies
- Leaflet/react-leaflet (already installed)
- Browser Geolocation API
- Existing API patterns in codebase
