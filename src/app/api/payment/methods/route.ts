// ============================================================
// Payment Methods API
// GET /api/payment/methods
// ============================================================

import { handle, ok } from '@/lib/api-response';
import { getAvailablePaymentMethods } from '@/modules/payment/payment.service';

// ============================================================
// GET - List Available Payment Methods
// ============================================================

export const GET = handle(async () => {
  const methods = await getAvailablePaymentMethods(true);
  return ok(methods);
});
