// ============================================================
// DOKU SNAP E-Wallet Implementation
// ============================================================

import { DokuClient } from './client';
import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentNotification,
  PaymentStatus,
  PaymentProviderAdapter,
} from '../types';

// E-Wallet channel codes
export const EWALLET_CHANNEL_CODES = {
  OVO: 'EMONEY_OVO',
  DANA: 'EMONEY_DANA',
  SHOPEEPAY: 'EMONEY_SHOPEEPAY',
} as const;

export type EWalletChannel = keyof typeof EWALLET_CHANNEL_CODES;

export class DokuEWalletAdapter implements PaymentProviderAdapter {
  readonly providerCode = 'DOKU';
  readonly methodCode: string;

  private client: DokuClient;
  private channel: EWalletChannel;
  private channelCode: string;

  constructor(client: DokuClient, channel: EWalletChannel) {
    this.client = client;
    this.channel = channel;
    this.channelCode = EWALLET_CHANNEL_CODES[channel];
    this.methodCode = channel;
  }

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    const dokuRequest = {
      partnerReferenceNo: request.orderRef,
      urlParam: {
        url: '', // Will be filled by DOKU
        type: 'PAY_RETURN',
        isDeepLink: 'N',
      },
      amount: {
        value: request.amount.toFixed(2),
        currency: request.currency ?? 'IDR',
      },
      additionalInfo: {
        channel: this.channelCode,
      },
    };

    // Set expiry if specified
    if (request.expiryMinutes) {
      dokuRequest.urlParam.url = `https://callback.ascend.com/payment/ewallet?order=${request.orderId}`;
    }

    const response = await this.client.post(
      '/direct-debit/core/v1/debit/payment-host-to-host',
      dokuRequest
    );

    if (!response.responseCode?.startsWith('20')) {
      throw new Error(
        `DOKU e-Wallet (${this.channel}) error: ${response.responseCode} - ${response.responseMessage}`
      );
    }

    return {
      success: true,
      providerCode: this.providerCode,
      methodCode: this.methodCode,
      webRedirectUrl: response.webRedirectUrl as string,
      transactionId: response.referenceNo as string,
      invoiceNumber: request.orderRef,
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

// ============================================================
// E-Wallet Factory
// ============================================================

export async function createEWalletAdapter(
  client: DokuClient,
  channel: EWalletChannel
): Promise<DokuEWalletAdapter> {
  return new DokuEWalletAdapter(client, channel);
}
