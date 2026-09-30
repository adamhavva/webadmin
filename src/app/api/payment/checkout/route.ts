import { handle, created, ok } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { createPayment, updatePaymentFromDOKUResponse } from '@/modules/payment/payment.service';
import { createDOKUCheckout } from '@/modules/payment/doku-checkout.service';
import { createPaymentSchema } from '@/modules/payment/payment.validator';
import { ApiError } from '@/lib/api-error';

export const POST = handle(async (req: Request) => {
  const body = await req.json();
  const parseResult = createPaymentSchema.safeParse(body);

  if (!parseResult.success) {
    throw ApiError.validation(parseResult.error.flatten());
  }

  const input = parseResult.data;

  // Get order to retrieve amount
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      total: true,
      paymentStatus: true,
      customerName: true,
    },
  });

  if (!order) {
    throw ApiError.notFound('Order tidak ditemukan');
  }

  // Verify order is in PENDING status and not already paid
  if (order.paymentStatus !== 'PENDING') {
    throw ApiError.badRequest(`Order sudah diproses (status: ${order.paymentStatus})`);
  }

  // Process/create payment record
  const payment = await createPayment(input);

  // Call DOKU Checkout API
  // DON'T pass paymentMethod - let DOKU show ALL payment methods in their popup
  const dokuResult = await createDOKUCheckout({
    orderId: input.orderId,
    amount: Number(order.total),
    customerName: input.customerName || order.customerName || 'Customer',
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    // paymentMethod removed - DOKU popup handles payment method selection
    expiryMinutes: input.expiryMinutes || 60,
  });

  if (!dokuResult.success || !dokuResult.paymentUrl) {
    throw ApiError.internal(dokuResult.error || 'Gagal membuat sesi pembayaran DOKU');
  }

  // Update payment record with DOKU response
  await updatePaymentFromDOKUResponse(payment.id, {
    invoiceNumber: dokuResult.invoiceNumber,
    paymentUrl: dokuResult.paymentUrl,
    expiryTime: dokuResult.expiryTime,
  });

  return created({
    paymentId: payment.id,
    orderId: input.orderId,
    dokuPaymentUrl: dokuResult.paymentUrl,
    dokuInvoiceNumber: dokuResult.invoiceNumber,
    expiryTime: dokuResult.expiryTime,
  });
});

export const GET = handle(async (req: Request) => {
  const url = new URL(req.url);
  const orderId = url.searchParams.get('orderId');

  if (!orderId) {
    throw ApiError.badRequest('orderId diperlukan');
  }

  const payment = await prisma.payment.findUnique({
    where: { orderId },
  });

  if (!payment) {
    throw ApiError.notFound('Payment tidak ditemukan');
  }

  return ok({
    id: payment.id,
    orderId: payment.orderId,
    status: payment.status,
    dokuInvoiceNumber: payment.dokuInvoiceNumber,
    dokuPaymentUrl: payment.dokuPaymentUrl,
    amount: Number(payment.amount),
    methodCode: payment.methodCode,
    methodName: payment.methodName,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
  });
});
