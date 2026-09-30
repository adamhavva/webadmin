// ============================================================
// Payment Provider Types
// ============================================================

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  methodCode?: string;
  methodName?: string;
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
// Midtrans Notification Types
// ============================================================

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
