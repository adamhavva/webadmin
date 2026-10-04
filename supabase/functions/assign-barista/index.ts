import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import postgres from 'postgres';

// Database connection - use DATABASE_URL from env
const DATABASE_URL = Deno.env.get('DATABASE_URL');
if (!DATABASE_URL) {
  console.error('[assign-barista] DATABASE_URL not set');
}

// Firebase RTDB config from env
const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID') || 'ascend-v2-4a67d';
const firebaseDatabaseUrl = Deno.env.get('FIREBASE_DATABASE_URL') ||
  `https://${firebaseProjectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;

// Haversine formula - calculate distance in km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let db;
  try {
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL not configured');
    }
    db = postgres(DATABASE_URL, { max: 1 });
  } catch (err) {
    console.error('[assign-barista] DB connection error:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Database connection failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { orderId, customerLat, customerLng } = body;

    console.log(`[assign-barista] Processing orderId=${orderId}, lat=${customerLat}, lng=${customerLng}`);

    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing orderId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order from database
    const orders = await db`SELECT id, status, "deliveryLatitude", "deliveryLongitude" FROM "Order" WHERE id = ${orderId}`;
    const order = orders[0];

    if (!order) {
      return new Response(
        JSON.stringify({ success: false, message: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use coordinates from request or from order
    const lat = customerLat ?? order.deliveryLatitude;
    const lng = customerLng ?? order.deliveryLongitude;

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ success: false, message: 'Customer location not available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get baristas with location from Supabase User table
    const baristas = await db`
      SELECT id, "firebaseUid", name, phone, latitude, longitude
      FROM "User"
      WHERE role = 'BARISTA'
        AND status = 'ACTIVE'
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
    `;

    console.log(`[assign-barista] Found ${baristas.length} baristas with location in Supabase`);

    if (baristas.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No baristas with location available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch real-time locations from Firebase RTDB
    // Path: /users/{firebaseUid}/location
    const baristaLocations = [];
    for (const barista of baristas) {
      if (!barista.firebaseUid) continue;

      try {
        const rtdbRes = await fetch(`${firebaseDatabaseUrl}/users/${barista.firebaseUid}/location.json`);
        if (rtdbRes.ok) {
          const location = await rtdbRes.json();
          if (location && location.lat && location.lng) {
            baristaLocations.push({
              ...barista,
              rtdbLat: location.lat,
              rtdbLng: location.lng,
            });
          }
        }
      } catch (err) {
        console.error(`[assign-barista] Firebase RTDB error for ${barista.name}:`, err);
      }
    }

    // Fallback: use Supabase lat/long if no Firebase data
    if (baristaLocations.length === 0) {
      console.log('[assign-barista] No Firebase locations, using Supabase lat/long');
      baristaLocations.push(...baristas.map(b => ({
        ...b,
        rtdbLat: b.latitude,
        rtdbLng: b.longitude,
      })));
    }

    // Check barista availability (no active orders)
    const baristaIds = baristaLocations.map(b => b.id);
    const activeOrders = await db`
      SELECT DISTINCT "baristaId"
      FROM "Order"
      WHERE "baristaId" IN ${db(baristaIds)}
        AND status IN ('ASSIGNED', 'ACCEPTED', 'DELIVERING')
    `;
    const busyIds = new Set(activeOrders.map(o => o.baristaId));

    const available = baristaLocations.filter(b => !busyIds.has(b.id));
    console.log(`[assign-barista] ${available.length} baristas available (not busy)`);

    if (available.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'All baristas are busy with active orders' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find nearest barista using Haversine
    let nearest = available[0];
    let minDist = Infinity;
    for (const b of available) {
      const d = haversine(lat, lng, b.rtdbLat, b.rtdbLng);
      console.log(`[assign-barista] Distance to ${b.name}: ${d.toFixed(2)} km`);
      if (d < minDist) {
        minDist = d;
        nearest = b;
      }
    }

    const now = new Date().toISOString();
    const distKm = Math.round(minDist * 100) / 100;

    // Assign order to barista
    await db`
      UPDATE "Order"
      SET
        "baristaId" = ${nearest.id},
        status = 'ASSIGNED',
        "assignedAt" = ${now},
        "distanceKm" = ${distKm},
        "updatedAt" = ${now}
      WHERE id = ${orderId}
        AND status = 'SEARCHING'
    `;

    console.log(`[assign-barista] Order ${orderId} assigned to ${nearest.name} (${nearest.id}) at ${distKm} km`);

    return new Response(
      JSON.stringify({
        success: true,
        baristaId: nearest.id,
        baristaName: nearest.name,
        baristaPhone: nearest.phone,
        distance: `${distKm} km`,
        assignedAt: now,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[assign-barista] Error:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal error', error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } finally {
    await db.end();
  }
});
