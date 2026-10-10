// ============================================================
// Payment Service - Core payment logic
// All payments go through Midtrans Snap
// ============================================================

import { prisma } from '@/lib/db';
import type { Prisma } from '@/prisma/generated/client';
import { assignOrderToBaristas } from '@/modules/order/order.service';
import { broadcastOrderToBaristas as broadcastToRTDB, findNearestBaristasWithStock } from '@/modules/order/order.assignment.service';

// ============================================================
// Types
// ============================================================

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';

/**
 * Payment interface — represents a payment record in the system.
 *
 * NOTE: Fields methodCode, methodName, methodGroup, and providerChannel are
 * SNAPSHOTS captured from the Midtrans notification at the time of payment.
 * They are NOT always populated at creation time (before payment is completed).
 */

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  methodCode: string;
  methodName: string;
  methodGroup?: string;
  providerChannel?: string;
  methodFeeAmount: number;
  status: PaymentStatus;
  snapToken?: string;
  providerTransactionId?: string;
  paymentUrl?: string;
  requestPayload?: Record<string, unknown>;
  callbackPayload?: Record<string, unknown>;
  paidAt?: Date;
  expiredAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Helper: Convert Prisma Payment to Payment interface
// ============================================================

function convertToPayment(p: Record<string, unknown>): Payment {
  return {
    id: p.id as string,
    orderId: p.orderId as string,
    amount: Number(p.amount),
    currency: (p.currency as string) ?? 'IDR',
    methodCode: (p.methodCode as string) ?? '',
    methodName: (p.methodName as string) ?? '',
    methodGroup: (p.methodGroup as string) ?? undefined,
    providerChannel: (p.providerChannel as string) ?? undefined,
    methodFeeAmount: Number(p.methodFeeAmount ?? 0),
    status: p.status as PaymentStatus,
    snapToken: (p.snapToken as string) ?? undefined,
    providerTransactionId: (p.providerTransactionId as string) ?? undefined,
    paymentUrl: (p.paymentUrl as string) ?? undefined,
    requestPayload: p.requestPayload as Record<string, unknown> | undefined,
    callbackPayload: p.callbackPayload as Record<string, unknown> | undefined,
    paidAt: (p.paidAt as Date) ?? undefined,
    expiredAt: (p.expiredAt as Date) ?? undefined,
    failedAt: (p.failedAt as Date) ?? undefined,
    failureReason: (p.failureReason as string) ?? undefined,
    createdAt: p.createdAt as Date,
    updatedAt: p.updatedAt as Date,
  };
}

// ============================================================
// Payment Group Inference
// Infers methodGroup from Midtrans payment_type
// ============================================================

const MIDTRANS_METHOD_NAME_MAP: Record<string, string> = {
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
  bca_klikpay: 'BCA KlikPay',
  bca_klikbca: 'KlikBCA',
  cimb_clicks: 'CIMB Clicks',
  danamon_online: 'Danamon Online',
  uob_ezpay: 'UOB EZ Pay',
};

export function inferPaymentGroup(paymentType: string): string {
  const pt = paymentType.toLowerCase();
  if (pt === 'qris') return 'QRIS';
  if (pt === 'credit_card') return 'CARD';
  if (pt === 'bank_transfer' || pt.endsWith('_va')) return 'VIRTUAL_ACCOUNT';
  if (['gopay', 'shopeepay', 'dana', 'ovo', 'paypay', 'astrapay'].includes(pt)) return 'EWALLET';
  if (['alfamart', 'indomaret', 'cstore'].includes(pt)) return 'CSTORE';
  return 'OTHER';
}

export function getMidtransMethodName(paymentType: string): string {
  return MIDTRANS_METHOD_NAME_MAP[paymentType.toLowerCase()] ?? paymentType;
}

// ============================================================
// Payment Creation Input
// ============================================================

export interface CreatePaymentInput {
  orderId: string;
  // methodCode: Optional - if provided, DOKU shows only that method; otherwise shows all
  // When methodCode is not provided, the payment method will be saved from DOKU webhook
  methodCode?: string;
  paymentMethod?: string; // DOKU channel code
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  expiryMinutes?: number;
}

// ============================================================
// Create/Update Payment for DOKU Checkout
// The Payment record is already created in createOrder().
// This function updates it with DOKU-specific info and creates DOKU Checkout session.
// ============================================================

export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  console.log('[PAYMENT SERVICE] Processing payment for order:', input.orderId);

  const existingPayment = await prisma.payment.findUnique({
    where: { orderId: input.orderId },
  });

  if (!existingPayment) {
    throw new Error(`Payment record not found for order: ${input.orderId}. Please create the order first.`);
  }

  console.log('[PAYMENT SERVICE] Payment found:', existingPayment.id);

  return convertToPayment(existingPayment as unknown as Record<string, unknown>);
}


// ============================================================
// Payment Status Update (from webhook)
// ============================================================

export async function updatePaymentFromWebhook(
  paymentId: string,
  status: PaymentStatus,
  transactionId?: string,
  callbackPayload?: Record<string, unknown>,
  providerChannel?: string
): Promise<Payment> {
  console.log('[PAYMENT SERVICE] Updating payment from webhook:', { paymentId, status, transactionId, providerChannel });

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error(`Payment not found: ${paymentId}`);
  }

  const order = await prisma.order.findUnique({
    where: { id: payment.orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error(`Order not found for payment: ${paymentId}`);
  }

  const methodCode = providerChannel ?? undefined;
  const methodName = providerChannel ? getMidtransMethodName(providerChannel) : undefined;
  const methodGroup = providerChannel ? inferPaymentGroup(providerChannel) : undefined;

  const updateData: Prisma.PaymentUpdateInput = {
    status,
    callbackPayload: callbackPayload as Prisma.InputJsonValue | undefined,
    ...(methodCode && { methodCode }),
    ...(methodName && { methodName }),
    ...(methodGroup && { methodGroup }),
    ...(providerChannel && { providerChannel }),
  };

  if (transactionId) updateData.providerTransactionId = transactionId;

  switch (status) {
    case 'PAID':
      updateData.paidAt = new Date();
      break;
    case 'FAILED':
      updateData.failedAt = new Date();
      break;
    case 'EXPIRED':
      updateData.expiredAt = new Date();
      break;
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: paymentId },
    data: updateData,
  });

  console.log('[PAYMENT SERVICE] Payment status updated:', status);

  // If PAID, update order and reduce stock
  if (status === 'PAID' && order.status === 'PENDING') {
    console.log('[PAYMENT SERVICE] Processing PAID payment for order:', order.id);

    // Update order status from PENDING to SEARCHING
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'SEARCHING',
        paymentStatus: 'PAID',
        paidAt: new Date(),
      },
    });

    // Reduce barista stock for each item
    await reduceBaristaStockForOrder(order.id);

    // Find baristas for assignment
    const candidates = await findNearestBaristasWithStock({
      customerLatitude: order.deliveryLatitude ?? 0,
      customerLongitude: order.deliveryLongitude ?? 0,
      items: order.items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
      radiusKm: 5,
      limit: 3,
    });

    // Broadcast to baristas via RTDB
    try {
      await broadcastToRTDB({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerLatitude: order.deliveryLatitude ?? 0,
        customerLongitude: order.deliveryLongitude ?? 0,
        items: order.items.map((it) => ({
          productName: it.productName,
          quantity: it.quantity,
        })),
        subtotal: Number(order.subtotal),
        total: Number(order.total),
        baristaIds: candidates.map((c) => c.baristaId),
        expiresInMs: 30000,
      });
      console.log('[PAYMENT SERVICE] Order broadcasted to baristas');
    } catch (err) {
      console.error('[PAYMENT SERVICE] Failed to broadcast order:', err);
    }
  }

  return convertToPayment(updatedPayment as unknown as Record<string, unknown>);
}

// ============================================================
// Mark Payment as Failed
// ============================================================

export async function markPaymentFailed(
  paymentId: string,
  reason: string
): Promise<Payment> {
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'FAILED',
      failedAt: new Date(),
      failureReason: reason,
    },
  });

  console.log('[PAYMENT SERVICE] Payment marked as failed:', paymentId, reason);

  return convertToPayment(payment as unknown as Record<string, unknown>);
}

// ============================================================
// Stock Management
// ============================================================

async function reduceBaristaStockForOrder(orderId: string): Promise<void> {
  // IDEMPOTENCY CHECK: Check if stock was already reduced for this order
  const existingSale = await prisma.baristaStockMovement.findFirst({
    where: {
      orderId: orderId,
      type: 'SOLD',
    },
  });

  if (existingSale) {
    console.log(`[PAYMENT SERVICE] Stock already reduced for order ${orderId}, skipping`);
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order?.baristaId) {
    console.warn(`[PAYMENT SERVICE] Order ${orderId} has no barista assigned, skipping stock reduction`);
    return;
  }

  console.log(`[PAYMENT SERVICE] Reducing barista stock for order ${orderId}`);

  // Group items by product
  const productQuantities = new Map<string, number>();
  for (const item of order.items) {
    const current = productQuantities.get(item.productId) || 0;
    productQuantities.set(item.productId, current + item.quantity);
  }

  // Reduce stock for each product
  for (const [productId, quantity] of productQuantities) {
    const baristaStock = await prisma.baristaStock.findFirst({
      where: {
        baristaId: order.baristaId!,
        productId,
      },
    });

    if (baristaStock) {
      const newQuantity = Math.max(0, baristaStock.quantity - quantity);

      await prisma.baristaStock.update({
        where: { id: baristaStock.id },
        data: { quantity: newQuantity },
      });

      await prisma.baristaStockMovement.create({
        data: {
          baristaId: order.baristaId!,
          productId,
          type: 'SOLD',
          quantity: -quantity,
          balanceAfter: newQuantity,
          orderId: order.id,
          note: 'Payment confirmed via Midtrans',
        },
      });

      console.log(`[PAYMENT SERVICE] Reduced stock for product ${productId}: ${baristaStock.quantity} -> ${newQuantity}`);
    } else {
      console.warn(`[PAYMENT SERVICE] No barista stock for product ${productId}`);
    }
  }
}

// ============================================================
// Get Payment
// ============================================================

export async function getPayment(paymentId: string): Promise<Payment | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) return null;

  return convertToPayment(payment as unknown as Record<string, unknown>);
}

export async function getPaymentByOrder(orderId: string): Promise<Payment | null> {
  const payment = await prisma.payment.findUnique({
    where: { orderId },
  });

  if (!payment) return null;

  return convertToPayment(payment as unknown as Record<string, unknown>);
}

// ============================================================
// Get Available Payment Methods (for customer)
// ============================================================

export async function getAvailablePaymentMethods(forCustomer: boolean = true) {
  const { getActivePaymentMethods } = await import('./providers/registry');
  return getActivePaymentMethods(forCustomer);
}
