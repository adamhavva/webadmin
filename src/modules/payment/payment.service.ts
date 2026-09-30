// ============================================================
// Payment Service - Core payment logic
// All online payments go through Midtrans Snap
// ============================================================

import { prisma } from '@/lib/db';
import type { Prisma } from '@/prisma/generated/client';
import { assignOrderToBaristas } from '@/modules/order/order.service';
import { broadcastOrderToBaristas as broadcastToRTDB, findNearestBaristasWithStock } from '@/modules/order/order.assignment.service';

// ============================================================
// Types
// ============================================================

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  methodCode?: string;
  methodName?: string;
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
// Converts Prisma Payment model to Payment interface
// until then we map old names → new interface field names
// ============================================================

function convertToPayment(p: {
  id: string;
  orderId: string;
  amount: unknown;
  currency: string;
  methodCode: string | null;
  methodName: string | null;
  methodGroup: string | null;
  providerChannel: string | null;
  methodFeeAmount: unknown;
  status: string;
  snapToken: string | null;
  providerTransactionId: string | null;
  paymentUrl: string | null;
  requestPayload: unknown;
  callbackPayload: unknown;
  paidAt: Date | null;
  expiredAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Payment {
  return {
    id: p.id,
    orderId: p.orderId,
    amount: Number(p.amount),
    currency: p.currency,
    methodCode: p.methodCode ?? undefined,
    methodName: p.methodName ?? undefined,
    methodGroup: p.methodGroup ?? undefined,
    providerChannel: p.providerChannel ?? undefined,
    methodFeeAmount: Number(p.methodFeeAmount),
    status: p.status as PaymentStatus,
    snapToken: p.snapToken ?? undefined,
    providerTransactionId: p.providerTransactionId ?? undefined,
    paymentUrl: p.paymentUrl ?? undefined,
    requestPayload: p.requestPayload as Record<string, unknown> | undefined,
    callbackPayload: p.callbackPayload as Record<string, unknown> | undefined,
    paidAt: p.paidAt ?? undefined,
    expiredAt: p.expiredAt ?? undefined,
    failedAt: p.failedAt ?? undefined,
    failureReason: p.failureReason ?? undefined,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ============================================================
// Payment Creation Input
// ============================================================

export interface CreatePaymentInput {
  orderId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  expiryMinutes?: number;
}

// ============================================================
// Create/Update Payment for Midtrans Snap
// The Payment record is already created in createOrder().
// This function finds it and returns it for Snap token creation.
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

  return convertToPayment(existingPayment);
}

// ============================================================
// Update Payment from Midtrans Response
// Called after Midtrans Snap returns token + redirect URL
// ============================================================

export async function updatePaymentFromMidtrans(
  paymentId: string,
  midtransResponse: {
    snapToken?: string;
    paymentUrl?: string;
    expiryTime?: string;
    rawResponse?: Record<string, unknown>;
  }
): Promise<Payment> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error(`Payment not found: ${paymentId}`);
  }

  const updateData: Prisma.PaymentUpdateInput = {
    // Using old Prisma field names until schema migration renames them
    snapToken: midtransResponse.snapToken,
    paymentUrl: midtransResponse.paymentUrl,
    requestPayload: midtransResponse.rawResponse as Prisma.InputJsonValue | undefined,
  };

  if (midtransResponse.expiryTime) {
    updateData.expiredAt = new Date(midtransResponse.expiryTime);
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: updateData,
  });

  // Also update order with payment URL (using old Prisma field names until schema migration)
  await prisma.order.update({
    where: { id: payment.orderId },
    data: {
      snapToken: midtransResponse.snapToken,
      paymentUrl: midtransResponse.paymentUrl,
      paymentExpiredAt: midtransResponse.expiryTime ? new Date(midtransResponse.expiryTime) : undefined,
    },
  });

  console.log('[PAYMENT SERVICE] Payment updated with Midtrans response:', paymentId);

  return convertToPayment(updated);
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

  const FINAL_STATUSES = ['PAID', 'FAILED', 'EXPIRED', 'REFUNDED'];

  // Atomic status transition: only update if not already in a final state.
  // This prevents double-processing when Midtrans fires duplicate webhooks.
  const updateData: Prisma.PaymentUpdateInput = {
    status,
    callbackPayload: callbackPayload as Prisma.InputJsonValue | undefined,
  };

  if (transactionId) updateData.providerTransactionId = transactionId;
  if (providerChannel) updateData.providerChannel = providerChannel;

  switch (status) {
    case 'PAID':    updateData.paidAt = new Date(); break;
    case 'FAILED':  updateData.failedAt = new Date(); break;
    case 'EXPIRED': updateData.expiredAt = new Date(); break;
  }

  const result = await prisma.payment.updateMany({
    where: { id: paymentId, status: { notIn: FINAL_STATUSES } },
    data: updateData,
  });

  if (result.count === 0) {
    // Already in final state — idempotent skip
    console.log('[PAYMENT SERVICE] Payment already finalized, skipping:', paymentId);
    const existing = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!existing) throw new Error(`Payment not found: ${paymentId}`);
    return convertToPayment(existing);
  }

  console.log('[PAYMENT SERVICE] Payment status updated:', status);

  const updatedPayment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!updatedPayment) throw new Error(`Payment not found after update: ${paymentId}`);

  if (status === 'PAID') {
    const order = await prisma.order.findUnique({
      where: { id: updatedPayment.orderId },
      include: { items: true },
    });

    if (!order) throw new Error(`Order not found for payment: ${paymentId}`);

    if (order.status === 'PENDING') {
      console.log('[PAYMENT SERVICE] Processing PAID payment for order:', order.id);

      // Atomic order status transition — guard against duplicate webhooks
      const orderTransition = await prisma.order.updateMany({
        where: { id: order.id, status: 'PENDING' },
        data: { status: 'SEARCHING', paymentStatus: 'PAID', paidAt: new Date() },
      });

      if (orderTransition.count === 0) {
        console.log('[PAYMENT SERVICE] Order already left PENDING state, skipping stock reduction');
        return convertToPayment(updatedPayment);
      }

      await reduceBaristaStockForOrder(order.id, order.items);

      const candidates = await findNearestBaristasWithStock({
        customerLatitude: order.deliveryLatitude ?? 0,
        customerLongitude: order.deliveryLongitude ?? 0,
        items: order.items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
        radiusKm: 5,
        limit: 3,
      });

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
  }

  return convertToPayment(updatedPayment);
}

// ============================================================
// Mark Payment as Failed
// ============================================================

export async function markPaymentFailed(paymentId: string, reason: string): Promise<Payment> {
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'FAILED',
      failedAt: new Date(),
      failureReason: reason,
    },
  });

  console.log('[PAYMENT SERVICE] Payment marked as failed:', paymentId, reason);

  return convertToPayment(payment);
}

// ============================================================
// Stock Management
// ============================================================

async function reduceBaristaStockForOrder(
  orderId: string,
  orderItems?: Array<{ productId: string; quantity: number; productName: string }>
): Promise<void> {
  // Fetch order once if items not passed in
  let baristaId: string | null | undefined;
  let items: Array<{ productId: string; quantity: number; productName: string }>;

  if (orderItems) {
    items = orderItems;
    const orderRecord = await prisma.order.findUnique({ where: { id: orderId }, select: { baristaId: true } });
    baristaId = orderRecord?.baristaId;
  } else {
    const orderRecord = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    baristaId = orderRecord?.baristaId;
    items = orderRecord?.items ?? [];
  }

  if (!baristaId) {
    console.warn(`[PAYMENT SERVICE] Order ${orderId} has no barista assigned, skipping stock reduction`);
    return;
  }

  // Aggregate quantities per product
  const productQuantities = new Map<string, number>();
  for (const item of items) {
    productQuantities.set(item.productId, (productQuantities.get(item.productId) ?? 0) + item.quantity);
  }

  console.log(`[PAYMENT SERVICE] Reducing barista stock for order ${orderId}`);

  // Each product reduced in its own transaction with an atomic conditional update.
  // updateMany WHERE quantity >= needed ensures stock never goes negative and
  // prevents race conditions — if two requests race, only one gets count=1.
  for (const [productId, quantity] of productQuantities) {
    await prisma.$transaction(async (tx) => {
      // Guard: skip if SOLD movement already exists (idempotency for this product)
      const existingMovement = await tx.baristaStockMovement.findFirst({
        where: { orderId, productId, type: 'SOLD' },
      });
      if (existingMovement) {
        console.log(`[PAYMENT SERVICE] Stock movement already exists for product ${productId}, skipping`);
        return;
      }

      const stock = await tx.baristaStock.findFirst({
        where: { baristaId, productId },
      });

      if (!stock) {
        console.warn(`[PAYMENT SERVICE] No barista stock for product ${productId}`);
        return;
      }

      if (stock.quantity < quantity) {
        console.error(`[PAYMENT SERVICE] Insufficient stock for product ${productId}: have ${stock.quantity}, need ${quantity}`);
        // Still record movement as attempted — decrement to 0
      }

      const actualDeducted = Math.min(stock.quantity, quantity);
      const newQuantity = stock.quantity - actualDeducted;

      // Atomic: only succeeds if stock hasn't changed since we read it
      const updated = await tx.baristaStock.updateMany({
        where: { id: stock.id, quantity: stock.quantity },
        data: { quantity: newQuantity },
      });

      if (updated.count === 0) {
        // Another concurrent request already modified this stock row
        throw new Error(`Race condition on stock for product ${productId}, will retry`);
      }

      await tx.baristaStockMovement.create({
        data: {
          baristaId,
          productId,
          type: 'SOLD',
          quantity: -actualDeducted,
          balanceAfter: newQuantity,
          orderId,
          note: `Payment confirmed via Midtrans${actualDeducted < quantity ? ` (partial: had ${stock.quantity}, needed ${quantity})` : ''}`,
        },
      });

      console.log(`[PAYMENT SERVICE] Reduced stock for product ${productId}: ${stock.quantity} -> ${newQuantity}`);
    });
  }
}

// ============================================================
// Get Payment
// ============================================================

export async function getPayment(paymentId: string): Promise<Payment | null> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return null;
  return convertToPayment(payment);
}

export async function getPaymentByOrder(orderId: string): Promise<Payment | null> {
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment) return null;
  return convertToPayment(payment);
}

// ============================================================
// Get Available Payment Methods (for customer)
// ============================================================

export async function getAvailablePaymentMethods(forCustomer: boolean = true) {
  const { getActivePaymentMethods } = await import('./providers/registry');
  return getActivePaymentMethods(forCustomer);
}
