import { handleAuth, created, ok } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { createPayment } from '@/modules/payment/payment.service';
import { createSnapToken } from '@/modules/payment/midtrans.service';
import { createPaymentSchema } from '@/modules/payment/payment.validator';
import { ApiError } from '@/lib/api-error';
import type { AuthCtx } from '@/lib/api-response';

export const POST = handleAuth(
  async (req: Request, ctx: AuthCtx) => {
    const body = await req.json();
    const parseResult = createPaymentSchema.safeParse(body);
    if (!parseResult.success) throw ApiError.validation(parseResult.error.flatten());

    const input = parseResult.data;

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

    await prisma.payment.update({
      where: { id: payment.id },
      data: { methodCode: 'MIDTRANS_SNAP' },
    });

    await prisma.order.update({
      where: { id: input.orderId },
      data: {
        paymentMethodCode: 'MIDTRANS_SNAP',
        paymentMethodName: 'Midtrans Snap',
      },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        snapToken: snapResult.token,
        paymentUrl: snapResult.redirectUrl,
      },
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
