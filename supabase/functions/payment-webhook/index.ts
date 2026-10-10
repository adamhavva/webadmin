/**
 * Payment Webhook Edge Function
 *
 * Handles Midtrans payment webhook notifications.
 * Called by Midtrans when payment status changes.
 *
 * Flow:
 * 1. Verify SHA512 signature
 * 2. Update payment status in PostgreSQL
 * 3. Update order status to SEARCHING (if PAID)
 * 4. Write order locations to Firebase RTDB
 * 5. Reduce barista stock
 * 6. Return 200 immediately (barista assignment happens async via assign-barista)
 *
 * Environment Variables:
 * - DATABASE_URL: PostgreSQL connection string
 * - FIREBASE_PROJECT_ID: Firebase project ID
 * - FIREBASE_DATABASE_URL: Firebase RTDB URL (optional)
 * - SERVICE_ACCOUNT_PATH: Path to Firebase service account JSON
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Environment variables
const databaseUrl = Deno.env.get('DATABASE_URL');
const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID') || 'ascend-v2-4a67d';
const firebaseDatabaseUrl = Deno.env.get('FIREBASE_DATABASE_URL') ||
  `https://${firebaseProjectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;

// Firebase credentials from environment variables (set via `supabase secrets set`)
const firebaseClientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
const firebasePrivateKey = Deno.env.get('FIREBASE_PRIVATE_KEY');

// ============================================================
// Direct PostgreSQL Client
// ============================================================

async function createDbClient() {
  const postgres = await import('npm:postgres@3');
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = postgres.default(databaseUrl);
  await client.connect();
  return client;
}

// ============================================================
// Firebase Authentication
// ============================================================

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

// ============================================================
// Midtrans Signature Verification
// SHA512(order_id + status_code + gross_amount + serverKey)
// ============================================================

function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string
): string {
  const input = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  return btoa(String.fromCharCode(...new Uint8Array(data)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Simpler implementation using Web Crypto
async function sha512Signature(orderId: string, statusCode: string, grossAmount: string, serverKey: string): Promise<string> {
  const input = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// Firebase RTDB Operations
// ============================================================

// Write order data to Firebase RTDB
// Structure: /orders/{orderId}/locations = {lat, lng, timestamp, ...}
async function writeOrderLocations(
  orderId: string,
  token: string,
  data: {
    orderNumber: string;
    status: string;
    customerLat: number;
    customerLng: number;
    baristaId?: string;
  }
): Promise<boolean> {
  try {
    const locationsData = {
      customer: {
        lat: data.customerLat,
        lng: data.customerLng,
        timestamp: Date.now(),
      },
      distance: 0,
      orderNumber: data.orderNumber,
      status: data.status,
    };

    const url = `${firebaseDatabaseUrl}/orders/${orderId}/locations.json?auth=${token}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(locationsData),
    });

    if (!response.ok) {
      console.log(`[payment-webhook] Failed to write order locations: HTTP ${response.status}`);
      return false;
    }

    console.log(`[payment-webhook] Order locations written to Firebase: /orders/${orderId}/locations`);
    return true;
  } catch (err: any) {
    console.log(`[payment-webhook] Firebase write error: ${err.message}`);
    return false;
  }
}

// Write order tracking to Firebase RTDB
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
    console.log(`[payment-webhook] Firebase order tracking write error: ${err.message}`);
    return false;
  }
}

// ============================================================
// Status Mapping
// ============================================================

const MIDTRANS_STATUS_MAP: Record<string, 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED'> = {
  settlement: 'PAID',
  capture: 'PAID',
  pending: 'PENDING',
  deny: 'FAILED',
  cancel: 'FAILED',
  expire: 'EXPIRED',
  failure: 'FAILED',
};

// Infer payment group from Midtrans payment_type
function inferPaymentGroup(paymentType: string): string {
  const pt = paymentType.toLowerCase();
  if (pt === 'qris') return 'QRIS';
  if (pt === 'credit_card') return 'CARD';
  if (pt === 'bank_transfer' || pt.endsWith('_va')) return 'VIRTUAL_ACCOUNT';
  if (['gopay', 'shopeepay', 'dana', 'ovo', 'paypay', 'astrapay'].includes(pt)) return 'EWALLET';
  if (['alfamart', 'indomaret', 'cstore'].includes(pt)) return 'CSTORE';
  return 'OTHER';
}

function getMidtransMethodName(paymentType: string): string {
  const map: Record<string, string> = {
    qris: 'QRIS',
    bank_transfer: 'Virtual Account',
    bca_va: 'BCA Virtual Account',
    bni_va: 'BNI Virtual Account',
    bri_va: 'BRI Virtual Account',
    mandiri_va: 'Mandiri Virtual Account',
    permata_va: 'Permata Virtual Account',
    cstore: 'Convenience Store',
    alfamart: 'Alfamart',
    indomaret: 'Indomaret',
    gopay: 'GoPay',
    shopeepay: 'ShopeePay',
    dana: 'DANA',
    ovo: 'OVO',
    credit_card: 'Credit Card',
  };
  return map[paymentType.toLowerCase()] ?? paymentType;
}

// ============================================================
// Stock Reduction
// ============================================================

async function reduceBaristaStock(
  client: any,
  orderId: string,
  baristaId: string,
  orderItems: Array<{ productId: string; quantity: number }>
): Promise<void> {
  // Aggregate quantities per product
  const productQuantities = new Map<string, number>();
  for (const item of orderItems) {
    productQuantities.set(item.productId, (productQuantities.get(item.productId) ?? 0) + item.quantity);
  }

  console.log(`[payment-webhook] Reducing barista stock for order ${orderId}`);

  for (const [productId, quantity] of productQuantities) {
    try {
      // Check if stock movement already exists (idempotency)
      const existingMovement = await client`
        SELECT id FROM "BaristaStockMovement"
        WHERE "orderId" = ${orderId}
        AND "productId" = ${productId}
        AND type = 'SOLD'
      `;

      if (existingMovement.length > 0) {
        console.log(`[payment-webhook] Stock movement already exists for product ${productId}, skipping`);
        continue;
      }

      // Get current stock
      const stock = await client`
        SELECT id, quantity FROM "BaristaStock"
        WHERE "baristaId" = ${baristaId}
        AND "productId" = ${productId}
      `;

      if (!stock || stock.length === 0) {
        console.log(`[payment-webhook] No barista stock for product ${productId}`);
        continue;
      }

      const currentStock = stock[0];
      const actualDeducted = Math.min(currentStock.quantity, quantity);
      const newQuantity = currentStock.quantity - actualDeducted;

      // Atomic update
      await client`
        UPDATE "BaristaStock"
        SET quantity = ${newQuantity}
        WHERE id = ${currentStock.id}
        AND quantity = ${currentStock.quantity}
      `;

      // Record movement
      await client`
        INSERT INTO "BaristaStockMovement" (
          "baristaId", "productId", type, quantity, "balanceAfter", "orderId", note
        ) VALUES (
          ${baristaId}, ${productId}, 'SOLD', ${-actualDeducted},
          ${newQuantity}, ${orderId},
          ${`Payment confirmed via Midtrans${actualDeducted < quantity ? ` (partial)` : ''}`}
        )
      `;

      console.log(`[payment-webhook] Reduced stock for product ${productId}: ${currentStock.quantity} -> ${newQuantity}`);
    } catch (err: any) {
      console.error(`[payment-webhook] Stock reduction error for product ${productId}:`, err.message);
    }
  }
}

// ============================================================
// Main Handler
// ============================================================

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
  console.log('[payment-webhook] Starting at', new Date().toISOString());
  console.log('[payment-webhook] DATABASE_URL:', databaseUrl ? 'SET' : 'NOT SET');

  if (!databaseUrl) {
    return new Response(
      JSON.stringify({ status: 'error', message: 'DATABASE_URL not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Parse request body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ status: 'error', message: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const rawOrderId = body?.order_id || '(missing)';
  const rawStatus = body?.transaction_status || '(missing)';
  console.log(`[payment-webhook] Received — order: ${rawOrderId}, status: ${rawStatus}`);

  // Validate required fields
  const orderId = body.order_id as string;
  const statusCode = body.status_code as string;
  const grossAmount = body.gross_amount as string;
  const signatureKey = body.signature_key as string;

  if (!orderId || !statusCode || !grossAmount || !signatureKey) {
    console.warn('[payment-webhook] Missing required fields in notification');
    return new Response(
      JSON.stringify({ status: 'error', message: 'Missing required fields' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get server key from env
  const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY') || '';
  if (!serverKey) {
    console.error('[payment-webhook] MIDTRANS_SERVER_KEY not configured');
    return new Response(
      JSON.stringify({ status: 'error', message: 'Server key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify signature
  let expectedSig: string;
  try {
    expectedSig = await sha512Signature(orderId, statusCode, grossAmount, serverKey);
  } catch (err: any) {
    console.error('[payment-webhook] Signature verification error:', err.message);
    return new Response(
      JSON.stringify({ status: 'error', message: 'Signature verification failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Compare signatures (Midtrans uses hex encoding)
  if (expectedSig !== signatureKey) {
    console.warn('[payment-webhook] Invalid signature for order:', orderId);
    return new Response(
      JSON.stringify({ status: 'error', message: 'Invalid signature' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Map status
  const txStatus = body.transaction_status as string;
  let paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED' | undefined;

  if (txStatus === 'capture') {
    paymentStatus = body.fraud_status === 'accept' ? 'PAID' : 'PENDING';
  } else {
    paymentStatus = MIDTRANS_STATUS_MAP[txStatus];
  }

  if (!paymentStatus) {
    console.warn('[payment-webhook] Unknown transaction status:', txStatus);
    return new Response(JSON.stringify({ status: 'ok' }), { headers: corsHeaders });
  }

  console.log(`[payment-webhook] Processing payment status: ${paymentStatus}`);

  let client: any;
  try {
    client = await createDbClient();

    // Find payment by orderId
    const paymentResult = await client`
      SELECT id, status, "orderId" FROM "Payment" WHERE "orderId" = ${orderId}
    `;

    if (paymentResult.length === 0) {
      console.warn('[payment-webhook] Payment not found for order:', orderId);
      await client.end();
      // Return 200 to stop Midtrans retries for unknown orders
      return new Response(JSON.stringify({ status: 'ok' }), { headers: corsHeaders });
    }

    const payment = paymentResult[0];
    const FINAL_STATUSES = ['PAID', 'FAILED', 'EXPIRED', 'REFUNDED'];

    // Idempotency: skip if already in final state
    if (FINAL_STATUSES.includes(payment.status)) {
      console.log('[payment-webhook] Payment already finalized:', payment.id, payment.status);
      await client.end();
      return new Response(JSON.stringify({ status: 'ok' }), { headers: corsHeaders });
    }

    // Extract method info
    const paymentType = (body.payment_type as string) || '';
    const methodCode = paymentType;
    const methodName = getMidtransMethodName(paymentType);
    const methodGroup = inferPaymentGroup(paymentType);

    // Update payment status
    const updatePaymentData: Record<string, unknown> = {
      status: paymentStatus,
      callbackPayload: body,
      methodCode,
      methodName,
      methodGroup,
      providerChannel: paymentType,
    };

    if (paymentStatus === 'PAID') {
      updatePaymentData.paidAt = new Date();
      if (body.transaction_id) {
        updatePaymentData.providerTransactionId = body.transaction_id;
      }
    } else if (paymentStatus === 'FAILED') {
      updatePaymentData.failedAt = new Date();
    } else if (paymentStatus === 'EXPIRED') {
      updatePaymentData.expiredAt = new Date();
    }

    // Build update query dynamically
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updatePaymentData)) {
      setClauses.push(`"${key}" = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    // Add updatedAt
    setClauses.push(`"updatedAt" = NOW()`);

    await client`
      UPDATE "Payment"
      SET ${client.unsafe(setClauses.join(', '))}
      WHERE id = ${payment.id}
    `.catch(() => {
      // Fallback: update individual fields
      return client`
        UPDATE "Payment"
        SET status = ${paymentStatus},
            "updatedAt" = NOW()
        WHERE id = ${payment.id}
      `;
    });

    console.log('[payment-webhook] Payment updated:', payment.id, '->', paymentStatus);

    // If payment is successful, process order
    if (paymentStatus === 'PAID') {
      // Get order info
      const orderResult = await client`
        SELECT id, "orderNumber", status, "deliveryLatitude", "deliveryLongitude",
               "baristaId", "customerName"
        FROM "Order"
        WHERE id = ${payment.orderId}
      `;

      if (orderResult.length === 0) {
        console.warn('[payment-webhook] Order not found:', payment.orderId);
        await client.end();
        return new Response(JSON.stringify({ status: 'ok' }), { headers: corsHeaders });
      }

      const order = orderResult[0];

      // Only update if in PENDING state
      if (order.status === 'PENDING') {
        // Update order status to SEARCHING
        await client`
          UPDATE "Order"
          SET status = 'SEARCHING',
              "paymentStatus" = 'PAID',
              "paidAt" = NOW(),
              "updatedAt" = NOW()
          WHERE id = ${order.id}
          AND status = 'PENDING'
        `;

        console.log('[payment-webhook] Order status updated to SEARCHING:', order.id);

        // Get order items for stock reduction
        const orderItems = await client`
          SELECT "productId", quantity FROM "OrderItem" WHERE "orderId" = ${order.id}
        `;

        // Reduce barista stock if barista is assigned (edge case: may not have barista yet)
        if (order.baristaId && orderItems.length > 0) {
          await reduceBaristaStock(client, order.id, order.baristaId, orderItems);
        }

        // Write to Firebase RTDB (async, don't block)
        let firebaseToken: string | null = null;
        try {
          if (firebaseClientEmail && firebasePrivateKey) {
            firebaseToken = await getFirebaseToken();
          }
        } catch (tokenErr: any) {
          console.log('[payment-webhook] Firebase token error:', tokenErr.message);
        }

        if (firebaseToken && order.deliveryLatitude && order.deliveryLongitude) {
          // Write order locations
          await writeOrderLocations(order.id, firebaseToken, {
            orderNumber: order.orderNumber,
            status: 'SEARCHING',
            customerLat: order.deliveryLatitude,
            customerLng: order.deliveryLongitude,
          });

          // Write order tracking
          await updateFirebaseOrderTracking(order.id, firebaseToken, {
            status: 'SEARCHING',
          });
        }

        // Call assign-barista function asynchronously
        // This is fire-and-forget - don't wait for it
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://kjezwxrebnixdpxljklv.supabase.co';
        fetch(`${supabaseUrl}/functions/v1/assign-barista`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            customerLat: order.deliveryLatitude,
            customerLng: order.deliveryLongitude,
          }),
        }).catch(err => {
          console.log('[payment-webhook] assign-barista call failed (non-blocking):', err.message);
        });
      }
    }

    await client.end();

    const duration = Date.now() - startTime;
    console.log(`[payment-webhook] Completed in ${duration}ms`);

    return new Response(JSON.stringify({ status: 'ok', durationMs: duration }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    if (client) await client.end();
    console.error('[payment-webhook] Error:', err.message);
    return new Response(
      JSON.stringify({ status: 'error', message: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
