import { handle, ok } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { getAvailablePaymentMethods } from '@/modules/payment/payment.service';

/**
 * GET /api/payment?orderId=xxx
 * Query payment status or get available methods
 */
export const GET = handle(async (req) => {
  const url = new URL(req.url);
  const orderId = url.searchParams.get('orderId');

  // If orderId provided, check payment status from database
  if (orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      return ok({ error: 'Order not found' });
    }

    return ok({
      orderId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethodName,
      paidAt: order.payment?.paidAt,
      amount: order.total,
    });
  }

  // Otherwise, return available payment methods
  const methods = await getAvailablePaymentMethods(true);
  return ok({ methods });
});
