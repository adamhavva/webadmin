// ============================================================
// Payment Validators (Zod Schemas)
// ============================================================

import { z } from 'zod';

// ============================================================
// Payment Creation
// ============================================================

export const createPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  paymentMethod: z.string().optional(),
  customerName: z.string().min(1, 'Customer name is required').max(255),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z
    .string()
    .regex(/^(\+62|62|0)/, 'Invalid phone format')
    .optional()
    .transform(v => v === '' ? undefined : v),
  expiryMinutes: z.number().int().positive().max(1440).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

// ============================================================
// Webhook Notification
// ============================================================

export const midtransNotificationSchema = z.object({
  transaction_time: z.string(),
  transaction_status: z.string(),
  transaction_id: z.string(),
  status_message: z.string(),
  status_code: z.string(),
  signature_key: z.string(),
  payment_type: z.string(),
  order_id: z.string(),
  merchant_id: z.string(),
  gross_amount: z.string(),
  fraud_status: z.string().optional(),
  currency: z.string().optional(),
  va_numbers: z
    .array(z.object({ bank: z.string(), va_number: z.string() }))
    .optional(),
  acquirer: z.string().optional(),
  expiry_time: z.string().optional(),
});

export type MidtransNotification = z.infer<typeof midtransNotificationSchema>;

// ============================================================
// Status Mapping
// Midtrans transaction status codes
// ============================================================

export const MIDTRANS_STATUS_MAP: Record<string, 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED'> = {
  settlement: 'PAID',
  capture: 'PAID',
  pending: 'PENDING',
  deny: 'FAILED',
  cancel: 'FAILED',
  expire: 'EXPIRED',
  failure: 'FAILED',
};

// ============================================================
// Response Schemas
// ============================================================

export const paymentResponseSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  amount: z.number(),
  currency: z.string(),
  methodCode: z.string().optional(),
  methodName: z.string().optional(),
  methodGroup: z.string().optional(),
  grossAmount: z.string().optional(),
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED']),
  snapToken: z.string().optional(),
  paymentUrl: z.string().url().optional(),
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
