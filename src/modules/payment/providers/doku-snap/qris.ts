// ============================================================
// DOKU SNAP QRIS Implementation
// ============================================================

import { DokuClient } from './client';
import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentNotification,
  PaymentStatus,
  PaymentProviderAdapter,
} from '../types';

export class DokuQRISAdapter implements PaymentProviderAdapter {
  readonly providerCode = 'DOKU';
  readonly methodCode = 'QRIS';

  private client: DokuClient;
  private channelCode = 'QRIS';

  constructor(client: DokuClient) {
    this.client = client;
  }

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    const dokuRequest = {
      partnerReferenceNo: request.orderRef,
      merchantId: this.client['config'].clientId, // Will be set from config
      terminalId: '001',
      amount: {
        value: request.amount.toFixed(2),
        currency: request.currency ?? 'IDR',
      },
      validityPeriod: request.expiryMinutes
        ? new Date(Date.now() + request.expiryMinutes * 60 * 1000)
            .toISOString()
            .replace(/\.\d{3}/, '')
        : undefined,
      additionalInfo: {
        postalCode: '12345',
        feeType: 1, // No Tips
      },
    };

    // Get access token for this specific request
    const accessToken = await this.client.getAccessToken();

    const response = await this.client.post(
      '/snap-adapter/b2b/v1.0/qr/qr-mpm-generate',
      dokuRequest
    );

    // Refresh client reference with proper merchantId
    const merchantId = this.client['config'].clientId;
    dokuRequest.merchantId = merchantId;

    if (!response.responseCode?.startsWith('20')) {
      throw new Error(`DOKU QRIS error: ${response.responseCode} - ${response.responseMessage}`);
    }

    return {
      success: true,
      providerCode: this.providerCode,
      methodCode: this.methodCode,
      qrContent: response.qrContent as string,
      transactionId: response.referenceNo as string,
      invoiceNumber: request.orderRef,
      expiryTime: (response.additionalInfo as Record<string, string>)?.validityPeriod,
      rawResponse: response as Record<string, unknown>,
    };
  }

  async handleNotification(
    notification: PaymentNotification
  ): Promise<{
    paymentId: string;
    status: PaymentStatus;
    transactionId?: string;
  }> {
    // QRIS notification handling
    const status = this.mapTransactionStatus(notification.latestTransactionStatus);

    return {
      paymentId: notification.originalPartnerReferenceNo ?? '',
      status,
      transactionId: notification.originalReferenceNo,
    };
  }

  verifyWebhookSignature(signature: string, timestamp: string, body: string): boolean {
    return this.client.verifyWebhookSignature(signature, timestamp, body);
  }

  private mapTransactionStatus(dokuStatus: string): PaymentStatus {
    switch (dokuStatus) {
      case '00':
        return 'PAID';
      case '03':
        return 'PENDING';
      case '04':
        return 'REFUNDED';
      case '05':
        return 'EXPIRED';
      case '06':
        return 'FAILED';
      default:
        return 'PENDING';
    }
  }
}
