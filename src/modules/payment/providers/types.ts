// ============================================================
// Payment Provider Types
// ============================================================

export interface PaymentProviderConfig {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  isProduction: boolean;
  webhookSecret?: string;
}

export interface PaymentMethodConfig {
  id: string;
  code: string;
  name: string;
  providerId: string;
  providerChannel?: string;
  groupCode?: string;
  groupName?: string;
  feeType: 'NONE' | 'PERCENTAGE' | 'NOMINAL';
  feeValue: number;
  icon?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  availableForCustomer: boolean;
  availableForAdmin: boolean;
}

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
// Provider Adapter Interface
// ============================================================

export interface CreatePaymentRequest {
  orderId: string;
  orderRef: string; // Partner reference number
  amount: number;
  currency?: string;
  methodCode: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  expiryMinutes?: number;
}

export interface CreatePaymentResponse {
  success: boolean;
  providerCode: string;
  methodCode: string;

  // Snap / redirect
  snapToken?: string;
  paymentUrl?: string;

  // VA response
  virtualAccountNo?: string;
  virtualAccountName?: string;

  // QRIS response
  qrContent?: string;

  // e-Wallet response
  webRedirectUrl?: string;

  // Common
  transactionId?: string;
  expiryTime?: string;
  rawResponse?: Record<string, unknown>;
}

export interface PaymentNotification {
  orderId: string;
  transactionStatus: string;
  transactionId?: string;
  statusCode?: string;
  grossAmount?: string;
  fraudStatus?: string;
  paymentType?: string;
  signatureKey?: string;
  rawPayload?: Record<string, unknown>;
}

export interface PaymentProviderAdapter {
  readonly providerCode: string;

  createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse>;

  handleNotification(notification: PaymentNotification): Promise<{
    paymentId: string;
    status: PaymentStatus;
    transactionId?: string;
  }>;

  verifyWebhookSignature(signature: string, payload: Record<string, unknown>): boolean;
}

// ============================================================
// Registry
// ============================================================

export interface PaymentMethodOption {
  code: string;
  name: string;
  groupCode: string;
  groupName: string;
  icon?: string;
  feeLabel?: string;
}

export interface PaymentGroupOption {
  code: string;
  name: string;
  methods: PaymentMethodOption[];
}
