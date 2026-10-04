import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface AssignBaristaRequest {
  orderId: string;
  customerLat: number;
  customerLng: number;
}

interface Barista {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  latitude: number;
  longitude: number;
}

// Haversine formula to calculate distance between two coordinates
function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

  try {
    const { orderId, customerLat, customerLng }: AssignBaristaRequest =
      await req.json();

    if (!orderId || customerLat === undefined || customerLng === undefined) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields: orderId, customerLat, customerLng',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ============================================================
    // STEP 1: Verify order exists and is in SEARCHING status
    // ============================================================
    const { data: order, error: orderError } = await supabase
      .from('Order')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Order not found',
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (order.status !== 'SEARCHING') {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Order is not in SEARCHING status (current: ${order.status})`,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // STEP 2: Use PostgreSQL advisory lock for race condition prevention
    // This ensures only ONE assignment runs at a time per order
    // ============================================================
    // Lock the order for assignment using a transaction with advisory lock
    const { data: lockResult, error: lockError } = await supabase.rpc('pg_try_advisory_lock', {
      lock_id: Math.abs(orderId.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0)),
    });

    // If advisory lock fails (another process holds it), wait and retry
    if (!lockResult) {
      // Wait 500ms then retry once
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if order was already assigned by another process
      const { data: checkOrder } = await supabase
        .from('Order')
        .select('status, baristaId')
        .eq('id', orderId)
        .single();

      if (checkOrder?.status === 'ASSIGNED' && checkOrder?.baristaId) {
        return new Response(
          JSON.stringify({
            success: true,
            baristaId: checkOrder.baristaId,
            message: 'Order already assigned by another process',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Could not acquire lock for assignment, please retry',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      // ============================================================
      // STEP 3: Get ACTIVE baristas with location
      // ============================================================
      const { data: baristas, error: baristaError } = await supabase
        .from('User')
        .select('id, name, phone, role, status, latitude, longitude')
        .eq('role', 'BARISTA')
        .eq('status', 'ACTIVE')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (baristaError || !baristas || baristas.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'No online baristas found',
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================================
      // STEP 4: Check barista availability
      // IMPORTANT: Barista must NOT have orders in active states
      // ============================================================
      const baristaIds = baristas.map(b => b.id);

      const { data: activeOrders, error: ordersError } = await supabase
        .from('Order')
        .select('baristaId')
        .in('baristaId', baristaIds)
        .in('status', ['ASSIGNED', 'ACCEPTED', 'DELIVERING']);

      if (ordersError) {
        console.error('Error fetching active orders:', ordersError);
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Failed to check barista availability',
            error: ordersError.message,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create set of baristas who are busy (have active orders)
      const busyBaristaIds = new Set(
        activeOrders?.map(o => o.baristaId).filter(Boolean) || []
      );

      // Filter available baristas
      const availableBaristas = baristas.filter(b => !busyBaristaIds.has(b.id));

      if (availableBaristas.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'All baristas are busy with active orders',
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================================
      // STEP 5: Find nearest available barista
      // ============================================================
      let nearestBarista: Barista | null = null;
      let minDistance = Infinity;

      for (const barista of availableBaristas) {
        const distance = haversine(
          customerLat,
          customerLng,
          barista.latitude,
          barista.longitude
        );
        console.log(`Barista ${barista.name} (${barista.id}): ${distance.toFixed(2)} km`);
        if (distance < minDistance) {
          minDistance = distance;
          nearestBarista = barista;
        }
      }

      if (!nearestBarista) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Could not find nearest barista',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================================
      // STEP 6: Double-check order status (re-check after lock)
      // ============================================================
      const { data: currentOrder } = await supabase
        .from('Order')
        .select('status, baristaId')
        .eq('id', orderId)
        .single();

      if (currentOrder?.status !== 'SEARCHING') {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Order status changed to ${currentOrder?.status}`,
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================================
      // STEP 7: Assign order to barista
      // Use atomic update with status check to prevent race conditions
      // ============================================================
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('Order')
        .update({
          baristaId: nearestBarista.id,
          status: 'ASSIGNED',
          assignedAt: now,
          distanceKm: Math.round(minDistance * 100) / 100,
          updatedAt: now,
        })
        .eq('id', orderId)
        .eq('status', 'SEARCHING');

      if (updateError) {
        console.error('Error updating order:', updateError);
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Failed to assign order',
            error: updateError.message,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(
        `Order ${orderId} assigned to barista ${nearestBarista.name} (${nearestBarista.id}) at ${minDistance.toFixed(2)} km`
      );

      return new Response(
        JSON.stringify({
          success: true,
          baristaId: nearestBarista.id,
          baristaName: nearestBarista.name,
          baristaPhone: nearestBarista.phone,
          distance: `${minDistance.toFixed(2)} km`,
          assignedAt: now,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } finally {
      // Always release the advisory lock
      await supabase.rpc('pg_advisory_unlock', {
        lock_id: Math.abs(orderId.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0)),
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
