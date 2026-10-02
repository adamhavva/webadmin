import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface AssignBaristaRequest {
  orderId: string;
  customerLat: number;
  customerLng: number;
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

    // Get online baristas from Supabase with location (ACTIVE status)
    const { data: baristas, error: baristaError } = await supabase
      .from('User')
      .select('id, name, phone, role, status, latitude, longitude')
      .eq('role', 'BARISTA')
      .eq('status', 'ACTIVE')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (baristaError) {
      console.error('Error fetching baristas:', baristaError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to fetch baristas',
          error: baristaError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!baristas || baristas.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No online baristas found',
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find nearest barista using Haversine
    let nearestBarista: typeof baristas[0] | null = null;
    let minDistance = Infinity;

    for (const barista of baristas) {
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

    // Update order status to ASSIGNED and set baristaId in Supabase
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
