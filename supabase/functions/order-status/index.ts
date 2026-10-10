import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Environment variables
const databaseUrl = Deno.env.get('DATABASE_URL');

// Firebase config - read from environment variables directly
const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID') || 'ascend-v2-4a67d';
const firebaseDatabaseUrl = Deno.env.get('FIREBASE_DATABASE_URL') || `https://${firebaseProjectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;
const firebaseClientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
const firebasePrivateKey = Deno.env.get('FIREBASE_PRIVATE_KEY');

if (firebaseClientEmail && firebasePrivateKey) {
  console.log('[order-status] Firebase credentials loaded from environment');
} else {
  console.log('[order-status] Firebase credentials not configured in environment');
}

// Direct PostgreSQL client
async function createDbClient() {
  const postgres = await import('npm:postgres@3');
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = postgres.default(databaseUrl);
  await client.connect();
  return client;
}

// Convert base64 string to Uint8Array (binary)
function base64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/\s/g, '');
  const binaryString = atob(cleanBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// JWT signing for Firebase using Web Crypto API
async function signJwt(header: object, payload: object, privateKeyPem: string): Promise<string> {
  const encoder = new TextEncoder();
  const base64UrlEncode = (str: string): string => {
    const bytes = encoder.encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };
  const headerJson = JSON.stringify(header);
  const payloadJson = JSON.stringify(payload);
  const headerBase64 = base64UrlEncode(headerJson);
  const payloadBase64 = base64UrlEncode(payloadJson);
  const signingInput = `${headerBase64}.${payloadBase64}`;
  let keyContent = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace('-----BEGIN RSA PRIVATE KEY-----', '')
    .replace('-----END RSA PRIVATE KEY-----', '');
  keyContent = keyContent.replace(/\s/g, '');
  const binaryKey = base64ToUint8Array(keyContent);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(signingInput));
  const signatureBytes = new Uint8Array(signature);
  let signatureBinary = '';
  for (let i = 0; i < signatureBytes.length; i++) {
    signatureBinary += String.fromCharCode(signatureBytes[i]);
  }
  const signatureBase64 = btoa(signatureBinary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
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
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signedJwt }),
  });
  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Firebase token exchange failed: ${error}`);
  }
  const data = await tokenResponse.json();
  return data.access_token;
}

// Update Firebase RTDB tracking
async function updateFirebaseOrderTracking(
  orderId: string,
  token: string,
  data: { status: string }
): Promise<boolean> {
  try {
    const url = `${firebaseDatabaseUrl}/orders/${orderId}/tracking.json?auth=${token}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (err: any) {
    console.log('[order-status] Firebase update error:', err.message);
    return false;
  }
}

// Allowed status transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'ACCEPTED': ['DELIVERING'],
  'DELIVERING': ['ARRIVED'],
};

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
  console.log('[order-status] Starting at', new Date().toISOString());

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
    }
  } catch (tokenErr: any) {
    console.log('[order-status] Firebase token error:', tokenErr.message);
  }

  let client: any;
  try {
    client = await createDbClient();
    const body = await req.json();
    const { orderId, baristaId, status, note } = body;

    console.log(`[order-status] Request: orderId=${orderId}, baristaId=${baristaId}, status=${status}`);

    if (!orderId || !baristaId || !status) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'Missing orderId, baristaId, or status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate status
    if (status !== 'DELIVERING' && status !== 'ARRIVED') {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'Status must be DELIVERING or ARRIVED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId) || !uuidRegex.test(baristaId)) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid UUID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order
    const orderResult = await client.queryObject(
      `SELECT id, status, "baristaId", "orderNumber"
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

    // Verify barista is assigned
    if (order.baristaId !== baristaId) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'You are not the assigned barista for this order' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify status transition
    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      await client.end();
      return new Response(
        JSON.stringify({
          success: false,
          message: `Cannot change from ${order.status} to ${status}`
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update data
    const now = new Date().toISOString();
    let updateData: string;
    let params: any[];

    if (status === 'DELIVERING') {
      updateData = `status = 'DELIVERING', "deliveringAt" = $1::timestamptz, "updatedAt" = $1::timestamptz WHERE id = $2`;
      params = [now, orderId];
    } else if (status === 'ARRIVED') {
      updateData = `status = 'ARRIVED', "arrivedAt" = $1::timestamptz, "updatedAt" = $1::timestamptz WHERE id = $2`;
      params = [now, orderId];
    }

    await client.queryObject(
      `UPDATE "Order" SET ${updateData}`,
      params
    );

    // Create status history
    await client.queryObject(
      `INSERT INTO "OrderStatusHistory" ("orderId", status, "actorId", "actorRole", note, "createdAt")
       VALUES ($1, $2, $3, 'BARISTA', $4, $5::timestamptz)`,
      [orderId, status, baristaId, note || null, now]
    );

    await client.end();

    // Update Firebase RTDB
    if (firebaseToken) {
      await updateFirebaseOrderTracking(orderId, firebaseToken, {
        status: status,
      });
    }

    const duration = Date.now() - startTime;
    console.log(`[order-status] SUCCESS: ${orderId} updated to ${status} in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderId,
        orderNumber: order.ordernumber,
        status: status,
        durationMs: duration,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    if (client) await client.end();
    console.error('[order-status] Error:', err.message);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal error', error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
