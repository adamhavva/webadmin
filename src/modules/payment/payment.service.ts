// ============================================================
// Payment Service - Core payment logic
// All payments go through DOKU Checkout (no CASH)
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
  providerId: string;
  providerCode: string;
  methodCode: string;
  methodName: string;
  methodGroup?: string;
  dokuChannelCode?: string;
  methodFeeAmount: number;
  status: PaymentStatus;
  dokuInvoiceNumber?: string;
  dokuTransactionId?: string;
  dokuPaymentUrl?: string;
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

function convertToPayment(p: {
  id: string;
  orderId: string;
  amount: unknown;
  currency: string;
  providerId: string;
  providerCode: string;
  methodCode: string;
  methodName: string;
  methodGroup: string | null;
  dokuChannelCode: string | null;
  methodFeeAmount: unknown;
  status: string;
  dokuInvoiceNumber: string | null;
  dokuTransactionId: string | null;
  dokuPaymentUrl: string | null;
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
    providerId: p.providerId,
    providerCode: p.providerCode,
    methodCode: p.methodCode,
    methodName: p.methodName,
    methodGroup: p.methodGroup ?? undefined,
    dokuChannelCode: p.dokuChannelCode ?? undefined,
    methodFeeAmount: Number(p.methodFeeAmount),
    status: p.status as PaymentStatus,
    dokuInvoiceNumber: p.dokuInvoiceNumber ?? undefined,
    dokuTransactionId: p.dokuTransactionId ?? undefined,
    dokuPaymentUrl: p.dokuPaymentUrl ?? undefined,
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

  // Find existing payment for this order (created by createOrder)
  const existingPayment = await prisma.payment.findUnique({
    where: { orderId: input.orderId },
  });

  if (!existingPayment) {
    throw new Error(`Payment record not found for order: ${input.orderId}. Please create the order first.`);
  }

  // Update payment method info if methodCode is provided
  // If methodCode is not provided, DOKU will show all payment methods
  // and the actual method will be saved when DOKU sends webhook
  let methodConfig = null;
  if (input.methodCode) {
    methodConfig = await prisma.paymentMethodConfig.findUnique({
      where: { code: input.methodCode },
      include: { provider: true },
    });

    if (!methodConfig) {
      throw new Error(`Payment method not found: ${input.methodCode}`);
    }
  }

  // Update payment with DOKU channel code (optional)
  const paymentUpdateData: Prisma.PaymentUpdateInput = {
    dokuChannelCode: input.paymentMethod || null,
  };

  await prisma.payment.update({
    where: { id: existingPayment.id },
    data: paymentUpdateData,
  });

  // Update order with payment method snapshot (if methodCode provided)
  const orderUpdateData: Prisma.OrderUpdateInput = {
    dokuPaymentMethod: input.paymentMethod,
  };

  if (methodConfig) {
    orderUpdateData.paymentMethodCode = input.methodCode;
    orderUpdateData.paymentMethodName = methodConfig.name;
    orderUpdateData.paymentMethodGroup = methodConfig.groupName ?? methodConfig.groupCode;
    orderUpdateData.paymentFeeAmount = existingPayment.methodFeeAmount;
  }

  await prisma.order.update({
    where: { id: input.orderId },
    data: orderUpdateData,
  });

  console.log('[PAYMENT SERVICE] Payment found:', existingPayment.id);

  return convertToPayment(existingPayment);
}

// ============================================================
// Update Payment from DOKU Response
// Called after DOKU Checkout returns payment URL
// ============================================================

export async function updatePaymentFromDOKUResponse(
  paymentId: string,
  dokuResponse: {
    invoiceNumber?: string;
    transactionId?: string;
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
    dokuInvoiceNumber: dokuResponse.invoiceNumber,
    dokuTransactionId: dokuResponse.transactionId,
    dokuPaymentUrl: dokuResponse.paymentUrl,
    requestPayload: dokuResponse.rawResponse as Prisma.InputJsonValue | undefined,
  };

  if (dokuResponse.expiryTime) {
    updateData.expiredAt = new Date(dokuResponse.expiryTime);
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: updateData,
  });

  // Also update order with DOKU info
  await prisma.order.update({
    where: { id: payment.orderId },
    data: {
      dokuInvoiceNumber: dokuResponse.invoiceNumber,
      dokuPaymentUrl: dokuResponse.paymentUrl,
      dokuPaymentMethod: updated.dokuChannelCode,
      dokuExpiredAt: dokuResponse.expiryTime ? new Date(dokuResponse.expiryTime) : undefined,
    },
  });

  console.log('[PAYMENT SERVICE] Payment updated with DOKU response:', paymentId);

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
  dokuPaymentMethod?: string
): Promise<Payment> {
  console.log('[PAYMENT SERVICE] Updating payment from webhook:', { paymentId, status, transactionId, dokuPaymentMethod });

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error(`Payment not found: ${paymentId}`);
  }

  // Get order with items
  const order = await prisma.order.findUnique({
    where: { id: payment.orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error(`Order not found for payment: ${paymentId}`);
  }

  // Build update data
  const updateData: Prisma.PaymentUpdateInput = {
    status,
    callbackPayload: callbackPayload as Prisma.InputJsonValue | undefined,
  };

  if (transactionId) {
    updateData.dokuTransactionId = transactionId;
  }

  // Save the payment channel used (extracted from DOKU webhook, e.g. "VIRTUAL_ACCOUNT_BCA")
  if (dokuPaymentMethod) {
    updateData.dokuChannelCode = dokuPaymentMethod;
  }

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

  return convertToPayment(updatedPayment);
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

  return convertToPayment(payment);
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
          note: 'Payment confirmed via DOKU',
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

  return convertToPayment(payment);
}

export async function getPaymentByOrder(orderId: string): Promise<Payment | null> {
  const payment = await prisma.payment.findUnique({
    where: { orderId },
  });

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
