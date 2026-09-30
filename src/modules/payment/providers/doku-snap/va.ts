// ============================================================
// DOKU SNAP Virtual Account Implementation
// ============================================================

import { DokuClient } from './client';
import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentNotification,
  PaymentStatus,
  PaymentProviderAdapter,
} from '../types';

// Channel codes for VA
export const VA_CHANNEL_CODES = {
  BCA: 'VIRTUAL_ACCOUNT_BCA',
  MANDIRI: 'VIRTUAL_ACCOUNT_BANK_MANDIRI',
  BRI: 'VIRTUAL_ACCOUNT_BRI',
  BNI: 'VIRTUAL_ACCOUNT_BNI',
  PERMATA: 'VIRTUAL_ACCOUNT_PERMATA',
  CIMB: 'VIRTUAL_ACCOUNT_CIMB',
  DANAMON: 'VIRTUAL_ACCOUNT_DANAMON',
  BSI: 'VIRTUAL_ACCOUNT_BSI',
  BTN: 'VIRTUAL_ACCOUNT_BTN',
} as const;

export type VAChannel = keyof typeof VA_CHANNEL_CODES;

export interface VACreateRequest extends CreatePaymentRequest {
  channel: VAChannel;
  partnerServiceId: string; // Bank service ID from DOKU
}

interface DOKUVARequest {
  partnerServiceId: string;
  customerNo: string;
  virtualAccountNo: string;
  virtualAccountName: string;
  virtualAccountEmail?: string;
  virtualAccountPhone?: string;
  totalAmount: {
    value: string;
    currency: string;
  };
  virtualAccountTrxType: string;
  additionalInfo?: {
    channel: string;
  };
}

export class DokuVAAdapter implements PaymentProviderAdapter {
  readonly providerCode = 'DOKU';
  readonly methodCode: string;

  private client: DokuClient;
  private channel: VAChannel;
  private channelCode: string;
  private partnerServiceId: string;

  constructor(
    client: DokuClient,
    channel: VAChannel,
    partnerServiceId: string
  ) {
    this.client = client;
    this.channel = channel;
    this.channelCode = VA_CHANNEL_CODES[channel];
    this.methodCode = `VA_${channel}`;
    this.partnerServiceId = partnerServiceId;
  }

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    // Generate virtual account number (partnerServiceId + random customer number)
    const customerNo = this.generateCustomerNo();
    const virtualAccountNo = `${this.partnerServiceId.trim()}${customerNo}`;

    // Build base request
    const dokuRequest: DOKUVARequest = {
      partnerServiceId: this.partnerServiceId,
      customerNo,
      virtualAccountNo,
      virtualAccountName: request.customerName,
      virtualAccountEmail: request.customerEmail,
      virtualAccountPhone: request.customerPhone,
      totalAmount: {
        value: request.amount.toFixed(2),
        currency: request.currency ?? 'IDR',
      },
      virtualAccountTrxType: 'O', // Open amount
      additionalInfo: {
        channel: this.channelCode,
      },
    };

    // Calculate expiry
    let expiryDate: string | undefined;
    if (request.expiryMinutes) {
      expiryDate = new Date(Date.now() + request.expiryMinutes * 60 * 1000)
        .toISOString()
        .replace(/\.\d{3}/, ''); // Remove milliseconds
    }

    // DOKU VA uses expiryDate at top level
    const requestBody = {
      ...dokuRequest,
      ...(expiryDate && { expiryDate }),
    };

    const response = await this.client.post(
      '/virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va',
      requestBody
    );

    if (!response.responseCode?.startsWith('20')) {
      throw new Error(`DOKU VA error: ${response.responseCode} - ${response.responseMessage}`);
    }

    const virtualAccountData = response.virtualAccountData as Record<string, string> | undefined;
    const additionalInfo = response.additionalInfo as Record<string, string> | undefined;

    return {
      success: true,
      providerCode: this.providerCode,
      methodCode: this.methodCode,
      virtualAccountNo: virtualAccountData?.virtualAccountNo ?? virtualAccountNo,
      virtualAccountName: request.customerName,
      howToPayPage: additionalInfo?.howToPayPage,
      transactionId: additionalInfo?.trxId,
      invoiceNumber: request.orderRef,
      expiryTime: virtualAccountData?.expiredDate ?? expiryDate,
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

  private generateCustomerNo(): string {
    // Generate 10-digit random number
    return Math.floor(Math.random() * 10 ** 10)
      .toString()
      .padStart(10, '0');
  }
}

// ============================================================
// VA Factory
// ============================================================

export async function createVAAdapter(
  client: DokuClient,
  channel: VAChannel,
  partnerServiceId: string
): Promise<DokuVAAdapter> {
  return new DokuVAAdapter(client, channel, partnerServiceId);
}
