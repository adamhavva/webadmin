/**
 * DOKU Checkout Service - Simplified
 *
 * DOKU Checkout = Hosted Payment Page
 * Flow:
 * 1. Create checkout session → get paymentUrl
 * 2. Redirect customer to DOKU hosted page
 * 3. Customer selects payment method (QRIS, VA, eWallet) on DOKU page
 * 4. DOKU webhook notification → update payment status
 * 5. Customer redirected back to merchant
 */

import crypto from 'crypto';
import { mapToDOKUChannel } from './providers/doku-checkout/channels';

// ============================================================================
// Types
// ============================================================================

export interface DOKUConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  isProduction: boolean;
}

export interface DOKUCheckoutRequest {
  orderId: string;
  amount: number; // Amount in IDR (integer)
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod?: string; // Optional: let customer choose on DOKU page
  expiryMinutes?: number;
}

export interface DOKUCheckoutResult {
  success: boolean;
  orderId: string;
  paymentUrl?: string;
  invoiceNumber?: string;
  expiryTime?: string;
  error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

export function getDOKUConfig(): DOKUConfig {
  const isProduction = process.env.DOKU_PRODUCTION === 'true';

  return {
    baseUrl: isProduction
      ? 'https://api.doku.com'
      : 'https://api-sandbox.doku.com',
    clientId: process.env.DOKU_CLIENT_ID || 'BRN-0262-1787492772432',
    clientSecret: process.env.DOKU_API_SECRET_KEY || '',
    isProduction,
  };
}

// ============================================================================
// Signature Generation (HMAC-SHA256)
// ============================================================================

function generateUUID(): string {
  return crypto.randomUUID();
}

function generateSignature(
  method: string,
  endpoint: string,
  clientId: string,
  requestId: string,
  timestamp: string,
  body: string,
  clientSecret: string
): string {
  // Digest: SHA-256 hash of request body, base64 encoded
  const bodyHash = crypto
    .createHash('sha256')
    .update(body || '{}')
    .digest('base64');

  // StringToSign format (per DOKU docs)
  const stringToSign = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${endpoint}`,
    `Digest:${bodyHash}`,
  ].join('\n');

  // HMAC-SHA256 with clientSecret
  const signature = crypto
    .createHmac('sha256', clientSecret)
    .update(stringToSign)
    .digest('base64');

  return `HMACSHA256=${signature}`;
}

// ============================================================================
// Create DOKU Checkout Session
// ============================================================================

export async function createDOKUCheckout(
  request: DOKUCheckoutRequest
): Promise<DOKUCheckoutResult> {
  const config = getDOKUConfig();
  const timestamp = new Date().toISOString().slice(0, 19) + 'Z';
  const requestId = generateUUID();

  try {
    // Build DOKU Checkout request body
    // Reference: https://developers.doku.com/accept-payments/doku-checkout
    const dokuBody: Record<string, unknown> = {
      order: {
        amount: request.amount,
        invoice_number: `ORD-${request.orderId.slice(0, 8)}-${Date.now()}`,
      },
      payment: {
        payment_due_date: request.expiryMinutes || 60,
      },
      customer: {
        name: request.customerName,
        ...(request.customerEmail && { email: request.customerEmail }),
        ...(request.customerPhone && { phone: request.customerPhone }),
      },
    };

    // If payment method is NOT specified (undefined), DOKU shows ALL payment methods
    // If payment method IS specified, DOKU shows only that specific method
    const dokuChannel = mapToDOKUChannel(request.paymentMethod || '');
    if (dokuChannel) {
      (dokuBody.payment as Record<string, unknown>).payment_method = dokuChannel;
    }

    const bodyString = JSON.stringify(dokuBody);
    const signature = generateSignature(
      'POST',
      '/checkout/v1/payment',
      config.clientId,
      requestId,
      timestamp,
      bodyString,
      config.clientSecret
    );

    console.log('[DOKU Checkout] Request:', {
      endpoint: '/checkout/v1/payment',
      body: dokuBody,
      requestId,
      timestamp,
    });

    // Call DOKU API
    const response = await fetch(`${config.baseUrl}/checkout/v1/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': config.clientId,
        'Request-Id': requestId,
        'Request-Timestamp': timestamp,
        'Signature': signature,
      },
      body: bodyString,
    });

    const responseData = await response.json();
    console.log('[DOKU Checkout] Response:', responseData);

    if (!response.ok) {
      return {
        success: false,
        orderId: request.orderId,
        error: `DOKU Error: ${JSON.stringify(responseData)}`,
      };
    }

    // Extract payment URL from response
    // DOKU Checkout response structure:
    // { response: { payment: { url: "https://..." } } }
    const paymentInfo = responseData?.response?.payment;
    const paymentUrl = paymentInfo?.url;

    if (!paymentUrl) {
      return {
        success: false,
        orderId: request.orderId,
        error: 'No payment URL in DOKU response',
      };
    }

    return {
      success: true,
      orderId: request.orderId,
      paymentUrl,
      invoiceNumber: (dokuBody.order as {invoice_number?: string})?.invoice_number,
      expiryTime: paymentInfo?.expired_datetime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DOKU Checkout] Error:', message);

    return {
      success: false,
      orderId: request.orderId,
      error: message,
    };
  }
}

// ============================================================================
// Check Payment Status (optional polling)
// ============================================================================

export async function checkDOKUPaymentStatus(invoiceNumber: string) {
  const config = getDOKUConfig();
  const timestamp = new Date().toISOString().slice(0, 19) + 'Z';
  const requestId = generateUUID();

  try {
    const bodyString = JSON.stringify({
      order: {
        invoice_number: invoiceNumber,
      },
    });

    const signature = generateSignature(
      'POST',
      '/checkout/v1/payment-status',
      config.clientId,
      requestId,
      timestamp,
      bodyString,
      config.clientSecret
    );

    const response = await fetch(`${config.baseUrl}/checkout/v1/payment-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': config.clientId,
        'Request-Id': requestId,
        'Request-Timestamp': timestamp,
        'Signature': signature,
      },
      body: bodyString,
    });

    const responseData = await response.json();
    console.log('[DOKU Status] Response:', responseData);

    return {
      success: response.ok,
      data: responseData,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DOKU Status] Error:', message);
    return {
      success: false,
      error: message,
    };
  }
}
