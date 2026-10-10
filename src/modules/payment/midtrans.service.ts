// ============================================================
// Midtrans Snap Service
// Creates Midtrans Snap tokens and handles payment interactions
// ============================================================

export interface SnapTokenRequest {
  orderId: string;
  grossAmount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  expiryDuration?: number; // in hours
  expiryUnit?: 'minutes' | 'hours' | 'days';
  finishUrl?: string; // redirect URL after payment
}

export interface SnapTokenResult {
  success: boolean;
  token?: string;
  redirectUrl?: string;
  error?: string;
}

// ============================================================
// Create Midtrans Snap Token
// ============================================================

export async function createSnapToken(request: SnapTokenRequest): Promise<SnapTokenResult> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

  if (!serverKey) {
    return { success: false, error: 'MIDTRANS_SERVER_KEY not configured' };
  }

  const snapEndpoint = isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

  const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;

  const payload: Record<string, unknown> = {
    transaction_details: {
      order_id: request.orderId,
      gross_amount: request.grossAmount,
    },
    customer_details: {
      first_name: request.customerName,
      email: request.customerEmail,
      phone: request.customerPhone,
    },
  };

  if (request.items && request.items.length > 0) {
    payload.item_details = request.items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }));
  }

  if (request.expiryDuration) {
    payload.expiry = {
      duration: request.expiryDuration,
      unit: request.expiryUnit || 'hours',
    };
  }

  // Redirect URL after payment (Midtrans will append transaction params)
  const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';
  const finishUrl = request.finishUrl || `${appUrl}/checkout/finish`;
  payload.callbacks = {
    finish: finishUrl,
  };

  try {
    const response = await fetch(snapEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      const errorMsg = (data.error_messages as string[] | undefined)?.join(', ')
        || (data.message as string | undefined)
        || `HTTP ${response.status}`;
      console.error('[MIDTRANS] Snap token creation failed:', errorMsg);
      return { success: false, error: errorMsg };
    }

    const token = data.token as string | undefined;
    const redirectUrl = data.redirect_url as string | undefined;

    if (!token || !redirectUrl) {
      return { success: false, error: 'Invalid response from Midtrans: missing token or redirect_url' };
    }

    console.log('[MIDTRANS] Snap token created for order:', request.orderId);
    return { success: true, token, redirectUrl };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MIDTRANS] Failed to create snap token:', msg);
    return { success: false, error: msg };
  }
}

// ============================================================
// Midtrans Config
// ============================================================

export interface MidtransConfig {
  serverKey: string;
  isProduction: boolean;
}

export function getMidtransConfig(): MidtransConfig {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY environment variable is not set');
  }
  return {
    serverKey,
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  };
}

// ============================================================
// Signature Verification
// SHA512(order_id + status_code + gross_amount + serverKey)
// ============================================================

import crypto from 'crypto';

export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string
): string {
  const input = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  return crypto.createHash('sha512').update(input).digest('hex');
}

// ============================================================
// Check Transaction Status (Core API)
// ============================================================

export async function checkTransactionStatus(orderId: string): Promise<{
  transactionStatus: string;
  fraudStatus?: string;
  grossAmount: string;
}> {
  const config = getMidtransConfig();
  const baseUrl = config.isProduction
    ? 'https://api.midtrans.com/v2'
    : 'https://api.sandbox.midtrans.com/v2';
  const url = `${baseUrl}/${encodeURIComponent(orderId)}/status`;
  const authHeader = `Basic ${Buffer.from(`${config.serverKey}:`).toString('base64')}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: authHeader,
      Accept: 'application/json',
    },
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(
      `Midtrans status check failed: ${String(data.status_message ?? response.statusText)}`
    );
  }

  return {
    transactionStatus: data.transaction_status as string,
    fraudStatus: data.fraud_status as string | undefined,
    grossAmount: data.gross_amount as string,
  };
}
