/**
 * DOKU Checkout Service
 * Server-side payment gateway for ASCEND Coffee Business
 *
 * This file provides DOKU API integration utilities:
 * - Signature generation for API authentication
 * - Checkout session creation (hosted payment page)
 * - Payment method configurations
 *
 * The actual payment processing flow is:
 * 1. POST /api/payment/checkout → creates payment record + calls createDOKUCheckout
 * 2. Customer pays on DOKU hosted page
 * 3. DOKU sends webhook to POST /api/payment/notification
 * 4. Webhook updates payment/order status + reduces stock
 */

import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface DOKUConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  mallId: string;
  terminalId: string;
  isProduction: boolean;
}

export interface DOKUPaymentMethod {
  code: string;
  type: 'QRIS' | 'VA' | 'EWALLET';
  name: string;
  bankCode?: string;
  dokuChannelCode: string;
}

export interface DOKUCheckoutRequest {
  orderId: string;
  amount: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  expiryMinutes?: number;
  paymentMethodTypes?: string[];
}

export interface DOKUCheckoutResult {
  success: boolean;
  orderId: string;
  paymentUrl?: string;
  invoiceNumber?: string;
  expiryTime?: string;
  error?: string;
  rawResponse?: Record<string, unknown>;
}

// ============================================================================
// Configuration - DOKU_PRODUCTION=true (production) / false (sandbox)
// ============================================================================

export function getDOKUConfig(): DOKUConfig {
  const isProduction = process.env.DOKU_PRODUCTION === 'true';

  return {
    baseUrl: isProduction
      ? 'https://api.doku.com'
      : 'https://api-sandbox.doku.com',
    clientId: process.env.DOKU_CLIENT_ID || 'BRN-0262-1787492772432',
    clientSecret: process.env.DOKU_API_SECRET_KEY || '',
    mallId: process.env.DOKU_CLIENT_ID || '',
    terminalId: process.env.DOKU_TERMINAL_ID || '001',
    isProduction,
  };
}

export function isDOKUProduction(): boolean {
  return process.env.DOKU_PRODUCTION === 'true';
}

// ============================================================================
// Signature Generation (HMAC-SHA256) - DOKU Standard
// ============================================================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// DOKU Checkout API signature format
// Components:
// Client-Id:{clientId}
// Request-Id:{requestId}
// Request-Timestamp:{timestamp}
// Request-Target:{targetPath}
// Digest:{digestValue}
// HMAC-SHA256 of the above string, Base64 encoded, prepended with "HMACSHA256="
export function generateCheckoutSignature(
  method: string,
  endpoint: string,
  clientId: string,
  requestId: string,
  timestamp: string,
  body: string,
  clientSecret: string
): string {
  // Generate Digest: SHA-256 hash of request body, base64 encoded
  const bodyHash = crypto
    .createHash('sha256')
    .update(body === '' ? '{}' : body)
    .digest('base64');

  // Build component string with newlines
  const stringToSign = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${endpoint}`,
    `Digest:${bodyHash}`,
  ].join('\n');

  // Calculate HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', clientSecret)
    .update(stringToSign)
    .digest('base64');

  // Prepend HMACSHA256= prefix
  return `HMACSHA256=${signature}`;
}

// Legacy SNAP signature (for reference)
function generateSnapSignature(
  method: string,
  endpoint: string,
  body: string,
  timestamp: string,
  clientSecret: string
): string {
  const bodyHash = crypto
    .createHash('sha256')
    .update(body === '' ? '{}' : body)
    .digest('hex');

  const stringToSign = [
    method.toUpperCase(),
    endpoint,
    timestamp,
    bodyHash,
  ].join('\n');

  return crypto
    .createHmac('sha256', clientSecret)
    .update(stringToSign)
    .digest('base64');
}

// ============================================================================
// API Request Helper
// ============================================================================

async function dokuRequest<T>(
  method: string,
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const config = getDOKUConfig();
  // Timestamp format: YYYY-MM-DDTHH:mm:ssZ (UTC, no milliseconds)
  // Using UTC time explicitly to avoid server timezone issues
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace('T', 'T') + 'Z';
  const bodyString = JSON.stringify(body);
  const requestId = generateUUID();

  // Checkout API signature
  const checkoutSignature = generateCheckoutSignature(
    method,
    endpoint,
    config.clientId,
    requestId,
    timestamp,
    bodyString,
    config.clientSecret
  );

  console.log('[DOKU] Request body:', bodyString);
  console.log('[DOKU] Request-Id:', requestId);
  console.log('[DOKU] Timestamp:', timestamp);
  console.log('[DOKU] Server UTC now:', new Date().toISOString());
  console.log('[DOKU] Client-Id:', config.clientId);
  console.log('[DOKU] Has Secret:', !!config.clientSecret);

  const externalId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  console.log(`[DOKU] ${config.isProduction ? 'PRODUCTION' : 'SANDBOX'} → ${method} ${endpoint}`);

  const isCheckoutApi = endpoint.startsWith('/checkout/');

  const headers: Record<string, string> = {
    'Authorization': `Basic ${auth}`,
    'Client-Id': config.clientId,
    'X-PARTNER-ID': config.clientId,
    'X-EXTERNAL-ID': externalId,
    'X-TIMESTAMP': timestamp,
    'Request-Id': requestId,
    'Request-Timestamp': timestamp,
    'Signature': checkoutSignature,
    'Content-Type': 'application/json',
  };

  // SNAP API requires X-SIGNATURE header (legacy)
  if (!isCheckoutApi) {
    const snapSignature = generateSnapSignature(
      method,
      endpoint,
      bodyString,
      timestamp,
      config.clientSecret
    );
    headers['X-SIGNATURE'] = snapSignature;
  }

  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    method,
    headers,
    body: bodyString,
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error(`[DOKU] Error: ${responseText}`);
    throw new Error(`DOKU API Error: ${responseText}`);
  }

  console.log(`[DOKU] Success: ${responseText.substring(0, 200)}`);
  return JSON.parse(responseText);
}

// ============================================================================
// DOKU Checkout Session (Hosted Page)
// Main function for creating payments via DOKU hosted checkout page
// ============================================================================

export async function createDOKUCheckout(
  request: DOKUCheckoutRequest
): Promise<DOKUCheckoutResult> {
  const config = getDOKUConfig();

  try {
    // Generate invoice number
    const invoiceNumber = `ORD-${request.orderId}-${Date.now()}`;
    const expiryMinutes = request.expiryMinutes || 60;

    // Build DOKU Checkout request (hosted page)
    // Based on DOKU docs: https://developers.doku.com/accept-payments/doku-checkout/integration-guide/backend-integration
    const dokuRequestBody: Record<string, unknown> = {
      order: {
        amount: request.amount,
        invoice_number: invoiceNumber,
      },
      payment: {
        payment_due_date: expiryMinutes,
      },
    };

    console.log('[DOKU Checkout] Creating session:', JSON.stringify(dokuRequestBody, null, 2));

    // Call DOKU API - using checkout v1 endpoint
    const response = await dokuRequest<Record<string, unknown>>(
      'POST',
      '/checkout/v1/payment',
      dokuRequestBody
    );

    console.log('[DOKU Checkout] Response:', JSON.stringify(response, null, 2));

    // Extract response data
    // Response structure: { message: [], response: { order: {...}, payment: {...}, additional_info: {...} } }
    const dokuResponse = (response as { response?: Record<string, unknown> }).response || {};
    const paymentInfo = (dokuResponse.payment || {}) as Record<string, unknown>;

    // DOKU Checkout returns 'url' in payment object
    const paymentUrl = (paymentInfo.url || paymentInfo.payment_url) as string | undefined;
    const expiryTime = paymentInfo.expired_datetime as string | undefined;

    console.log('[DOKU Checkout] Extracted paymentUrl:', paymentUrl);
    console.log('[DOKU Checkout] Extracted expiryTime:', expiryTime);
    console.log('[DOKU Checkout] Payment keys:', Object.keys(paymentInfo));

    if (!paymentUrl) {
      throw new Error('No payment URL in DOKU response. Payment object: ' + JSON.stringify(paymentInfo));
    }

    return {
      success: true,
      orderId: request.orderId,
      paymentUrl,
      invoiceNumber,
      expiryTime: expiryTime || new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString(),
      rawResponse: response,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DOKU Checkout] Session creation failed:', errorMessage);

    return {
      success: false,
      orderId: request.orderId,
      error: `DOKU API Error: ${errorMessage}. Please check DOKU credentials and try again.`,
    };
  }
}

// Payment methods are fetched from database via PaymentMethodConfig
// No hardcoded payment methods - all via DOKU API
