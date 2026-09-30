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

// Providers - re-export only what's needed
export type {
  PaymentProviderAdapter,
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentNotification,
} from './providers/types';

export { getProviderAdapter, getActivePaymentMethods, clearMethodCache } from './providers/registry';
