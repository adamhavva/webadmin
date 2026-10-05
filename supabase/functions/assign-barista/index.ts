import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment variables set by Supabase (secrets)
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const databaseUrl = Deno.env.get('DATABASE_URL');

// Firebase config
const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID') || 'ascend-v2-4a67d';
const firebaseDatabaseUrl = Deno.env.get('FIREBASE_DATABASE_URL') || `https://${firebaseProjectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;

// Haversine formula
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

  // Debug: log env vars availability
  console.log('[assign-barista] Env check:');
  console.log('[assign-barista] SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
  console.log('[assign-barista] SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET');
  console.log('[assign-barista] DATABASE_URL:', databaseUrl ? 'SET' : 'NOT SET');
  console.log('[assign-barista] FIREBASE_PROJECT_ID:', firebaseProjectId);
  console.log('[assign-barista] FIREBASE_DATABASE_URL:', firebaseDatabaseUrl);

  // Check required env vars
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[assign-barista] Missing Supabase credentials');
    return new Response(
      JSON.stringify({ success: false, message: 'Server misconfigured - missing Supabase credentials' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { orderId, customerLat, customerLng } = body;

    console.log(`[assign-barista] orderId=${orderId}, lat=${customerLat}, lng=${customerLng}`);

    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing orderId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order from Supabase
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

    const order = orders?.[0];
    if (!order) {
      return new Response(
        JSON.stringify({ success: false, message: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[assign-barista] Order found:', order.id, order.status);

    const lat = customerLat ?? order.deliveryLatitude;
    const lng = customerLng ?? order.deliveryLongitude;

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ success: false, message: 'Customer location not available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get baristas with location
    const { data: baristas, error: baristaError } = await supabase
      .from('User')
      .select('id, firebaseUid, name, phone, latitude, longitude')
      .eq('role', 'BARISTA')
      .eq('status', 'ACTIVE')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (baristaError) {
      console.error('[assign-barista] Barista query error:', baristaError);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to fetch baristas', error: baristaError.message }),
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
            console.log(`[assign-barista] Firebase: ${barista.name} at (${location.lat}, ${location.lng})`);
          }
        }
      } catch (err) {
        console.error(`[assign-barista] Firebase error for ${barista.name}:`, err);
      }
    }

    // Fallback to Supabase lat/long
    if (baristaLocations.length === 0) {
      console.log('[assign-barista] No Firebase locations, using Supabase lat/long');
      baristaLocations.push(...baristas.map(b => ({
        ...b,
        rtdbLat: b.latitude,
        rtdbLng: b.longitude,
      })));
    }

    // Check availability (no active orders)
    const baristaIds = baristaLocations.map(b => b.id);
    const { data: activeOrders } = await supabase
      .from('Order')
      .select('baristaId')
      .in('baristaId', baristaIds)
      .in('status', ['ASSIGNED', 'ACCEPTED', 'DELIVERING']);

    const busyIds = new Set(activeOrders?.map(o => o.baristaId) || []);
    const available = baristaLocations.filter(b => !busyIds.has(b.id));

    console.log(`[assign-barista] ${available.length} baristas available`);

    if (available.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'All baristas are busy with active orders' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find nearest
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

    // Update order
    const { error: updateError } = await supabase
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

    if (updateError) {
      console.error('[assign-barista] Update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to assign order', error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[assign-barista] Order ${orderId} assigned to ${nearest.name} at ${distKm} km`);

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
  }
});
