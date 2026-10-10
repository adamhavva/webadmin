// ============================================================
// Payment Module - Public API
// ============================================================

// Services
export {
  createPayment,
  getPayment,
  getPaymentByOrder,
  updatePaymentFromMidtrans,
  updatePaymentFromWebhook,
  getAvailablePaymentMethods,
  type CreatePaymentInput,
  type Payment,
  type PaymentStatus,
} from './payment.service';

// Midtrans service
export {
  createSnapToken,
  verifyMidtransSignature,
  checkTransactionStatus,
  getMidtransConfig,
  type MidtransConfig,
  type SnapTokenRequest,
  type SnapTokenResult,
} from './midtrans.service';

// Validators
export {
  createPaymentSchema,
  midtransNotificationSchema,
  paymentResponseSchema,
  MIDTRANS_STATUS_MAP,
  type MidtransNotification,
} from './payment.validator';

// Pricing
export {
  calculateFee,
  getMethodFee,
  calculateTotalWithFee,
  formatCurrency,
  type FeeCalculation,
  type FeeBreakdown,
} from './payment.pricing';

// Registry - payment methods from Midtrans API
export { getActivePaymentMethods, clearMethodCache } from './providers/registry';
export type { PaymentMethodOption, PaymentGroupOption } from './providers/types';
