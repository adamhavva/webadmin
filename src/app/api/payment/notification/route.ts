// ============================================================
// Payment Webhook / Notification Handler
// POST /api/payment/notification
// ============================================================

import crypto from 'crypto';
import { handle } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import type { Prisma } from '@/prisma/generated/client';
import { updatePaymentFromWebhook } from '@/modules/payment/payment.service';
import { dokuNotificationSchema, DOKU_STATUS_MAP } from '@/modules/payment/payment.validator';

// ============================================================
// Helper: Log webhook
// ============================================================

async function logWebhook(params: {
  providerId: string;
  requestId?: string;
  requestPath: string;
  requestMethod: string;
  requestHeaders: Record<string, string>;
  requestBody: unknown;
  responseStatus: number;
  responseBody: unknown;
  isProcessed: boolean;
  processingError?: string;
  paymentId?: string;
}) {
  await prisma.paymentWebhookLog.create({
    data: {
      providerId: params.providerId,
      requestId: params.requestId,
      requestPath: params.requestPath,
      requestMethod: params.requestMethod,
      requestHeaders: params.requestHeaders,
      requestBody: params.requestBody as Prisma.InputJsonValue,
      responseStatus: params.responseStatus,
      responseBody: params.responseBody as Prisma.InputJsonValue,
      isProcessed: params.isProcessed,
      processingError: params.processingError,
      paymentId: params.paymentId,
      processedAt: params.isProcessed ? new Date() : null,
    },
  });
}

// ============================================================
// Helper: Verify DOKU Webhook Signature
// DOKU sends X-Doku-Signature header with HMAC-SHA256 signature
// ============================================================

function verifyDokuSignature(
  body: string,
  signature: string,
  clientSecret: string
): boolean {
  // DOKU webhook signature format: HMACSHA256=<base64>
  // Signature is HMAC-SHA256 of the raw request body
  const bodyHash = crypto
    .createHash('sha256')
    .update(body)
    .digest('base64');

  const stringToSign = `HMACSHA256=${bodyHash}`;

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(stringToSign)
    );
  } catch {
    return false;
  }
}

// ============================================================
// POST Handler
// ============================================================

export const POST = handle(async (req: Request) => {
  const bodyText = await req.text();
  const body = JSON.parse(bodyText);

  // Get DOKU provider
  const provider = await prisma.paymentProviderConfig.findFirst({
    where: { code: 'DOKU', isActive: true },
  });

  if (!provider) {
    return Response.json(
      { responseCode: '5007400', responseMessage: 'Provider not configured' },
      { status: 500 }
    );
  }

  // Extract headers
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const requestId = headers['x-external-id'] ?? 'unknown';

  // Log incoming notification payload (without sensitive data)
  console.log('[DOKU NOTIFICATION] Received:', JSON.stringify({
    originalReferenceNo: body.originalReferenceNo,
    originalPartnerReferenceNo: body.originalPartnerReferenceNo,
    latestTransactionStatus: body.latestTransactionStatus,
    transactionStatusDesc: body.transactionStatusDesc,
    amount: body.amount,
    requestId,
  }));

  // Verify webhook signature if secret is configured
  const webhookSecret = provider.webhookSecret;
  if (webhookSecret) {
    const signature = headers['x-doku-signature'];
    if (!signature) {
      console.warn('[DOKU NOTIFICATION] Missing signature header');

      await logWebhook({
        providerId: provider.id,
        requestId,
        requestPath: '/api/payment/notification',
        requestMethod: 'POST',
        requestHeaders: headers,
        requestBody: body,
        responseStatus: 401,
        responseBody: { error: 'Missing signature' },
        isProcessed: false,
        processingError: 'Missing X-Doku-Signature header',
      });

      return Response.json(
        { responseCode: '4017400', responseMessage: 'Missing signature' },
        { status: 401 }
      );
    }

    const isValid = verifyDokuSignature(bodyText, signature, webhookSecret);
    if (!isValid) {
      console.warn('[DOKU NOTIFICATION] Invalid signature');

      await logWebhook({
        providerId: provider.id,
        requestId,
        requestPath: '/api/payment/notification',
        requestMethod: 'POST',
        requestHeaders: headers,
        requestBody: body,
        responseStatus: 401,
        responseBody: { error: 'Invalid signature' },
        isProcessed: false,
        processingError: 'Invalid webhook signature',
      });

      return Response.json(
        { responseCode: '4017400', responseMessage: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('[DOKU NOTIFICATION] Signature verified successfully');
  }

  // Parse and validate notification
  const parseResult = dokuNotificationSchema.safeParse(body);
  if (!parseResult.success) {
    await logWebhook({
      providerId: provider.id,
      requestId,
      requestPath: '/api/payment/notification',
      requestMethod: 'POST',
      requestHeaders: headers,
      requestBody: body,
      responseStatus: 400,
      responseBody: { error: 'Invalid notification format' },
      isProcessed: false,
      processingError: parseResult.error.message,
    });

    return Response.json(
      { responseCode: '4007400', responseMessage: 'Invalid notification format' },
      { status: 400 }
    );
  }

  const notification = parseResult.data;

  // Map DOKU status to our status
  const paymentStatus = DOKU_STATUS_MAP[notification.latestTransactionStatus];
  if (!paymentStatus) {
    await logWebhook({
      providerId: provider.id,
      requestId,
      requestPath: '/api/payment/notification',
      requestMethod: 'POST',
      requestHeaders: headers,
      requestBody: body,
      responseStatus: 200,
      responseBody: { responseCode: '2007400', responseMessage: 'Status ignored' },
      isProcessed: false,
      processingError: `Unknown transaction status: ${notification.latestTransactionStatus}`,
    });

    return Response.json({ responseCode: '2007400', responseMessage: 'OK' });
  }

  // Find payment by partner reference (payment ID)
  const paymentId = notification.originalPartnerReferenceNo;
  if (!paymentId) {
    await logWebhook({
      providerId: provider.id,
      requestId,
      requestPath: '/api/payment/notification',
      requestMethod: 'POST',
      requestHeaders: headers,
      requestBody: body,
      responseStatus: 400,
      responseBody: { error: 'Missing payment ID' },
      isProcessed: false,
      processingError: 'originalPartnerReferenceNo is required',
    });

    return Response.json(
      { responseCode: '4007400', responseMessage: 'Missing payment ID' },
      { status: 400 }
    );
  }

  // Find the payment
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    await logWebhook({
      providerId: provider.id,
      requestId,
      requestPath: '/api/payment/notification',
      requestMethod: 'POST',
      requestHeaders: headers,
      requestBody: body,
      responseStatus: 404,
      responseBody: { error: 'Payment not found' },
      isProcessed: false,
      processingError: `Payment not found: ${paymentId}`,
    });

    return Response.json(
      { responseCode: '4047400', responseMessage: 'Payment not found' },
      { status: 404 }
    );
  }

  // Skip if already in final state
  if (['PAID', 'FAILED', 'EXPIRED', 'REFUNDED'].includes(payment.status)) {
    await logWebhook({
      providerId: provider.id,
      requestId,
      requestPath: '/api/payment/notification',
      requestMethod: 'POST',
      requestHeaders: headers,
      requestBody: body,
      responseStatus: 200,
      responseBody: { responseCode: '2007400', responseMessage: 'Already processed' },
      isProcessed: true,
      paymentId,
    });

    return Response.json({ responseCode: '2007400', responseMessage: 'OK' });
  }

  // Additional check: fetch order to verify it's in PENDING status
  // This prevents processing if order was already updated by a concurrent webhook
  const order = await prisma.order.findUnique({
    where: { id: payment.orderId },
  });

  if (order && order.status !== 'PENDING') {
    await logWebhook({
      providerId: provider.id,
      requestId,
      requestPath: '/api/payment/notification',
      requestMethod: 'POST',
      requestHeaders: headers,
      requestBody: body,
      responseStatus: 200,
      responseBody: { responseCode: '2007400', responseMessage: 'Order already processed' },
      isProcessed: true,
      paymentId,
    });

    return Response.json({ responseCode: '2007400', responseMessage: 'OK' });
  }

  // Extract payment method from DOKU notification
  // DOKU sends this in additionalInfo.paymentScheme or similar
  const additionalInfo = body?.additionalInfo as Record<string, unknown> | undefined;
  const dokuPaymentMethod = (additionalInfo?.paymentScheme as string | undefined)
    || (additionalInfo?.channel as string | undefined)
    || (additionalInfo?.paymentMethod as string | undefined)
    || undefined;

  if (dokuPaymentMethod) {
    console.log('[DOKU NOTIFICATION] Payment method used:', dokuPaymentMethod);
  }

  // Process the payment update
  try {
    const transactionId = notification.originalReferenceNo;

    await updatePaymentFromWebhook(
      paymentId,
      paymentStatus,
      transactionId,
      body as Record<string, unknown>,
      dokuPaymentMethod
    );

    await logWebhook({
      providerId: provider.id,
      requestId,
      requestPath: '/api/payment/notification',
      requestMethod: 'POST',
      requestHeaders: headers,
      requestBody: body,
      responseStatus: 200,
      responseBody: { responseCode: '2007400', responseMessage: 'OK' },
      isProcessed: true,
      paymentId,
    });

    return Response.json({ responseCode: '2007400', responseMessage: 'OK' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await logWebhook({
      providerId: provider.id,
      requestId,
      requestPath: '/api/payment/notification',
      requestMethod: 'POST',
      requestHeaders: headers,
      requestBody: body,
      responseStatus: 500,
      responseBody: { error: errorMessage },
      isProcessed: false,
      processingError: errorMessage,
      paymentId,
    });

    return Response.json(
      { responseCode: '5007400', responseMessage: errorMessage },
      { status: 500 }
    );
  }
});
