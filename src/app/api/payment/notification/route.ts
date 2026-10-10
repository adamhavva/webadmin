// ============================================================
// Payment Webhook / Notification Handler
// POST /api/payment/notification
// ============================================================

import crypto from 'crypto';
import { handle } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import type { Prisma } from '@/prisma/generated/client';
import { updatePaymentFromWebhook } from '@/modules/payment/payment.service';
import { midtransNotificationSchema, MIDTRANS_STATUS_MAP } from '@/modules/payment/payment.validator';
import { syncOrderToSupabase, assignNearestBarista } from '@/lib/supabase';

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
  notification?: Record<string, unknown>;
  responseStatus: number;
  isProcessed: boolean;
  error?: string;
  paymentId?: string;
}) {
  try {
    await prisma.paymentWebhookLog.create({
      data: {
        providerId: 'MIDTRANS',
        requestPath: '/api/payment/notification',
        requestMethod: 'POST',
        requestHeaders: {} as Prisma.InputJsonValue,
        requestBody: (params.notification ?? {}) as Prisma.InputJsonValue,
        responseStatus: params.responseStatus,
        responseBody: (params.error ? { error: params.error } : { status: 'ok' }) as Prisma.InputJsonValue,
        isProcessed: params.isProcessed,
        processingError: params.error,
        paymentId: params.paymentId,
        processedAt: params.isProcessed ? new Date() : null,
      },
    });
  } catch (logErr) {
    console.error('[MIDTRANS WEBHOOK] Failed to log webhook:', logErr);
  }
}

// ============================================================
// POST Handler
// ============================================================

export const POST = handle(async (req: Request) => {
  const bodyText = await req.text();
  const body = JSON.parse(bodyText);

  const rawOrderId = body?.order_id || '(missing)';
  const rawStatus = body?.transaction_status || '(missing)';
  console.log(`[MIDTRANS WEBHOOK] Received — order: ${rawOrderId}, status: ${rawStatus}`);

  const parseResult = midtransNotificationSchema.safeParse(body);
  if (!parseResult.success) {
    console.warn('[MIDTRANS WEBHOOK] Invalid payload');
    return Response.json({ status: 'error', message: 'Invalid payload' }, { status: 400 });
  }

  const notification = parseResult.data;

  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';

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
      error: `Unknown transaction status: ${txStatus}`,
    });
    return Response.json({ status: 'ok', message: 'Status ignored' });
  }

  // Find payment by order_id
  const payment = await prisma.payment.findUnique({
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
    return Response.json({ status: 'error', message: 'Payment not found' }, { status: 404 });
  }

  // Skip if already in final state
  if (['PAID', 'FAILED', 'EXPIRED', 'REFUNDED'].includes(payment.status)) {
    await logWebhook({
      notification: body as Record<string, unknown>,
      responseStatus: 200,
      isProcessed: true,
      paymentId: payment.id,
    });
    return Response.json({ status: 'ok', message: 'Already processed' });
  }

  try {
    await updatePaymentFromWebhook(
      payment.id,
      paymentStatus,
      notification.transaction_id,
      body as Record<string, unknown>,
      notification.payment_type
    );

    // If payment is successful, trigger barista assignment flow
    if (paymentStatus === 'PAID') {
      const order = await prisma.order.findUnique({
        where: { id: payment.orderId },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          deliveryLatitude: true,
          deliveryLongitude: true,
        },
      });

      if (order && order.deliveryLatitude && order.deliveryLongitude) {
        try {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'SEARCHING' },
          });

          await syncOrderToSupabase({
            id: order.id,
            orderNumber: order.orderNumber,
            status: 'SEARCHING',
            deliveryLatitude: order.deliveryLatitude,
            deliveryLongitude: order.deliveryLongitude,
          });

          const assignResult = await assignNearestBarista({
            orderId: order.id,
            customerLat: order.deliveryLatitude,
            customerLng: order.deliveryLongitude,
          });

          if (assignResult.success) {
            console.log('[MIDTRANS WEBHOOK] Barista assigned:', assignResult.baristaName, 'at', assignResult.distance);
            await prisma.order.update({
              where: { id: order.id },
              data: {
                baristaId: assignResult.baristaId,
                status: 'ASSIGNED',
              },
            });
          } else {
            console.warn('[MIDTRANS WEBHOOK] Failed to assign barista:', assignResult.message);
          }
        } catch (assignError) {
          console.error('[MIDTRANS WEBHOOK] Barista assignment error:', assignError);
        }
      }
    }

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
