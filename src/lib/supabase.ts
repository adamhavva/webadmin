import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
export function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Assign barista via Supabase Edge Function
export async function assignNearestBarista(params: {
  orderId: string;
  customerLat: number;
  customerLng: number;
}): Promise<{
  success: boolean;
  baristaId?: string;
  baristaName?: string;
  distance?: string;
  assignedAt?: string;
  message?: string;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/assign-barista`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      orderId: params.orderId,
      customerLat: params.customerLat,
      customerLng: params.customerLng,
    }),
  });

  const result = await response.json();
  return result;
}

// Sync Order from Prisma to Supabase
export async function syncOrderToSupabase(order: {
  id: string;
  orderNumber: string;
  status: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
}) {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase.from('Order').upsert({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    deliveryLatitude: order.deliveryLatitude,
    deliveryLongitude: order.deliveryLongitude,
  }, {
    onConflict: 'id',
  });

  if (error) {
    console.error('[SUPABASE SYNC] Failed to sync order:', error);
    throw error;
  }

  console.log('[SUPABASE SYNC] Order synced:', order.id);
}
