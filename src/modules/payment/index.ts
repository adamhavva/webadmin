// ============================================================
// Payment Module - Public API
// ============================================================

// Services
export {
  createPayment,
  getPayment,
  getPaymentByOrder,
  updatePaymentFromWebhook,
  getAvailablePaymentMethods,
  type CreatePaymentInput,
} from './payment.service';

// Validators
export {
  createPaymentSchema,
  dokuNotificationSchema,
  paymentResponseSchema,
  DOKU_STATUS_MAP,
  type DokuNotification,
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
  PaymentProviderConfig,
  PaymentMethodConfig,
  PaymentStatus,
  Payment,
  PaymentProviderAdapter,
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentNotification,
} from './providers/types';

export { getProviderAdapter, getActivePaymentMethods, clearMethodCache } from './providers/registry';
