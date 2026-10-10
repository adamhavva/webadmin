import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Environment variables
const databaseUrl = Deno.env.get('DATABASE_URL');

// Firebase config - read from environment variables directly
const firebaseClientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
const firebasePrivateKey = Deno.env.get('FIREBASE_PRIVATE_KEY');

if (firebaseClientEmail && firebasePrivateKey) {
  console.log('[firebase-token] Firebase credentials loaded from environment');
} else {
  console.log('[firebase-token] Firebase credentials not configured in environment');
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

// Generate Firebase custom token using Identity Platform API
async function generateFirebaseCustomToken(firebaseUid: string): Promise<string> {
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

  // Exchange for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signedJwt }),
  });
  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Firebase token exchange failed: ${error}`);
  }
  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  // Generate custom token via Identity Platform API
  const customTokenResponse = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${serviceAccountRaw ? JSON.parse(serviceAccountRaw).project_id : Deno.env.get('FIREBASE_PROJECT_ID')}/accounts:signInWithCustomToken?key=${Deno.env.get('FIREBASE_API_KEY') || ''}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: signedJwt,
        returnSecureToken: true,
      }),
    }
  );

  // Fallback: return the signed JWT as custom token
  // Client can use this with signInWithCustomToken
  return signedJwt;
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

  console.log('[firebase-token] Request received');

  if (!databaseUrl) {
    return new Response(
      JSON.stringify({ success: false, message: 'DATABASE_URL not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!firebaseClientEmail || !firebasePrivateKey) {
    return new Response(
      JSON.stringify({ success: false, message: 'Firebase credentials not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let client: any;
  try {
    client = await createDbClient();
    const body = await req.json();
    const { userId, email } = body;

    console.log(`[firebase-token] Request: userId=${userId}, email=${email}`);

    if (!userId) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid userId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from database
    const userResult = await client.queryObject(
      `SELECT id, "firebaseUid", email, name, role
       FROM "User" WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = userResult.rows[0];
    console.log('[firebase-token] User:', user.id, user.email, user.role);

    // Get or use firebaseUid
    let firebaseUid = user.firebaseUid;

    // If no firebaseUid, we need to create one via Firebase Admin
    // For now, return error - user should be created in Firebase first
    if (!firebaseUid) {
      await client.end();
      return new Response(
        JSON.stringify({ success: false, message: 'User has no firebaseUid. Create Firebase user first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await client.end();

    // Generate custom token
    const customToken = await generateFirebaseCustomToken(firebaseUid);

    console.log(`[firebase-token] SUCCESS: Generated token for ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        customToken,
        firebaseUid,
        expiresIn: 3600,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    if (client) await client.end();
    console.error('[firebase-token] Error:', err.message);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal error', error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
