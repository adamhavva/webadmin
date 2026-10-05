import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Environment variables
const databaseUrl = Deno.env.get('DATABASE_URL');

// Firebase config
const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID') || 'ascend-v2-4a67d';
const firebaseDatabaseUrl = Deno.env.get('FIREBASE_DATABASE_URL') || `https://${firebaseProjectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;
const firebaseClientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
const firebasePrivateKeyRaw = Deno.env.get('FIREBASE_PRIVATE_KEY') || '';

// Parse private key - handle both escaped and unescaped newlines
function parsePrivateKey(raw: string): string {
  // If already has proper PEM format with real newlines, return as-is
  if (raw.includes('-----BEGIN RSA PRIVATE KEY-----')) {
    return raw;
  }
  // If has \\n literals, convert to real newlines
  if (raw.includes('\\n')) {
    return raw.replace(/\\n/g, '\n');
  }
  // Otherwise return as-is
  return raw;
}

const firebasePrivateKey = parsePrivateKey(firebasePrivateKeyRaw);

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

// JWT signing for Firebase using Web Crypto API
async function signJwt(header: object, payload: object, privateKeyPem: string): Promise<string> {
  const encoder = new TextEncoder();

  // Base64url encode
  const base64UrlEncode = (obj: string): string => {
    return btoa(obj)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  // Create signing input
  const headerJson = JSON.stringify(header);
  const payloadJson = JSON.stringify(payload);
  const headerBase64 = base64UrlEncode(headerJson);
  const payloadBase64 = base64UrlEncode(payloadJson);
  const signingInput = `${headerBase64}.${payloadBase64}`;

  // Import the RSA private key
  const keyData = privateKeyPem
    .replace('-----BEGIN RSA PRIVATE KEY-----', '')
    .replace('-----END RSA PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  // Convert base64 key to binary
  const keyBinary = atob(keyData);
  const binaryKey = new Uint8Array(keyBinary.length);
  for (let i = 0; i < keyBinary.length; i++) {
    binaryKey[i] = keyBinary.charCodeAt(i);
  }

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signingInput)
  );

  const signatureBase64 = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));

  return `${signingInput}.${signatureBase64}`;
}

// Get Firebase ID token via service account
async function getFirebaseToken(): Promise<string> {
  if (!firebaseClientEmail || !firebasePrivateKey) {
    throw new Error('Firebase credentials not configured');
  }

  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: firebaseClientEmail,
    sub: firebaseClientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const signedJwt = await signJwt(header, payload, firebasePrivateKey);

  // Exchange for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Firebase token exchange failed: ${error}`);
  }

  const data = await tokenResponse.json();
  return data.access_token;
}

// Get barista location from Firebase RTDB
async function getFirebaseLocation(firebaseUid: string, token: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `${firebaseDatabaseUrl}/users/${firebaseUid}/location.json?auth=${token}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`[assign-barista] Firebase fetch failed for ${firebaseUid}: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
      return { lat: data.lat, lng: data.lng };
    }

    return null;
  } catch (err) {
    console.log(`[assign-barista] Firebase error: ${err.message}`);
    return null;
  }
}

// Write barista location to Firebase RTDB
async function updateFirebaseLocation(
  firebaseUid: string,
  token: string,
  data: { lat: number; lng: number; name: string; role: string; status: string }
): Promise<boolean> {
  try {
    const url = `${firebaseDatabaseUrl}/users/${firebaseUid}.json?auth=${token}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (err) {
    console.log(`[assign-barista] Firebase write error: ${err.message}`);
    return false;
  }
}

// Write order tracking to Firebase RTDB
async function updateFirebaseOrderTracking(
  orderId: string,
  token: string,
  data: { status: string; baristaLocation?: { lat: number; lng: number }; eta?: string }
): Promise<boolean> {
  try {
    const url = `${firebaseDatabaseUrl}/orders/${orderId}/tracking.json?auth=${token}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (err) {
    console.log(`[assign-barista] Firebase order tracking write error: ${err.message}`);
    return false;
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
  console.log('[assign-barista] Starting at', new Date().toISOString());
  console.log('[assign-barista] DATABASE_URL:', databaseUrl ? 'SET' : 'NOT SET');
  console.log('[assign-barista] FIREBASE_PROJECT_ID:', firebaseProjectId);

  if (!databaseUrl) {
    return new Response(
      JSON.stringify({ success: false, message: 'DATABASE_URL not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get Firebase token
  let firebaseToken: string | null = null;
  try {
    if (firebaseClientEmail && firebasePrivateKey) {
      firebaseToken = await getFirebaseToken();
      console.log('[assign-barista] Firebase token obtained');
    }
  } catch (tokenErr) {
    console.log('[assign-barista] Firebase token error:', tokenErr.message);
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
        JSON.stringify({ success: false, message: 'Invalid orderId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order
    const orderResult = await client.queryObject(
      `SELECT id, status, "deliveryLatitude", "deliveryLongitude", "orderNumber", "customerId"
       FROM "Order" WHERE id = $1`,
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
    console.log('[assign-barista] Order:', order.id, order.status);

    const lat = customerLat ?? order.deliveryLatitude;
    const lng = customerLng ?? order.deliveryLongitude;

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'Customer location not available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get baristas
    const baristasResult = await client.queryObject(
      `SELECT id, "firebaseUid", name, phone, latitude, longitude
       FROM "User"
       WHERE role = 'BARISTA'
       AND status = 'ACTIVE'
       AND latitude IS NOT NULL
       AND longitude IS NOT NULL`
    );

    const baristas = baristasResult.rows;
    console.log(`[assign-barista] Found ${baristas.length} active baristas`);

    if (baristas.length === 0) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'No active baristas available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get real-time locations from Firebase
    const baristaLocations = [];
    for (const barista of baristas) {
      let useLat = barista.latitude;
      let useLng = barista.longitude;
      let locationSource = 'supabase';

      // Try Firebase RTDB first if token available
      if (firebaseToken && barista.firebaseUid) {
        const fbLoc = await getFirebaseLocation(barista.firebaseUid, firebaseToken);
        if (fbLoc) {
          useLat = fbLoc.lat;
          useLng = fbLoc.lng;
          locationSource = 'firebase';
          console.log(`[assign-barista] Firebase location for ${barista.name}: (${fbLoc.lat}, ${fbLoc.lng})`);
        } else {
          console.log(`[assign-barista] No Firebase location for ${barista.name}, using Supabase`);
        }
      }

      baristaLocations.push({
        ...barista,
        rtdbLat: useLat,
        rtdbLng: useLng,
        locationSource,
      });
    }

    // Check availability
    const baristaIds = baristaLocations.map(b => b.id);
    const activeResult = await client.queryObject(
      `SELECT "baristaId" FROM "Order"
       WHERE "baristaId" = ANY($1)
       AND status IN ('ASSIGNED', 'ACCEPTED', 'DELIVERING')`,
      [baristaIds]
    );

    const busyIds = new Set(activeResult.rows.map(o => o.baristaId));
    const available = baristaLocations.filter(b => !busyIds.has(b.id));

    console.log(`[assign-barista] ${busyIds.size} busy, ${available.length} available`);

    if (available.length === 0) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'All baristas are busy' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find nearest using Haversine
    let nearest = available[0];
    let minDist = Infinity;
    for (const b of available) {
      const d = haversine(lat, lng, b.rtdbLat, b.rtdbLng);
      console.log(`[assign-barista] ${b.name}: ${d.toFixed(2)} km (source: ${b.locationSource})`);
      if (d < minDist) {
        minDist = d;
        nearest = b;
      }
    }

    const now = new Date().toISOString();
    const distKm = Math.round(minDist * 100) / 100;
    console.log(`[assign-barista] Nearest: ${nearest.name} at ${distKm} km`);

    // Update order in database
    const updateResult = await client.queryObject(
      `UPDATE "Order"
       SET "baristaId" = $1, status = 'ASSIGNED', "assignedAt" = $2::timestamptz, "distanceKm" = $3, "updatedAt" = $2::timestamptz
       WHERE id = $4 AND status = 'SEARCHING'
       RETURNING id`,
      [nearest.id, now, distKm, orderId]
    );

    if (updateResult.rows.length === 0) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'Order not in SEARCHING status or already assigned' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await client.end();

    // Update Firebase RTDB order tracking
    if (firebaseToken) {
      await updateFirebaseOrderTracking(orderId, firebaseToken, {
        status: 'ASSIGNED',
        baristaLocation: { lat: nearest.rtdbLat, lng: nearest.rtdbLng },
      });
    }

    const duration = Date.now() - startTime;
    console.log(`[assign-barista] SUCCESS: ${orderId} → ${nearest.name} (${distKm}km) in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        baristaId: nearest.id,
        baristaName: nearest.name,
        baristaPhone: nearest.phone,
        distance: `${distKm} km`,
        assignedAt: now,
        durationMs: duration,
        locationSource: nearest.locationSource,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    if (client) await client.end();
    console.error('[assign-barista] Error:', err.message);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal error', error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
