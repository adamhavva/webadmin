import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment variables set by Supabase (secrets)
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const databaseUrl = Deno.env.get('DATABASE_URL');

// Firebase config
const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID') || 'ascend-v2-4a67d';
const firebaseDatabaseUrl = Deno.env.get('FIREBASE_DATABASE_URL') || `https://${firebaseProjectId}-default-rtdb.asia-southeast1.fireasedatabase.app`;

// Haversine formula
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Direct PostgreSQL client for edge functions
async function createDirectClient(): Promise<any> {
  // Use the postgres library for direct connection
  const postgres = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');

  // Connection string for Supabase
  const connectionString = databaseUrl || `postgresql://postgres:${supabaseServiceKey}@${supabaseUrl?.replace('https://', '')}:5432/postgres`;

  const pool = new postgres.Pool({
    connectionString,
    max: 1,
  });

  return pool;
}

// Direct SQL queries
async function getOrderDirect(pool: any, orderId: string) {
  const result = await pool.queryObject(
    `SELECT id, status, "deliveryLatitude", "deliveryLongitude"
     FROM "Order" WHERE id = $1`,
    [orderId]
  );
  return result.rows[0];
}

async function getBaristasDirect(pool: any) {
  const result = await pool.queryObject(
    `SELECT id, "firebaseUid", name, phone, latitude, longitude
     FROM "User"
     WHERE role = 'BARISTA'
     AND status = 'ACTIVE'
     AND latitude IS NOT NULL
     AND longitude IS NOT NULL`
  );
  return result.rows;
}

async function getActiveOrdersDirect(pool: any, baristaIds: string[]) {
  if (baristaIds.length === 0) return [];
  const result = await pool.queryObject(
    `SELECT "baristaId" FROM "Order"
     WHERE "baristaId" = ANY($1)
     AND status IN ('ASSIGNED', 'ACCEPTED', 'DELIVERING')`,
    [baristaIds]
  );
  return result.rows;
}

async function updateOrderDirect(pool: any, orderId: string, baristaId: string, distKm: number, now: string) {
  const result = await pool.queryObject(
    `UPDATE "Order"
     SET "baristaId" = $1, status = 'ASSIGNED', "assignedAt" = $2::timestamptz, "distanceKm" = $3, "updatedAt" = $2::timestamptz
     WHERE id = $4 AND status = 'SEARCHING'
     RETURNING id`,
    [baristaId, now, distKm, orderId]
  );
  return result.rows[0];
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

  const startTime = Date.now();

  // Debug: log env vars availability
  console.log('[assign-barista] Starting at', new Date().toISOString());
  console.log('[assign-barista] Env check:');
  console.log('[assign-barista]   SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
  console.log('[assign-barista]   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET (len=' + supabaseServiceKey.length + ')' : 'NOT SET');
  console.log('[assign-barista]   DATABASE_URL:', databaseUrl ? 'SET' : 'NOT SET');
  console.log('[assign-barista]   FIREBASE_PROJECT_ID:', firebaseProjectId);
  console.log('[assign-barista]   FIREBASE_DATABASE_URL:', firebaseDatabaseUrl);

  // Check required env vars
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[assign-barista] Missing Supabase credentials');
    return new Response(
      JSON.stringify({ success: false, message: 'Server misconfigured - missing Supabase credentials' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create Supabase client (uses PostgREST internally)
  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { orderId, customerLat, customerLng } = body;

    console.log(`[assign-barista] Request: orderId=${orderId}, lat=${customerLat}, lng=${customerLng}`);

    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing orderId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid orderId format - must be UUID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order - Try direct PostgreSQL first for better permissions
    let order: any;
    let useDirectPg = false;

    try {
      console.log('[assign-barista] Trying direct PostgreSQL connection...');
      const pool = await createDirectClient();
      order = await getOrderDirect(pool, orderId);
      await pool.end();
      useDirectPg = true;
      console.log('[assign-barista] Direct PostgreSQL: success');
    } catch (directErr) {
      console.log('[assign-barista] Direct PostgreSQL failed:', directErr.message);
      console.log('[assign-barista] Falling back to Supabase client...');

      // Fallback to Supabase client
      const { data: orders, error: orderError } = await supabase
        .from('Order')
        .select('id, status, deliveryLatitude, deliveryLongitude')
        .eq('id', orderId);

      if (orderError) {
        console.error('[assign-barista] Order query error:', orderError);
        return new Response(
          JSON.stringify({ success: false, message: 'Database error', error: orderError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      order = orders?.[0];
    }

    if (!order) {
      return new Response(
        JSON.stringify({ success: false, message: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[assign-barista] Order found:', order.id, 'status:', order.status);

    const lat = customerLat ?? order.deliveryLatitude ?? order.deliverylatitude;
    const lng = customerLng ?? order.deliveryLongitude ?? order.deliverylongitude;

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      console.error('[assign-barista] Invalid location: lat=', lat, 'lng=', lng);
      return new Response(
        JSON.stringify({ success: false, message: 'Customer location not available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get baristas with location
    let baristas: any[];

    try {
      if (useDirectPg) {
        const pool = await createDirectClient();
        baristas = await getBaristasDirect(pool);
        await pool.end();
      } else {
        const { data, error: baristaError } = await supabase
          .from('User')
          .select('id, firebaseUid, name, phone, latitude, longitude')
          .eq('role', 'BARISTA')
          .eq('status', 'ACTIVE')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        if (baristaError) throw baristaError;
        baristas = data;
      }
    } catch (baristaErr: any) {
      console.error('[assign-barista] Barista query error:', baristaErr.message);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to fetch baristas', error: baristaErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[assign-barista] Found ${baristas?.length || 0} baristas with location`);

    if (!baristas?.length) {
      return new Response(
        JSON.stringify({ success: false, message: 'No baristas with location available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch real-time locations from Firebase RTDB
    const baristaLocations = [];
    for (const barista of baristas) {
      if (!barista.firebaseUid) {
        // Use Supabase lat/long if no Firebase UID
        if (barista.latitude && barista.longitude) {
          baristaLocations.push({
            ...barista,
            rtdbLat: barista.latitude,
            rtdbLng: barista.longitude,
          });
        }
        continue;
      }

      try {
        const rtdbUrl = `${firebaseDatabaseUrl}/users/${barista.firebaseUid}/location.json`;
        const rtdbRes = await fetch(rtdbUrl);

        if (rtdbRes.ok) {
          const location = await rtdbRes.json();
          if (location && location.lat && location.lng) {
            baristaLocations.push({
              ...barista,
              rtdbLat: location.lat,
              rtdbLng: location.lng,
            });
            console.log(`[assign-barista] Firebase: ${barista.name} at (${location.lat}, ${location.lng})`);
          } else if (barista.latitude && barista.longitude) {
            // Fallback to Supabase lat/long
            baristaLocations.push({
              ...barista,
              rtdbLat: barista.latitude,
              rtdbLng: barista.longitude,
            });
          }
        } else {
          console.log(`[assign-barista] Firebase fetch failed for ${barista.name}: HTTP ${rtdbRes.status}`);
          if (barista.latitude && barista.longitude) {
            baristaLocations.push({
              ...barista,
              rtdbLat: barista.latitude,
              rtdbLng: barista.longitude,
            });
          }
        }
      } catch (err) {
        console.error(`[assign-barista] Firebase error for ${barista.name}:`, err.message);
        if (barista.latitude && barista.longitude) {
          baristaLocations.push({
            ...barista,
            rtdbLat: barista.latitude,
            rtdbLng: barista.longitude,
          });
        }
      }
    }

    console.log(`[assign-barista] ${baristaLocations.length} baristas with usable locations`);

    if (baristaLocations.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No baristas with location available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check availability (no active orders)
    const baristaIds = baristaLocations.map(b => b.id);
    let activeOrders: any[];

    try {
      if (useDirectPg) {
        const pool = await createDirectClient();
        activeOrders = await getActiveOrdersDirect(pool, baristaIds);
        await pool.end();
      } else {
        const { data } = await supabase
          .from('Order')
          .select('baristaId')
          .in('baristaId', baristaIds)
          .in('status', ['ASSIGNED', 'ACCEPTED', 'DELIVERING']);
        activeOrders = data || [];
      }
    } catch (activeErr: any) {
      console.error('[assign-barista] Active orders query error:', activeErr.message);
      // Continue without filtering - assume all are available
      activeOrders = [];
    }

    const busyIds = new Set(activeOrders.map(o => o.baristaId));
    const available = baristaLocations.filter(b => !busyIds.has(b.id));

    console.log(`[assign-barista] ${busyIds.size} baristas busy, ${available.length} available`);

    if (available.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'All baristas are busy with active orders' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find nearest using Haversine
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

    console.log(`[assign-barista] Nearest: ${nearest.name} at ${distKm} km`);

    // Update order
    let updateResult: any;

    try {
      if (useDirectPg) {
        const pool = await createDirectClient();
        updateResult = await updateOrderDirect(pool, orderId, nearest.id, distKm, now);
        await pool.end();
      } else {
        const { data, error: updateError } = await supabase
          .from('Order')
          .update({
            baristaId: nearest.id,
            status: 'ASSIGNED',
            assignedAt: now,
            distanceKm: distKm,
            updatedAt: now,
          })
          .eq('id', orderId)
          .eq('status', 'SEARCHING');

        if (updateError) throw updateError;
        updateResult = { id: orderId };
      }
    } catch (updateErr: any) {
      console.error('[assign-barista] Update error:', updateErr.message);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to assign order', error: updateErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!updateResult?.id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Order not in SEARCHING status or already assigned' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[assign-barista] SUCCESS: Order ${orderId} assigned to ${nearest.name} (${distKm} km) in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        baristaId: nearest.id,
        baristaName: nearest.name,
        baristaPhone: nearest.phone,
        distance: `${distKm} km`,
        assignedAt: now,
        durationMs: duration,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[assign-barista] Unhandled error:', err.message, err.stack);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal error', error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
