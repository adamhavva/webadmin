import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Environment variables
const databaseUrl = Deno.env.get('DATABASE_URL');

// Firebase config - read from environment variables directly
const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID') || 'ascend-v2-4a67d';
const firebaseDatabaseUrl = Deno.env.get('FIREBASE_DATABASE_URL') || `https://${firebaseProjectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;
const firebaseClientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
const firebasePrivateKey = Deno.env.get('FIREBASE_PRIVATE_KEY');

if (firebaseClientEmail && firebasePrivateKey) {
  console.log('[order-complete] Firebase credentials loaded from environment');
} else {
  console.log('[order-complete] Firebase credentials not configured in environment');
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
    console.log('[order-complete] Firebase update error:', err.message);
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
  console.log('[order-complete] Starting at', new Date().toISOString());

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
    console.log('[order-complete] Firebase token error:', tokenErr.message);
  }

  let client: any;
  try {
    client = await createDbClient();
    const body = await req.json().catch(() => ({}));
    const { orderId, note } = body;

    console.log(`[order-complete] Request: orderId=${orderId}`);

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
        JSON.stringify({ success: false, message: 'Invalid UUID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order with items
    const orderResult = await client.queryObject(
      `SELECT o.id, o.status, o."baristaId", o."orderNumber"
       FROM "Order" o WHERE o.id = $1`,
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

    // Verify order can be completed
    if (order.status !== 'ARRIVED' && order.status !== 'DELIVERING') {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: `Order cannot be completed from status ${order.status}` }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!order.baristaId) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'Order has no assigned barista' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baristaId = order.baristaId;

    // Get order items
    const itemsResult = await client.queryObject(
      `SELECT oi."productId", oi."productName", oi.quantity
       FROM "OrderItem" oi WHERE oi."orderId" = $1`,
      [orderId]
    );

    const items = itemsResult.rows;

    // Deduct stock and create movement records
    for (const item of items) {
      // Get current stock
      const stockResult = await client.queryObject(
        `SELECT id, quantity FROM "BaristaStock"
         WHERE "baristaId" = $1 AND "productId" = $2`,
        [baristaId, item.productId]
      );

      if (stockResult.rows.length === 0 || stockResult.rows[0].quantity < item.quantity) {
        await client.end();
        return new Response(
          JSON.stringify({
            success: false,
            message: `Insufficient stock for "${item.productName}"`
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newQty = stockResult.rows[0].quantity - item.quantity;

      // Update stock
      await client.queryObject(
        `UPDATE "BaristaStock" SET quantity = $1 WHERE id = $2`,
        [newQty, stockResult.rows[0].id]
      );

      // Create movement record
      await client.queryObject(
        `INSERT INTO "BaristaStockMovement" ("baristaId", "productId", type, quantity, "balanceAfter", "orderId", note, "createdAt")
         VALUES ($1, $2, 'SOLD', $3, $4, $5, $6, NOW())`,
        [baristaId, item.productId, -item.quantity, newQty, orderId, `Terjual via order ${order.orderNumber}`]
      );
    }

    // Update order status
    const now = new Date().toISOString();
    await client.queryObject(
      `UPDATE "Order" SET status = 'COMPLETED', "completedAt" = $1::timestamptz,
       "actualDeliveryAt" = $1::timestamptz, "updatedAt" = $1::timestamptz
       WHERE id = $2`,
      [now, orderId]
    );

    // Create status history
    await client.queryObject(
      `INSERT INTO "OrderStatusHistory" ("orderId", status, note, "createdAt")
       VALUES ($1, 'COMPLETED', $2, $3::timestamptz)`,
      [orderId, note || 'Order selesai', now]
    );

    await client.end();

    // Update Firebase RTDB
    if (firebaseToken) {
      await updateFirebaseOrderTracking(orderId, firebaseToken, {
        status: 'COMPLETED',
      });
    }

    const duration = Date.now() - startTime;
    console.log(`[order-complete] SUCCESS: ${orderId} completed in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderId,
        orderNumber: order.ordernumber,
        status: 'COMPLETED',
        completedAt: now,
        durationMs: duration,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    if (client) await client.end();
    console.error('[order-complete] Error:', err.message);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal error', error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
