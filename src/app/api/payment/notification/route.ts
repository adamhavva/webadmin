// ============================================================
// Payment Webhook / Notification Handler
// POST /api/payment/notification
//
// Handles Midtrans payment notifications (webhooks)
// Notification URL: https://c0b30899bac8cf.lhr.life/api/payment/notification
// ============================================================

import crypto from 'crypto';
import { handle } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import type { Prisma } from '@/prisma/generated/client';
import { updatePaymentFromWebhook } from '@/modules/payment/payment.service';
import { midtransNotificationSchema, MIDTRANS_STATUS_MAP } from '@/modules/payment/payment.validator';

// ============================================================
// Helper: Verify Midtrans Signature
// SHA512(order_id + status_code + gross_amount + serverKey)
// ============================================================

function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string
): string {
  return crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest('hex');
}

// ============================================================
// Helper: Log webhook
// ============================================================

async function logWebhook(params: {
  notification: Record<string, unknown>;
  responseStatus: number;
  isProcessed: boolean;
  error?: string;
  paymentId?: string;
}) {
  try {
    await prisma.paymentWebhookLog.create({
      data: {
        requestPath: '/api/payment/notification',
        requestMethod: 'POST',
        requestBody: params.notification as Prisma.InputJsonValue,
        responseStatus: params.responseStatus,
        responseBody: { status: params.isProcessed ? 'ok' : 'error', message: params.error } as Prisma.InputJsonValue,
        isProcessed: params.isProcessed,
        processingError: params.error,
        paymentId: params.paymentId,
        processedAt: params.isProcessed ? new Date() : null,
      },
    });
  } catch (err) {
    console.error('[MIDTRANS WEBHOOK] Failed to log webhook:', err);
  }
}

// ============================================================
// POST Handler
// ============================================================

export const POST = handle(async (req: Request) => {
  const body = await req.json();

  // Log raw request for debugging (without sensitive data)
  const rawOrderId = body?.order_id || '(missing)';
  const rawStatus = body?.transaction_status || '(missing)';
  console.log(`[MIDTRANS WEBHOOK] Received — order: ${rawOrderId}, status: ${rawStatus}`);

  // Validate notification shape
  const parseResult = midtransNotificationSchema.safeParse(body);
  if (!parseResult.success) {
    console.warn('[MIDTRANS WEBHOOK] Invalid payload — likely manual/test request with empty body or wrong format. Webhook URL should only receive requests from Midtrans servers.');
    return Response.json({ status: 'error', message: 'Invalid payload' }, { status: 400 });
  }

  const notification = parseResult.data;

  // Get server key from env
  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';

  // Verify signature
  const expectedSig = verifyMidtransSignature(
    notification.order_id,
    notification.status_code,
    notification.gross_amount,
    serverKey
  );

  if (expectedSig !== notification.signature_key) {
    console.warn('[MIDTRANS WEBHOOK] Invalid signature for order:', notification.order_id);
    await logWebhook({
      notification: body as Record<string, unknown>,
      responseStatus: 401,
      isProcessed: false,
      error: 'Invalid signature',
    });
    return Response.json({ status: 'error', message: 'Invalid signature' }, { status: 401 });
  }

  // Map status
  const txStatus = notification.transaction_status;
  let paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED' | undefined;

  if (txStatus === 'capture') {
    paymentStatus = notification.fraud_status === 'accept' ? 'PAID' : 'PENDING';
  } else {
    paymentStatus = MIDTRANS_STATUS_MAP[txStatus];
  }

  if (!paymentStatus) {
    console.warn('[MIDTRANS WEBHOOK] Unknown transaction status:', txStatus);
    await logWebhook({
      notification: body as Record<string, unknown>,
      responseStatus: 200,
      isProcessed: false,
      error: `Unknown status: ${txStatus}`,
    });
    return Response.json({ status: 'ok' });
  }

  // Find payment by orderId
  const payment = await prisma.payment.findFirst({
    where: { orderId: notification.order_id },
  });

  if (!payment) {
    console.warn('[MIDTRANS WEBHOOK] Payment not found for order:', notification.order_id);
    await logWebhook({
      notification: body as Record<string, unknown>,
      responseStatus: 404,
      isProcessed: false,
      error: `Payment not found for order: ${notification.order_id}`,
    });
    // Return 200 to stop Midtrans retries for unknown orders
    return Response.json({ status: 'ok' });
  }

  // Idempotency: skip if already in final state
  if (['PAID', 'FAILED', 'EXPIRED', 'REFUNDED'].includes(payment.status)) {
    await logWebhook({
      notification: body as Record<string, unknown>,
      responseStatus: 200,
      isProcessed: true,
      paymentId: payment.id,
    });
    return Response.json({ status: 'ok' });
  }

  // Process payment update
  try {
    await updatePaymentFromWebhook(
      payment.id,
      paymentStatus,
      notification.transaction_id,
      body as Record<string, unknown>,
      notification.payment_type
    );

    await logWebhook({
      notification: body as Record<string, unknown>,
      responseStatus: 200,
      isProcessed: true,
      paymentId: payment.id,
    });

    console.log('[MIDTRANS WEBHOOK] Payment updated:', payment.id, '->', paymentStatus);
    return Response.json({ status: 'ok' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MIDTRANS WEBHOOK] Failed to process payment update:', msg);

    await logWebhook({
      notification: body as Record<string, unknown>,
      responseStatus: 500,
      isProcessed: false,
      error: msg,
      paymentId: payment.id,
    });

    return Response.json({ status: 'error', message: msg }, { status: 500 });
  }
});
