import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Environment variables
const databaseUrl = Deno.env.get('DATABASE_URL');

// Firebase config - read from environment variables directly
const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID') || 'ascend-v2-4a67d';
const firebaseDatabaseUrl = Deno.env.get('FIREBASE_DATABASE_URL') || `https://${firebaseProjectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;
const firebaseClientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
const firebasePrivateKey = Deno.env.get('FIREBASE_PRIVATE_KEY');

if (firebaseClientEmail && firebasePrivateKey) {
  console.log('[broadcast-order] Firebase credentials loaded from environment');
} else {
  console.log('[broadcast-order] Firebase credentials not configured in environment');
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
  if (!firebasePrivateKey.includes('-----BEGIN PRIVATE KEY-----') &&
      !firebasePrivateKey.includes('-----BEGIN RSA PRIVATE KEY-----')) {
    throw new Error('Invalid private key format: missing PEM header');
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

// Write order to Firebase RTDB at /order_pool/{baristaId}/{orderId}
async function writeOrderToPool(
  firebaseUid: string,
  orderId: string,
  orderData: {
    orderNumber: string;
    customerName: string;
    customerLatitude: number;
    customerLongitude: number;
    items: Array<{ productName: string; quantity: number }>;
    subtotal: number;
    total: number;
    expiresAt: number;
    createdAt: number;
  },
  token: string
): Promise<boolean> {
  try {
    const url = `${firebaseDatabaseUrl}/order_pool/${firebaseUid}/${orderId}.json?auth=${token}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      console.log(`[broadcast-order] Failed to write order ${orderId} for ${firebaseUid}: HTTP ${response.status}`);
      return false;
    }

    console.log(`[broadcast-order] Order written to /order_pool/${firebaseUid}/${orderId}`);
    return true;
  } catch (err: any) {
    console.log(`[broadcast-order] Firebase write error: ${err.message}`);
    return false;
  }
}

// Delete order from Firebase RTDB
async function deleteOrderFromPool(
  firebaseUid: string,
  orderId: string,
  token: string
): Promise<boolean> {
  try {
    const url = `${firebaseDatabaseUrl}/order_pool/${firebaseUid}/${orderId}.json?auth=${token}`;
    const response = await fetch(url, {
      method: 'DELETE',
    });

    if (!response.ok) {
      console.log(`[broadcast-order] Failed to delete order ${orderId} for ${firebaseUid}: HTTP ${response.status}`);
      return false;
    }

    console.log(`[broadcast-order] Order deleted from /order_pool/${firebaseUid}/${orderId}`);
    return true;
  } catch (err: any) {
    console.log(`[broadcast-order] Firebase delete error: ${err.message}`);
    return false;
  }
}

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[broadcast-order] Request received');

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
      console.log('[broadcast-order] Firebase token obtained');
    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'Firebase credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (tokenErr: any) {
    console.error('[broadcast-order] Firebase token error:', tokenErr.message);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to get Firebase token', error: tokenErr.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let client: any;
  try {
    client = await createDbClient();
    const body = await req.json();
    const { orderId, baristaIds, action } = body;

    console.log(`[broadcast-order] Request: orderId=${orderId}, baristaIds=${JSON.stringify(baristaIds)}, action=${action || 'broadcast'}`);

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

    // If baristaIds provided, use them directly
    // Otherwise fetch from order
    let baristaIdsToUse = baristaIds;

    if (!baristaIdsToUse || baristaIdsToUse.length === 0) {
      // Get barista IDs from order
      const orderResult = await client.queryObject(
        `SELECT id, "baristaId" FROM "Order" WHERE id = $1`,
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
      if (!order.baristaId) {
        await client.end();
        return new Response(
          JSON.stringify({ success: false, message: 'Order has no barista assigned' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      baristaIdsToUse = [order.baristaId];
    }

    // Get barista firebaseUids
    const baristasResult = await client.queryObject(
      `SELECT id, "firebaseUid" FROM "User" WHERE id = ANY($1) AND "firebaseUid" IS NOT NULL`,
      [baristaIdsToUse]
    );

    if (baristasResult.rows.length === 0) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'No baristas with firebaseUids found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order details
    const orderDetailsResult = await client.queryObject(
      `SELECT o.id, o."orderNumber", o."customerId", o."deliveryLatitude", o."deliveryLongitude",
              o.subtotal, o.total, u.name as "customerName",
              COALESCE(
                (SELECT json_agg(json_build_object('productName', p.name, 'quantity', oi.quantity))
                 FROM "OrderItem" oi
                 JOIN "Product" p ON p.id = oi."productId"
                 WHERE oi."orderId" = o.id), '[]'::json
              ) as items
       FROM "Order" o
       JOIN "User" u ON u.id = o."customerId"
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderDetailsResult.rows.length === 0) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderDetails = orderDetailsResult.rows[0];
    console.log('[broadcast-order] Order:', orderDetails.orderNumber);

    await client.end();

    const now = Date.now();
    const expiresInMs = 30000; // 30 seconds
    const expiresAt = now + expiresInMs;

    const results: Array<{ baristaId: string; firebaseUid: string; success: boolean }> = [];

    // Action: broadcast (default) or remove
    if (action === 'remove') {
      // Remove order from all barista pools
      for (const barista of baristasResult.rows) {
        const success = await deleteOrderFromPool(barista.firebaseUid, orderId, firebaseToken!);
        results.push({
          baristaId: barista.id,
          firebaseUid: barista.firebaseUid,
          success,
        });
      }
    } else {
      // Broadcast order to barista pools
      for (const barista of baristasResult.rows) {
        const success = await writeOrderToPool(barista.firebaseUid, orderId, {
          orderNumber: orderDetails.orderNumber,
          customerName: orderDetails.customerName,
          customerLatitude: orderDetails.deliveryLatitude,
          customerLongitude: orderDetails.deliveryLongitude,
          items: orderDetails.items,
          subtotal: Number(orderDetails.subtotal),
          total: Number(orderDetails.total),
          expiresAt,
          createdAt: now,
        }, firebaseToken!);

        results.push({
          baristaId: barista.id,
          firebaseUid: barista.firebaseUid,
          success,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const duration = Date.now() - startTime;
    console.log(`[broadcast-order] SUCCESS: ${successCount}/${results.length} baristas in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        action: action || 'broadcast',
        orderId,
        results,
        successCount,
        totalCount: results.length,
        durationMs: duration,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    if (client) await client.end();
    console.error('[broadcast-order] Error:', err.message);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal error', error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
