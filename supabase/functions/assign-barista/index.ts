import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const databaseUrl = Deno.env.get('DATABASE_URL');

// Firebase config
const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID') || 'ascend-v2-4a67d';
const firebaseDatabaseUrl = Deno.env.get('FIREBASE_DATABASE_URL') || `https://${firebaseProjectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;
const firebaseClientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
const firebasePrivateKey = Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

// Haversine formula
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Direct PostgreSQL client
async function createDbClient() {
  const postgres = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = new postgres.Client(databaseUrl);
  await client.connect();
  return client;
}
// JWT signing for Firebase Admin SDK
async function signJwt(header: object, payload: object, key: string): Promise<string> {
  const encoder = new TextEncoder();

  const encode = (obj: object) => btoa(JSON.stringify(obj))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const headerBase64 = encode(header);
  const payloadBase64 = encode(payload);
  const input = `${headerBase64}.${payloadBase64}`;

  // Import the private key
  const keyData = `-----BEGIN RSA PRIVATE KEY-----\n${key.replace(/-----BEGIN RSA PRIVATE KEY-----|-----END RSA PRIVATE KEY-----/g, '').replace(/\s/g, '')}\n-----END RSA PRIVATE KEY-----`;
  const keyBuffer = encoder.encode(keyData);
  const keyObj = await crypto.subtle.importKey(
    'pem',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1.5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1.5',
    keyObj,
    encoder.encode(input)
  );

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${input}.${signatureBase64}`;
}

// Get Firebase access token
async function getFirebaseToken(): Promise<string> {
  if (!firebaseClientEmail || !firebasePrivateKey) {
    throw new Error('Firebase credentials not configured');
  }

  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: firebaseClientEmail,
    sub: firebaseClientEmail,
    aud: 'https://identitytoolkit.googleapis.com/google_identity_toolkit',
    iat: now,
    exp: now + 3600,
  };

  const signedJwt = await signJwt(header, payload, firebasePrivateKey);

  // Exchange for Firebase ID token
  const tokenResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseProjectId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: signedJwt,
        returnSecureToken: true,
      }),
    }
  );

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Firebase auth failed: ${error}`);
  }

  const data = await tokenResponse.json();
  return data.idToken;
}

// Get barista location from Firebase RTDB
async function getFirebaseLocation(firebaseUid: string, token?: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `${firebaseDatabaseUrl}/users/${firebaseUid}/location.json${token ? `?auth=${token}` : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`[assign-barista] Firebase RTDB fetch failed: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data && data.lat && data.lng) {
      return { lat: data.lat, lng: data.lng };
    }

    return null;
  } catch (err) {
    console.log(`[assign-barista] Firebase RTDB error: ${err.message}`);
    return null;
  }
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

  // Debug: log env vars
  console.log('[assign-barista] Starting at', new Date().toISOString());
  console.log('[assign-barista] Env check:');
  console.log('[assign-barista]   SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
  console.log('[assign-barista]   DATABASE_URL:', databaseUrl ? 'SET' : 'NOT SET');
  console.log('[assign-barista]   FIREBASE_PROJECT_ID:', firebaseProjectId);
  console.log('[assign-barista]   FIREBASE_DATABASE_URL:', firebaseDatabaseUrl ? 'SET' : 'NOT SET');
  console.log('[assign-barista]   FIREBASE_CLIENT_EMAIL:', firebaseClientEmail ? 'SET' : 'NOT SET');
  console.log('[assign-barista]   FIREBASE_PRIVATE_KEY:', firebasePrivateKey ? 'SET' : 'NOT SET');

  // Check required env vars
  if (!databaseUrl) {
    console.error('[assign-barista] Missing DATABASE_URL');
    return new Response(
      JSON.stringify({ success: false, message: 'Server misconfigured - missing DATABASE_URL' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get Firebase token for authenticated RTDB access
  let firebaseToken: string | null = null;
  try {
    if (firebaseClientEmail && firebasePrivateKey) {
      firebaseToken = await getFirebaseToken();
      console.log('[assign-barista] Firebase token obtained');
    } else {
      console.log('[assign-barista] Firebase credentials not available');
    }
  } catch (tokenErr) {
    console.log('[assign-barista] Firebase token error (continuing without auth):', tokenErr.message);
  }

  let client: any;
  try {
    client = await createDbClient();

    const body = await req.json();
    const { orderId, customerLat, customerLng } = body;

    console.log(`[assign-barista] Request: orderId=${orderId}, lat=${customerLat}, lng=${customerLng}`);

    if (!orderId) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'Missing orderId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid orderId format - must be UUID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order
    console.log('[assign-barista] Querying Order...');
    const orderResult = await client.queryObject(
      `SELECT id, status, "deliveryLatitude", "deliveryLongitude" FROM "Order" WHERE id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const order = orderResult.rows[0];
    console.log('[assign-barista] Order found:', order.id, 'status:', order.status);

    const lat = customerLat ?? order.deliveryLatitude;
    const lng = customerLng ?? order.deliveryLongitude;

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      await client.end();
      console.error('[assign-barista] Invalid location: lat=', lat, 'lng=', lng);
      return new Response(
        JSON.stringify({ success: false, message: 'Customer location not available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get baristas with location
    console.log('[assign-barista] Querying baristas...');
    const baristasResult = await client.queryObject(
      `SELECT id, "firebaseUid", name, phone, latitude, longitude
       FROM "User"
       WHERE role = 'BARISTA'
       AND status = 'ACTIVE'
       AND latitude IS NOT NULL
       AND longitude IS NOT NULL`
    );

    const baristas = baristasResult.rows;
    console.log(`[assign-barista] Found ${baristas.length} baristas with location`);

    if (baristas.length === 0) {
      await client.end();
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

      // Try Firebase RTDB first
      const firebaseLocation = await getFirebaseLocation(barista.firebaseUid, firebaseToken || undefined);

      if (firebaseLocation) {
        baristaLocations.push({
          ...barista,
          rtdbLat: firebaseLocation.lat,
          rtdbLng: firebaseLocation.lng,
        });
        console.log(`[assign-barista] Firebase: ${barista.name} at (${firebaseLocation.lat}, ${firebaseLocation.lng})`);
      } else if (barista.latitude && barista.longitude) {
        // Fallback to Supabase lat/long
        baristaLocations.push({
          ...barista,
          rtdbLat: barista.latitude,
          rtdbLng: barista.longitude,
        });
        console.log(`[assign-barista] Fallback: ${barista.name} at (${barista.latitude}, ${barista.longitude})`);
      }
    }

    console.log(`[assign-barista] ${baristaLocations.length} baristas with usable locations`);

    if (baristaLocations.length === 0) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'No baristas with location available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check availability (no active orders)
    const baristaIds = baristaLocations.map(b => b.id);
    const activeResult = await client.queryObject(
      `SELECT "baristaId" FROM "Order"
       WHERE "baristaId" = ANY($1)
       AND status IN ('ASSIGNED', 'ACCEPTED', 'DELIVERING')`,
      [baristaIds]
    );

    const busyIds = new Set(activeResult.rows.map(o => o.baristaId));
    const available = baristaLocations.filter(b => !busyIds.has(b.id));

    console.log(`[assign-barista] ${busyIds.size} baristas busy, ${available.length} available`);

    if (available.length === 0) {
      await client.end();
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
    const updateResult = await client.queryObject(
      `UPDATE "Order"
       SET "baristaId" = $1, status = 'ASSIGNED', "assignedAt" = $2::timestamptz, "distanceKm" = $3, "updatedAt" = $2::timestamptz
       WHERE id = $4 AND status = 'SEARCHING'
       RETURNING id`,
      [nearest.id, now, distKm, orderId]
    );

    await client.end();

    if (updateResult.rows.length === 0) {
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

  } catch (err) {
    if (client) await client.end();
    console.error('[assign-barista] Error:', err.message, err.stack);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal error', error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
