# Supabase Setup Prompt for AI Agent

Gunakan prompt ini untuk setup Supabase untuk Barista Assignment.

**CATATAN:** Tables sudah ada (managed by Prisma). Fokus ke Supabase Realtime + Edge Function saja.

---

## Prompt

```
Tolong setup Supabase untuk project ASCEND Barista Assignment:

### 1. Enable Realtime untuk Tabel yang Sudah Ada
Gunakan SQL Editor di Supabase Dashboard:

```sql
-- Enable realtime untuk orders table (sudah ada di Prisma)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Enable realtime untuk baristas table (sudah ada di Prisma)
ALTER PUBLICATION supabase_realtime ADD TABLE baristas;
```

### 2. Enable Realtime via Dashboard (alternatif)
Jika SQL tidak work:
1. Dashboard → Database → Tables → **orders** → Tab "Replication" → Enable
2. Dashboard → Database → Tables → **baristas** → Tab "Replication" → Enable

### 3. Setup Row Level Security (RLS)

```sql
-- Enable RLS (jika belum enabled)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE baristas ENABLE ROW LEVEL SECURITY;

-- Policy untuk orders
CREATE POLICY "orders_all_access" ON orders FOR ALL USING (true) WITH CHECK (true);

-- Policy untuk baristas
CREATE POLICY "baristas_all_access" ON baristas FOR ALL USING (true) WITH CHECK (true);
```

### 4. Buat Edge Function assign-barista

File: `supabase/functions/assign-barista/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

// Haversine formula untuk hitung jarak
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius bumi dalam km
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
    
    // Get all ONLINE baristas
    const { data: baristas, error: baristaError } = await supabase
      .from('baristas')
      .select('*')
      .eq('status', 'ONLINE')
    
    if (baristaError || !baristas?.length) {
      return new Response(JSON.stringify({ success: false, message: 'No online baristas' }), {
        headers: { "Content-Type": "application/json" },
        status: 404
      })
    }
    
    // Find nearest barista
    let nearestBarista: any = null
    let minDistance = Infinity
    
    for (const barista of baristas) {
      const distance = haversine(customerLat, customerLng, barista.latitude, barista.longitude)
      if (distance < minDistance) {
        minDistance = distance
        nearestBarista = barista
      }
    }
    
    if (!nearestBarista) {
      return new Response(JSON.stringify({ success: false, message: 'Could not find nearest barista' }), {
        headers: { "Content-Type": "application/json" },
        status: 500
      })
    }
    
    // Assign order to nearest barista
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        assigned_barista_id: nearestBarista.id,
        status: 'ASSIGNED',
        assigned_at: new Date().toISOString()
      })
      .eq('id', orderId)
    
    if (updateError) {
      return new Response(JSON.stringify({ success: false, message: 'Failed to assign order' }), {
        headers: { "Content-Type": "application/json" },
        status: 500
      })
    }
    
    return new Response(JSON.stringify({
      success: true,
      baristaId: nearestBarista.id,
      baristaName: nearestBarista.name,
      distance: `${minDistance.toFixed(2)} km`
    }), {
      headers: { "Content-Type": "application/json" }
    })
    
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    })
  }
})
```

### 5. Deploy Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref <YOUR_PROJECT_REF>

# Deploy
supabase functions deploy assign-barista
```

### 6. Get API Keys

Di Supabase Dashboard → Settings → API:
- **Project URL:** `https://xxxxx.supabase.co`
- **anon/public key:** `eyJhbGc...` (for client)
- **service_role key:** `eyJhbGc...` (server-side only, JANGAN expose!)

### 7. Environment Variables

Tambah ke `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

---

## Checklist

- [ ] Realtime enabled untuk `orders` table
- [ ] Realtime enabled untuk `baristas` table
- [ ] RLS policies configured
- [ ] Edge Function deploy berhasil
- [ ] API keys di `.env.local`
```

---

## Tips

1. **Project Ref** ada di Settings → General → Project ID
2. **Verify deployment:** Test Edge Function dengan:
   ```bash
   curl -X POST https://xxxxx.supabase.co/functions/v1/assign-barista \
     -H "Content-Type: application/json" \
     -d '{"orderId": "uuid", "customerLat": -6.902, "customerLng": 107.603}'
   ```
3. **Cek Realtime:** Buka tabel di Dashboard → Replication tab → pastikan enabled
