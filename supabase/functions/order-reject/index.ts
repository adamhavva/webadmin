import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Environment variables
const databaseUrl = Deno.env.get('DATABASE_URL');

// Firebase config - read from environment variables directly
const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID') || 'ascend-v2-4a67d';
const firebaseDatabaseUrl = Deno.env.get('FIREBASE_DATABASE_URL') || `https://${firebaseProjectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;
const firebaseClientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
const firebasePrivateKey = Deno.env.get('FIREBASE_PRIVATE_KEY');

if (firebaseClientEmail && firebasePrivateKey) {
  console.log('[order-reject] Firebase credentials loaded from environment');
} else {
  console.log('[order-reject] Firebase credentials not configured in environment');
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

// Get barista location from Firebase RTDB
async function getFirebaseLocation(firebaseUid: string, token: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `${firebaseDatabaseUrl}/users/${firebaseUid}/location.json?auth=${token}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
      return { lat: data.lat, lng: data.lng };
    }
    return null;
  } catch (err: any) {
    console.log(`[order-reject] Firebase fetch error: ${err.message}`);
    return null;
  }
}

// Haversine formula
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Remove order from barista pool
async function removeOrderFromPool(orderId: string, baristaId: string, token: string): Promise<boolean> {
  try {
    const url = `${firebaseDatabaseUrl}/order_pool/${baristaId}/${orderId}.json?auth=${token}`;
    const response = await fetch(url, { method: 'DELETE' });
    return response.ok;
  } catch (err: any) {
    console.log('[order-reject] Remove from pool error:', err.message);
    return false;
  }
}

// Broadcast order to baristas
async function broadcastOrderToBaristas(
  orderId: string,
  orderNumber: string,
  customerName: string,
  customerLat: number,
  customerLng: number,
  items: { productName: string; quantity: number }[],
  subtotal: number,
  total: number,
  baristaIds: string[],
  token: string
): Promise<boolean> {
  try {
    const now = Date.now();
    const expiresAt = now + 30000; // 30 seconds

    const updates: Record<string, any> = {};
    for (const baristaId of baristaIds) {
      updates[`order_pool/${baristaId}/${orderId}`] = {
        orderId,
        orderNumber,
        customerName,
        customerLatitude: customerLat,
        customerLongitude: customerLng,
        items,
        subtotal,
        total,
        expiresAt,
        createdAt: now,
      };
    }

    const url = `${firebaseDatabaseUrl}/.json?auth=${token}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return response.ok;
  } catch (err: any) {
    console.log('[order-reject] Broadcast error:', err.message);
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
  console.log('[order-reject] Starting at', new Date().toISOString());

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
    console.log('[order-reject] Firebase token error:', tokenErr.message);
  }

  let client: any;
  try {
    client = await createDbClient();
    const body = await req.json();
    const { orderId, baristaId, reason } = body;

    console.log(`[order-reject] Request: orderId=${orderId}, baristaId=${baristaId}, reason=${reason || 'none'}`);

    if (!orderId || !baristaId) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'Missing orderId or baristaId' }),
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
      `SELECT o.id, o.status, o."baristaId", o."orderNumber", o."deliveryLatitude", o."deliveryLongitude",
              o."customerName", o.subtotal, o.total
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

    // Verify barista is assigned
    if (order.baristaId !== baristaId) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'You are not the assigned barista for this order' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify order is in ASSIGNED status
    if (order.status !== 'ASSIGNED') {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: `Order is not in ASSIGNED status (current: ${order.status})` }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order items
    const itemsResult = await client.queryObject(
      `SELECT oi."productId", oi."productName", oi.quantity
       FROM "OrderItem" oi WHERE oi."orderId" = $1`,
      [orderId]
    );

    const items = itemsResult.rows;
    const customerLat = order.deliverylatitude ?? 0;
    const customerLng = order.deliverylongitude ?? 0;

    // Find nearest baristas with stock (exclude current barista)
    const baristasResult = await client.queryObject(
      `SELECT u.id, u."firebaseUid", u.name, u.phone, u.latitude, u.longitude
       FROM "User" u
       WHERE u.role = 'BARISTA' AND u.status = 'ACTIVE'
       AND u.latitude IS NOT NULL AND u.longitude IS NOT NULL
       AND u.id != $1`,
      [baristaId]
    );

    const baristas = baristasResult.rows;
    console.log(`[order-reject] Found ${baristas.length} other baristas`);

    // Filter by availability and stock, then sort by distance
    const candidates: { barista: any; distance: number }[] = [];

    for (const barista of baristas) {
      // Check if busy
      const busyResult = await client.queryObject(
        `SELECT 1 FROM "Order" WHERE "baristaId" = $1 AND status IN ('ASSIGNED', 'ACCEPTED', 'DELIVERING') LIMIT 1`,
        [barista.id]
      );
      if (busyResult.rows.length > 0) continue;

      // Check stock
      let hasStock = true;
      for (const item of items) {
        const stockResult = await client.queryObject(
          `SELECT quantity FROM "BaristaStock" WHERE "baristaId" = $1 AND "productId" = $2`,
          [barista.id, item.productId]
        );
        if (stockResult.rows.length === 0 || stockResult.rows[0].quantity < item.quantity) {
          hasStock = false;
          break;
        }
      }
      if (!hasStock) continue;

      // Calculate distance
      let lat = barista.latitude;
      let lng = barista.longitude;

      // Get real-time location from Firebase if available
      if (firebaseToken && barista.firebaseuid) {
        const fbLoc = await getFirebaseLocation(barista.firebaseuid, firebaseToken);
        if (fbLoc) {
          lat = fbLoc.lat;
          lng = fbLoc.lng;
        }
      }

      const distance = haversine(customerLat, customerLng, lat, lng);
      if (distance <= 5) { // Within 5km radius
        candidates.push({ barista, distance });
      }
    }

    // Sort by distance and take top 5
    candidates.sort((a, b) => a.distance - b.distance);
    const topCandidates = candidates.slice(0, 5);

    const now = new Date().toISOString();

    if (topCandidates.length === 0) {
      // No other barista available - log the rejection
      await client.queryObject(
        `INSERT INTO "OrderStatusHistory" ("orderId", status, "actorId", "actorRole", note, "createdAt")
         VALUES ($1, 'ASSIGNED', $2, 'BARISTA', $3, $4::timestamptz)`,
        [orderId, baristaId, `Barista reject: ${reason || 'tanpa alasan'}. Tidak ada barista lain.`, now]
      );
      await client.end();

      if (firebaseToken) {
        await removeOrderFromPool(orderId, baristaId, firebaseToken);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'No other baristas available',
          newBaristaId: null,
          durationMs: Date.now() - startTime,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Assign to nearest barista
    const nextBarista = topCandidates[0].barista;
    const distKm = Math.round(topCandidates[0].distance * 100) / 100;

    await client.queryObject(
      `UPDATE "Order" SET "baristaId" = $1, "assignedAt" = $2::timestamptz, "distanceKm" = $3,
       "reassignCount" = "reassignCount" + 1, "reassignedAt" = $2::timestamptz,
       "reassignReason" = 'LAINNYA', "reassignNote" = $4, "updatedAt" = $2::timestamptz
       WHERE id = $5`,
      [nextBarista.id, now, distKm, reason || null, orderId]
    );

    await client.queryObject(
      `INSERT INTO "OrderStatusHistory" ("orderId", status, "actorId", "actorRole", note, "createdAt")
       VALUES ($1, 'ASSIGNED', $2, 'BARISTA', $3, $4::timestamptz)`,
      [orderId, baristaId, `Reassign ke ${nextBarista.name} (${distKm} km). Alasan: ${reason || '-'}`, now]
    );

    await client.end();

    // Update Firebase
    if (firebaseToken) {
      await removeOrderFromPool(orderId, baristaId, firebaseToken);

      await broadcastOrderToBaristas(
        orderId,
        order.ordernumber,
        order.customername,
        customerLat,
        customerLng,
        items.map(i => ({ productName: i.productName, quantity: i.quantity })),
        Number(order.subtotal),
        Number(order.total),
        topCandidates.map(c => c.barista.firebaseuid).filter(Boolean),
        firebaseToken
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[order-reject] SUCCESS: ${orderId} reassigned from ${baristaId} to ${nextBarista.name} in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        newBaristaId: nextBarista.id,
        newBaristaName: nextBarista.name,
        newBaristaPhone: nextBarista.phone,
        distance: `${distKm} km`,
        durationMs: duration,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    if (client) await client.end();
    console.error('[order-reject] Error:', err.message);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal error', error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
