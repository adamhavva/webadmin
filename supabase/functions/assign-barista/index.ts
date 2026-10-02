import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

// Haversine formula untuk hitung jarak (dalam km)
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius bumi dalam km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

serve(async (req) => {
  try {
    const { orderId, customerLat, customerLng } = await req.json()
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get all ONLINE baristas from users table
    const { data: baristas, error: baristaError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'BARISTA')
      .eq('online_status', 'ONLINE')

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
      // Use latitude and longitude columns from users table
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

    // Assign order to nearest barista (using Prisma's assignedBaristaId column)
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
