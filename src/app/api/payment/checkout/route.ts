import { handleAuth, created, ok } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { createPayment, updatePaymentFromDOKUResponse } from '@/modules/payment/payment.service';
import { createDOKUCheckout } from '@/modules/payment/doku-checkout.service';
import { createPaymentSchema } from '@/modules/payment/payment.validator';
import { ApiError } from '@/lib/api-error';
import type { AuthCtx } from '@/lib/api-response';

<<<<<<< HEAD
export const POST = handleAuth(
  async (req: Request, ctx: AuthCtx) => {
    const body = await req.json();
    const parseResult = createPaymentSchema.safeParse(body);
    if (!parseResult.success) throw ApiError.validation(parseResult.error.flatten());
=======
export const POST = handle(async (req: Request) => {
  const body = await req.json();
  const parseResult = createPaymentSchema.safeParse(body);

  if (!parseResult.success) {
    throw ApiError.validation(parseResult.error.flatten());
  }
>>>>>>> 6bf28fd206c6a63fe65027db6b66dfedc5d270bd

    const input = parseResult.data;

<<<<<<< HEAD
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      select: {
        id: true,
        total: true,
        paymentStatus: true,
        customerName: true,
        customerId: true,
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPrice: true,
          },
        },
      },
    });

    if (!order) throw ApiError.notFound('Order tidak ditemukan');

    // Verify order belongs to the authenticated customer (for CUSTOMER role)
    if (ctx.user.role === 'CUSTOMER' && order.customerId !== ctx.user.id) {
      throw ApiError.forbidden('Anda tidak memiliki akses ke order ini');
    }

    if (order.paymentStatus !== 'PENDING') {
      throw ApiError.badRequest(`Order sudah diproses (status: ${order.paymentStatus})`);
    }

    const payment = await createPayment(input);

    const snapResult = await createSnapToken({
      orderId: input.orderId,
      grossAmount: Number(order.total),
      customerName: input.customerName || order.customerName || 'Customer',
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      items: order.items.map(item => ({
        id: item.productName,
        name: item.productName,
        price: Number(item.unitPrice),
        quantity: item.quantity,
      })),
      expiryDuration: input.expiryMinutes ? Math.ceil(input.expiryMinutes / 60) : 24,
      expiryUnit: 'hours',
    });

    if (!snapResult.success || !snapResult.redirectUrl) {
      throw ApiError.internal(snapResult.error || 'Gagal membuat sesi pembayaran Midtrans');
    }

    // Set initial methodCode placeholder — webhook will update with real payment_type later
    await prisma.payment.update({
      where: { id: payment.id },
      data: { methodCode: 'MIDTRANS_SNAP' },
    });

    // Also set on order for display
    await prisma.order.update({
      where: { id: input.orderId },
      data: {
        paymentMethodCode: 'MIDTRANS_SNAP',
        paymentMethodName: 'Midtrans Snap',
      },
    });

    await updatePaymentFromMidtrans(payment.id, {
      snapToken: snapResult.token,
      paymentUrl: snapResult.redirectUrl,
    });

    return created({
      paymentId: payment.id,
      orderId: input.orderId,
      snapToken: snapResult.token,
      paymentUrl: snapResult.redirectUrl,
      redirectUrl: snapResult.redirectUrl,
    });
  },
  { roles: ['ADMIN', 'CUSTOMER'] }
);

export const GET = handleAuth(
  async (req: Request, ctx: AuthCtx) => {
    const url = new URL(req.url);
    const orderId = url.searchParams.get('orderId');
    if (!orderId) throw ApiError.badRequest('orderId diperlukan');

    const payment = await prisma.payment.findUnique({ where: { orderId } });
    if (!payment) throw ApiError.notFound('Payment tidak ditemukan');

    // Verify customer owns this payment (for CUSTOMER role)
    if (ctx.user.role === 'CUSTOMER') {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { customerId: true },
      });
      if (!order || order.customerId !== ctx.user.id) {
        throw ApiError.forbidden('Anda tidak memiliki akses ke payment ini');
      }
    }

    return ok({
      id: payment.id,
      orderId: payment.orderId,
      status: payment.status,
      snapToken: payment.snapToken,
      paymentUrl: payment.paymentUrl,
      amount: Number(payment.amount),
      methodCode: payment.methodCode,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    });
  },
  { roles: ['ADMIN', 'CUSTOMER'] }
);
=======
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
>>>>>>> 6bf28fd206c6a63fe65027db6b66dfedc5d270bd
