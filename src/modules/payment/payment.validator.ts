// ============================================================
// Payment Validators (Zod Schemas)
// ============================================================

import { z } from 'zod';

// ============================================================
// Payment Creation
// ============================================================

export const createPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  // methodCode: REMOVED - DOKU handles payment method selection in their popup
  // paymentMethod: optional - if provided, DOKU shows only that method; otherwise shows all
  paymentMethod: z.string().optional(),
  customerName: z.string().min(1, 'Customer name is required').max(255),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z
    .string()
    .regex(/^(\+62|62|0)/, 'Invalid phone format')
    .optional()
    .transform(v => v === '' ? undefined : v),
  expiryMinutes: z.number().int().positive().max(1440).optional(), // Max 24 hours
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

// ============================================================
// Webhook Notification Schemas
// DOKU Checkout (Non-SNAP) Format:
// {
//   "service": { "id": "..." },
//   "transaction": { "status": "SUCCESS|FAILED", "original_request_id": "..." },
//   "order": { "invoice_number": "...", "amount": 50000 }
// }
//
// DOKU SNAP Format:
// {
//   "latestTransactionStatus": "00|03|04|05|06",
//   "originalPartnerReferenceNo": "...",
//   "amount": { "value": "50000.00", "currency": "IDR" }
// }
// ============================================================

// Non-SNAP notification schema (DOKU Checkout hosted page)
export const dokuNonSnapNotificationSchema = z.object({
  service: z.object({
    id: z.string(),
  }).optional(),
  acquirer: z.object({
    id: z.string(),
  }).optional(),
  channel: z.object({
    id: z.string(),
  }).optional(),
  transaction: z.object({
    status: z.string(), // SUCCESS, FAILED, PENDING, etc.
    date: z.string().optional(),
    original_request_id: z.string().optional(),
  }).optional(),
  order: z.object({
    invoice_number: z.string(), // Our payment ID
    amount: z.number().optional(),
  }).optional(),
  // Additional payment info (varies by method)
  card_payment: z.object({
    masked_card_number: z.string().optional(),
    approval_code: z.string().optional(),
    response_code: z.string().optional(),
    response_message: z.string().optional(),
  }).optional().nullable(),
  virtual_account_payment: z.object({
    identifier: z.array(z.object({
      name: z.string(),
      value: z.string(),
    })).optional(),
  }).optional().nullable(),
  emoney_payment: z.object({
    account_id: z.string().optional(),
    approval_code: z.string().optional(),
  }).optional().nullable(),
  additional_info: z.record(z.string(), z.unknown()).optional(),
});

export type DokuNonSnapNotification = z.infer<typeof dokuNonSnapNotificationSchema>;

// SNAP notification schema (kept for reference, but we use Non-SNAP)
export const dokuSnapNotificationSchema = z.object({
  originalReferenceNo: z.string().optional(),
  originalPartnerReferenceNo: z.string().optional(),
  latestTransactionStatus: z.string(),
  transactionStatusDesc: z.string().optional(),
  amount: z
    .object({
      value: z.string(),
      currency: z.string(),
    })
    .optional(),
  additionalInfo: z.record(z.string(), z.unknown()).optional(),
});

export type DokuSnapNotification = z.infer<typeof dokuSnapNotificationSchema>;

// Unified notification type - can be either format
export const dokuNotificationSchema = z.union([
  dokuNonSnapNotificationSchema,
  dokuSnapNotificationSchema,
]);

export type DokuNotification = z.infer<typeof dokuNotificationSchema>;

// ============================================================
// Response Schemas
// ============================================================

export const paymentResponseSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  amount: z.number(),
  currency: z.string(),
  providerCode: z.string(),
  methodCode: z.string(),
  methodName: z.string(),
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED']),
  dokuInvoiceNumber: z.string().optional(),
  dokuPaymentUrl: z.string().url().optional(),
  qrContent: z.string().optional(),
  virtualAccountNo: z.string().optional(),
  virtualAccountName: z.string().optional(),
  paidAt: z.string().datetime().optional(),
  expiredAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});

export const paymentMethodsResponseSchema = z.array(
  z.object({
    code: z.string(),
    name: z.string(),
    groupCode: z.string(),
    groupName: z.string(),
    icon: z.string().optional(),
    feeLabel: z.string().optional(),
  })
);

// ============================================================
// Status Mapping
//
// DOKU SNAP transaction status codes:
// 00 = SUCCESS/PAID
// 01 = Transaction accepted (pending)
// 02 = Transaction being processed (pending)
// 03 = Transaction pending/in progress
// 04 = Refunded
// 05 = Expired
// 06 = Failed/Rejected
//
// DOKU Non-SNAP (Checkout) transaction status:
// SUCCESS = Paid/Completed
// FAILED = Failed
// PENDING = Pending
// REFUNDED = Refunded
// EXPIRED = Expired
// CANCELLED = Cancelled
// ============================================================

export const DOKU_STATUS_MAP: Record<string, z.infer<typeof paymentResponseSchema>['status']> = {
  // SNAP status codes
  '00': 'PAID',
  '01': 'PENDING', // Transaction accepted, pending confirmation
  '02': 'PENDING', // Transaction being processed
  '03': 'PENDING',
  '04': 'REFUNDED',
  '05': 'EXPIRED',
  '06': 'FAILED',
  // Non-SNAP status strings (DOKU Checkout)
  'SUCCESS': 'PAID',
  'PAID': 'PAID',
  'COMPLETED': 'PAID',
  'PENDING': 'PENDING',
  'IN_PROGRESS': 'PENDING',
  'PROCESSING': 'PENDING',
  'FAILED': 'FAILED',
  'REJECTED': 'FAILED',
  'ERROR': 'FAILED',
  'REFUNDED': 'REFUNDED',
  'PARTIAL_REFUND': 'REFUNDED',
  'EXPIRED': 'EXPIRED',
  'TIMEOUT': 'EXPIRED',
  'CANCELLED': 'FAILED',
  'CANCELED': 'FAILED',
  'VOIDED': 'FAILED',
};
