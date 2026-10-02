# Plan: Supabase Edge Functions + Realtime untuk Barista Assignment

> **UPDATE 2025-01**: Barista locations are now stored in **Supabase User table** (latitude, longitude columns).
> The Edge Function reads directly from Supabase PostgreSQL.
> Firebase is only used for Authentication in barista/customer apps.

## Overview

Setup Supabase untuk handle barista assignment (cari nearest barista) secara gratis menggunakan Edge Functions + Realtime subscriptions.

## Scope

| Folder | Responsibilities |
|--------|------------------|
| `webadmin/` | Supabase setup, Edge Functions, Webhook integration, Database schema |
| `ascend_barista/` | Flutter realtime subscriptions, Order Accept Page integration |

## Flow Diagram

```
Customer Checkout
      ↓
Midtrans Payment
      ↓
Webhook: /api/payment/notification
      ↓
Supabase Edge Function: assignNearestBarista
  - Haversine distance calculation
  - Assign nearest online barista
  - Update order status = ASSIGNED
      ↓
Supabase Realtime: Broadcast to barista
      ↓
Barista App: Order Accept Page (Map + Slide-Up Panel)
```

---

## Checklist Progress

### Phase 1: Setup Supabase ✅ PENDING
- [ ] Buat akun Supabase (https://supabase.com)
- [ ] Buat project baru
- [ ] Enable Realtime on orders table
- [ ] Enable Realtime on baristas table
- [ ] Get API keys (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Tambah ke webadmin/.env.local
- [ ] Update ascend_barista/.env atau lib/config/

### Phase 2: Database Schema ✅ PENDING
- [ ] Buat tabel baristas di Supabase (atau migrate dari Prisma)
- [ ] Tambah kolom: latitude, longitude, status (ONLINE/OFFLINE), fcm_token
- [ ] Setup Row Level Security (RLS) policies
- [ ] Enable Realtime untuk tabel orders
- [ ] Enable Realtime untuk tabel baristas

### Phase 3: Edge Function ✅ PENDING
- [ ] Install Supabase CLI
- [ ] Init supabase di project webadmin
- [ ] Buat edge function: `functions/assign-barista/index.ts`
- [ ] Implementasi Haversine distance calculation
- [ ] Logic: Cari barista ONLINE terdekat dari customer location
- [ ] Update orders table (status = ASSIGNED, assignedBaristaId)
- [ ] Deploy edge function
- [ ] Test edge function manually

### Phase 4: Integration dengan WebAdmin ✅ PENDING
- [ ] Install Supabase JS client: `npm install @supabase/supabase-js`
- [ ] Buat Supabase client instance: `src/lib/supabase.ts`
- [ ] Update `/api/payment/notification/route.ts` → call Supabase Edge Function
- [ ] Test payment webhook flow end-to-end
- [ ] Update .env.example dengan Supabase keys

### Phase 5: Barista App - Realtime ✅ PENDING
- [ ] Install Supabase Flutter SDK: `flutter pub add supabase_flutter`
- [ ] Setup Supabase config di ascend_barista
- [ ] Buat service: `lib/services/supabase_service.dart`
- [ ] Implementasi realtime subscription untuk orders
- [ ] Update Order Accept Page dengan realtime listener
- [ ] Handle connection states (connecting, connected, error)

### Phase 6: Push Notification ✅ PENDING
- [ ] Setup OneSignal (optional, free tier)
- [ ] Atau: Gak pakai push, realtime aja udah cukup
- [ ] Test notification delivery

### Phase 7: Documentation ✅ PENDING
- [ ] Update webadmin/CLAUDE.md dengan Supabase integration
- [ ] Update ascend_barista/CLAUDE.md dengan realtime setup
- [ ] Document API keys management

---

## Files yang Akan Dibuat/Changed

### webadmin/
```
Modified:
- .env.local                    (add Supabase keys)
- .env.example                  (document Supabase keys)
- src/app/api/payment/notification/route.ts  (call edge function)
- CLAUDE.md                     (add Supabase section)

New:
- src/lib/supabase.ts           (Supabase client)
- supabase/                     (Supabase local config)
  - functions/assign-barista/
  -   index.ts
- PLANS/supabase-barista-assignment.md  (this file)
```

### ascend_barista/
```
Modified:
- lib/main.dart                 (init Supabase)
- lib/providers/order_provider.dart  (add realtime)
- CLAUDE.md                     (add Supabase section)
- .env atau konfigurasi Supabase

New:
- lib/services/supabase_service.dart
- Konsep realtime subscription
```

---

## Supabase Configuration

### Environment Variables (webadmin)

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # ONLY di server-side, jangan expose
```

### Environment Variables (ascend_barista)

```dart
// lib/config/supabase_config.dart
const supabaseUrl = 'https://xxxxx.supabase.co';
const supabaseAnonKey = 'eyJhbGc...';
```

---

## Edge Function: assign-barista

```typescript
// supabase/functions/assign-barista/index.ts
// Deno runtime

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

interface Order {
  id: string
  customer_lat: number
  customer_lng: number
}

interface Barista {
  id: string
  name: string
  latitude: number
  longitude: number
}

// Haversine formula
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

serve(async (req) => {
  try {
    const { orderId, customerLat, customerLng } = await req.json()
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // 1. Get all ONLINE baristas
    const { data: baristas, error: baristaError } = await supabase
      .from('baristas')
      .select('*')
      .eq('status', 'ONLINE')
    
    if (baristaError || !baristas?.length) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No online baristas available' 
      }), { status: 404 })
    }
    
    // 2. Find nearest barista
    let nearestBarista: Barista | null = null
    let minDistance = Infinity
    
    for (const barista of baristas as Barista[]) {
      const distance = haversine(
        customerLat, customerLng,
        barista.latitude, barista.longitude
      )
      if (distance < minDistance) {
        minDistance = distance
        nearestBarista = barista
      }
    }
    
    if (!nearestBarista) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Could not find nearest barista' 
      }), { status: 500 })
    }
    
    // 3. Assign order to nearest barista
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        assigned_barista_id: nearestBarista.id,
        status: 'ASSIGNED',
        assigned_at: new Date().toISOString()
      })
      .eq('id', orderId)
    
    if (updateError) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Failed to assign order' 
      }), { status: 500 })
    }
    
    // 4. Broadcast via Realtime (Supabase handles this automatically)
    
    return new Response(JSON.stringify({
      success: true,
      baristaId: nearestBarista.id,
      baristaName: nearestBarista.name,
      distance: `${minDistance.toFixed(2)} km`
    }))
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: error.message 
    }), { status: 500 })
  }
})
```

---

## API Contract

### POST /functions/v1/assign-barista

**Request:**
```json
{
  "orderId": "uuid",
  "customerLat": -6.902,
  "customerLng": 107.603
}
```

**Response (Success):**
```json
{
  "success": true,
  "baristaId": "uuid",
  "baristaName": "Budi Santoso",
  "distance": "1.5 km"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "No online baristas available"
}
```

---

## Next Steps

1. User setup Supabase account
2. Create project & get API keys
3. Share keys ke developer

---

---

## Status
- [x] Phase 1-7: Completed
- [x] Firebase Integration: COMPLETED

**Last Updated:** 2025
**Status:** PLANNING
