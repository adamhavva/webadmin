// ============================================================
// DOKU SNAP HTTP Client with HMAC-SHA512 Signature
// ============================================================

import crypto from 'crypto';

export interface DokuConfig {
  clientId: string;
  clientSecret: string;
  privateKey?: string;
  publicKey?: string;
  isProduction: boolean;
  webhookSecret?: string;
}

export interface DokuRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: Record<string, unknown> | null;
  accessToken?: string;
}

export interface DokuResponse<T = unknown> {
  responseCode: string;
  responseMessage: string;
  data?: T;
  [key: string]: unknown;
}

// Check if response is success (responseCode starts with 2xx)
function isSuccessCode(code: string): boolean {
  return code.startsWith('20');
}

export class DokuClient {
  private readonly config: DokuConfig;
  private readonly baseUrl: string;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: DokuConfig) {
    this.config = config;
    this.baseUrl = config.isProduction
      ? 'https://api.doku.com'
      : 'https://api-sandbox.doku.com';
  }

  // ============================================================
  // Token Management
  // ============================================================

  async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    const timestamp = this.getTimestamp();
    const externalId = this.generateExternalId();

    // B2B Token request - asymmetric signature
    const stringToSign = `${this.config.clientId}|${timestamp}`;
    const signature = this.signAsymmetric(stringToSign);

    const response = await fetch(`${this.baseUrl}/authorization/v1/access-token/b2b`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TIMESTAMP': timestamp,
        'X-CLIENT-KEY': this.config.clientId,
        'X-SIGNATURE': signature,
      },
      body: JSON.stringify({ grantType: 'client_credentials' }),
    });

    const data = (await response.json()) as DokuResponse<{
      accessToken: string;
      expiresIn: number;
    }>;

    if (!isSuccessCode(data.responseCode)) {
      throw new Error(`DOKU token error: ${data.responseCode} - ${data.responseMessage}`);
    }

    this.accessToken = data.data?.accessToken ?? '';
    this.tokenExpiry = new Date(Date.now() + (data.data?.expiresIn ?? 900) * 1000);

    return this.accessToken;
  }

  // ============================================================
  // HTTP Methods
  // ============================================================

  async request<T = unknown>(options: DokuRequestOptions): Promise<DokuResponse<T>> {
    const accessToken = options.accessToken ?? await this.getAccessToken();
    const timestamp = this.getTimestamp();
    const externalId = this.generateExternalId();

    const headers = this.buildHeaders(options, accessToken, timestamp, externalId);

    const url = `${this.baseUrl}${options.path}`;
    const body = options.body ? JSON.stringify(options.body) : undefined;

    const response = await fetch(url, {
      method: options.method,
      headers,
      body,
    });

    const data = (await response.json()) as DokuResponse<T>;

    return data;
  }

  async post<T = unknown>(
    path: string,
    body: Record<string, unknown>
  ): Promise<DokuResponse<T>> {
    return this.request<T>({ method: 'POST', path, body });
  }

  async get<T = unknown>(path: string): Promise<DokuResponse<T>> {
    return this.request<T>({ method: 'GET', path, body: null });
  }

  // ============================================================
  // Webhook Signature Verification
  // ============================================================

  verifyWebhookSignature(
    signature: string,
    timestamp: string,
    body: string
  ): boolean {
    if (!this.config.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const stringToSign = `POST:/api/payment/notification:${this.config.webhookSecret}:${this.hashBody(body)}:${timestamp}`;
    const expectedSignature = this.signSymmetric(stringToSign);

    // Timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // ============================================================
  // Signature Generation
  // ============================================================

  /**
   * Generate symmetric signature (HMAC-SHA512)
   * Format: HTTPMethod + ":" + EndpointUrl + ":" + AccessToken + ":" + Lowercase(HexEncode(SHA256(minify(RequestBody)))) + ":" + TimeStamp
   */
  generateSignature(
    method: string,
    path: string,
    accessToken: string,
    body: string,
    timestamp: string
  ): string {
    const bodyHash = this.hashBody(body);
    const stringToSign = `${method}:${path}:${accessToken}:${bodyHash}:${timestamp}`;
    return this.signSymmetric(stringToSign);
  }

  private signSymmetric(data: string): string {
    return crypto
      .createHmac('sha512', this.config.clientSecret)
      .update(data)
      .digest('base64');
  }

  private signAsymmetric(data: string): string {
    if (!this.config.privateKey) {
      throw new Error('Private key not configured');
    }

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    return sign.sign(this.config.privateKey, 'base64');
  }

  verifyAsymmetric(data: string, signature: string): boolean {
    if (!this.config.publicKey) {
      throw new Error('Public key not configured');
    }

    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(data);
    return verify.verify(this.config.publicKey, signature, 'base64');
  }

  private hashBody(body: string): string {
    const minified = JSON.stringify(JSON.parse(body));
    return crypto.createHash('sha256').update(minified).digest('hex');
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace(/\.\d{3}/, '');
  }

  private generateExternalId(): string {
    return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private buildHeaders(
    options: DokuRequestOptions,
    accessToken: string,
    timestamp: string,
    externalId: string
  ): Record<string, string> {
    const body = options.body ? JSON.stringify(options.body) : '';
    const signature = options.body
      ? this.generateSignature(
          options.method,
          options.path,
          accessToken,
          body,
          timestamp
        )
      : this.generateSignature(
          options.method,
          options.path,
          accessToken,
          '',
          timestamp
        );

    return {
      'Content-Type': 'application/json',
      'X-PARTNER-ID': this.config.clientId,
      'X-EXTERNAL-ID': externalId,
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
      Authorization: `Bearer ${accessToken}`,
      'CHANNEL-ID': 'H2H',
    };
  }
}

// ============================================================
// Client Factory
// ============================================================

let cachedClient: DokuClient | null = null;

export async function getDokuClient(): Promise<DokuClient> {
  if (cachedClient) {
    return cachedClient;
  }

  // Load config from database
  const { prisma } = await import('@/lib/db');

  const provider = await prisma.paymentProviderConfig.findFirst({
    where: { code: 'DOKU', isActive: true },
  });

  if (!provider) {
    throw new Error('DOKU provider not configured');
  }

  const config: DokuConfig = {
    clientId: provider.isProduction
      ? (provider.dokuClientId ?? '')
      : (provider.dokuSandboxClientId ?? ''),
    clientSecret: provider.isProduction
      ? (provider.dokuClientSecret ?? '')
      : (provider.dokuSandboxClientSecret ?? ''),
    privateKey: provider.isProduction
      ? provider.dokuPrivateKey ?? undefined
      : provider.dokuSandboxPrivateKey ?? undefined,
    publicKey: provider.isProduction
      ? provider.dokuPublicKey ?? undefined
      : provider.dokuSandboxPublicKey ?? undefined,
    isProduction: provider.isProduction,
    webhookSecret: provider.webhookSecret ?? undefined,
  };

  cachedClient = new DokuClient(config);
  return cachedClient;
}

export function clearDokuClientCache(): void {
  cachedClient = null;
}
