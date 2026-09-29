// ============================================================
// Payment Webhook / Notification Handler
// POST /api/payment/notification
//
// Handles BOTH DOKU Checkout (Non-SNAP) and DOKU SNAP notification formats:
// - Non-SNAP: { transaction: { status: "SUCCESS" }, order: { invoice_number: "..." } }
// - SNAP: { latestTransactionStatus: "00", originalPartnerReferenceNo: "..." }
// ============================================================

import crypto from 'crypto';
import { handle } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import type { Prisma } from '@/prisma/generated/client';
import { updatePaymentFromWebhook } from '@/modules/payment/payment.service';
import {
  dokuNonSnapNotificationSchema,
  dokuSnapNotificationSchema,
  DOKU_STATUS_MAP,
} from '@/modules/payment/payment.validator';

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

  const requestId = headers['x-external-id'] ?? headers['request-id'] ?? 'unknown';

  // Log incoming notification payload
  console.log('[DOKU NOTIFICATION] Received:', JSON.stringify({
    headers: {
      'x-external-id': headers['x-external-id'],
      'client-id': headers['client-id'],
      'request-id': headers['request-id'],
    },
    bodyKeys: Object.keys(body),
    bodyPreview: {
      transaction: body.transaction,
      order: body.order,
      latestTransactionStatus: body.latestTransactionStatus,
      originalPartnerReferenceNo: body.originalPartnerReferenceNo,
    },
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

  // Parse and validate notification - try Non-SNAP first (DOKU Checkout), then SNAP
  let paymentId: string | undefined;
  let paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED' | 'REFUNDED' | undefined;
  let transactionId: string | undefined;
  let dokuPaymentMethod: string | undefined;

  // Try Non-SNAP format first (DOKU Checkout hosted page)
  const nonSnapResult = dokuNonSnapNotificationSchema.safeParse(body);
  if (nonSnapResult.success) {
    const notification = nonSnapResult.data;

    console.log('[DOKU NOTIFICATION] Parsed as Non-SNAP format');

    // Extract payment ID from order.invoice_number
    paymentId = notification.order?.invoice_number;

    // Extract status from transaction.status
    const rawStatus = notification.transaction?.status;
    if (rawStatus) {
      paymentStatus = DOKU_STATUS_MAP[rawStatus.toUpperCase()] as typeof paymentStatus;
      console.log('[DOKU NOTIFICATION] Non-SNAP status:', rawStatus, '-> mapped to:', paymentStatus);
    }

    // Extract transaction ID (DOKU's reference number)
    transactionId = notification.transaction?.original_request_id;

    // Extract payment method from service/channel
    if (notification.service?.id) {
      dokuPaymentMethod = notification.service.id;
    }
    if (notification.channel?.id) {
      dokuPaymentMethod = notification.channel.id;
    }

    // Log full notification for debugging
    console.log('[DOKU NOTIFICATION] Full Non-SNAP notification:', JSON.stringify(notification, null, 2));
  }

  // Try SNAP format if Non-SNAP failed
  if (!paymentId) {
    const snapResult = dokuSnapNotificationSchema.safeParse(body);
    if (snapResult.success) {
      const notification = snapResult.data;

      console.log('[DOKU NOTIFICATION] Parsed as SNAP format');

      // Extract payment ID from originalPartnerReferenceNo
      paymentId = notification.originalPartnerReferenceNo;

      // Extract status from latestTransactionStatus
      const rawStatus = notification.latestTransactionStatus;
      if (rawStatus) {
        paymentStatus = DOKU_STATUS_MAP[rawStatus] as typeof paymentStatus;
        console.log('[DOKU NOTIFICATION] SNAP status:', rawStatus, '-> mapped to:', paymentStatus);
      }

      // Extract transaction ID
      transactionId = notification.originalReferenceNo;

      // Extract payment method from additionalInfo
      const additionalInfo = notification.additionalInfo;
      if (additionalInfo) {
        dokuPaymentMethod = (additionalInfo.paymentScheme as string | undefined)
          || (additionalInfo.channel as string | undefined)
          || (additionalInfo.paymentMethod as string | undefined);
      }

      console.log('[DOKU NOTIFICATION] Full SNAP notification:', JSON.stringify(notification, null, 2));
    }
  }

  // If neither format parsed successfully, log and return error
  if (!paymentId && !paymentStatus) {
    const parseError = !nonSnapResult.success
      ? nonSnapResult.error.message
      : !dokuSnapNotificationSchema.safeParse(body).success
        ? 'Failed to parse as SNAP format'
        : 'Unknown error';

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
      processingError: parseError,
    });

    return Response.json(
      { responseCode: '4007400', responseMessage: 'Invalid notification format' },
      { status: 400 }
    );
  }

  // Check if we have a valid payment ID
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
      processingError: 'Could not extract payment ID from notification',
    });

    return Response.json(
      { responseCode: '4007400', responseMessage: 'Missing payment ID' },
      { status: 400 }
    );
  }

  // Check if we have a valid status
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
      processingError: `Unknown transaction status`,
    });

    return Response.json({ responseCode: '2007400', responseMessage: 'OK' });
  }

  console.log('[DOKU NOTIFICATION] Extracted - paymentId:', paymentId, 'status:', paymentStatus);

  // paymentId is the DOKU invoice number - look up by dokuInvoiceNumber
  const payment = await prisma.payment.findFirst({
    where: { dokuInvoiceNumber: paymentId },
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

  // Additional check: fetch order to verify it's in PENDING or SEARCHING status
  // This prevents processing if order was already updated by a concurrent webhook
  const order = await prisma.order.findUnique({
    where: { id: payment.orderId },
  });

  // Allow PENDING and SEARCHING order statuses to be updated
  // (if payment is pending, order should be PENDING; if payment is PAID, order might be SEARCHING)
  if (order && !['PENDING', 'SEARCHING'].includes(order.status)) {
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

  // Log payment method if available
  if (dokuPaymentMethod) {
    console.log('[DOKU NOTIFICATION] Payment method used:', dokuPaymentMethod);
  }

  // Process the payment update
  try {
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
