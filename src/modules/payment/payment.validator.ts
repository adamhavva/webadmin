// ============================================================
// Payment Validators (Zod Schemas)
// ============================================================

import { z } from 'zod';

// ============================================================
// Payment Creation
// ============================================================

export const createPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  methodCode: z.string().min(1, 'Method code is required'),
  // paymentMethod: DOKU channel code (e.g., "ONLINE", "CREDIT_CARD", "VIRTUAL_ACCOUNT_BCA")
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
// Webhook Notification
// ============================================================

export const dokuNotificationSchema = z.object({
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
// DOKU SNAP transaction status codes:
// 00 = SUCCESS/PAID
// 01 = Transaction accepted (pending)
// 02 = Transaction being processed (pending)
// 03 = Transaction pending/in progress
// 04 = Refunded
// 05 = Expired
// 06 = Failed/Rejected
// ============================================================

export const DOKU_STATUS_MAP: Record<string, z.infer<typeof paymentResponseSchema>['status']> = {
  '00': 'PAID',
  '01': 'PENDING', // Transaction accepted, pending confirmation
  '02': 'PENDING', // Transaction being processed
  '03': 'PENDING',
  '04': 'REFUNDED',
  '05': 'EXPIRED',
  '06': 'FAILED',
};
