import { Token } from "./types";

type TokenResponse = {
  success: true;
  data: {
    refreshToken: string;
    accessToken: string;
    refreshTokenExpiresIn: number,
    accessTokenExpiresIn: number;
    tokenType: string;
  }
} | {
  success: false;
  error: {
    code: number;
    message: string;
    isReadableMessage: boolean;
  }
}

type RefreshTokenResponse = {
  success: boolean;
  data: {
    accessToken: string;
    accessTokenExpriresIn: string;
    tokenType: string;
  }
}

type CreateInvoiceInput = {
  amount: number;
  description: string;
  customData: unknown;
  callbackUrl: string;
}

type CreateInvoiceResponse = {
  success: boolean;
  data: {
    status: 'open' | 'paid' | 'void';
    amount: number;
    invoiceNumber: string;
    customData: {
      qrCode: string;
      callbackUrl: string;
    }
  }
}

type InvoiceCheckResponse = {
  success: boolean;
  data: {
    invoiceNumber: string;
    status: 'open' | 'paid' | 'void';
    amount: number;
    qrCode: string;
    description: string;
  }
}

export class UbPay {
  private clientId: string;
  private clientSecret: string;

  private baseUrl = "https://merchant-payment-api.dev.p.ubcabtech.com";

  constructor(clientId: string, clientSecret: string, baseUrl?: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseUrl = baseUrl || this.baseUrl;
  }

  async login(): Promise<Token> {
    const req = await fetch(`${this.baseUrl}/auth/token`, {
      method: "POST",
      body: JSON.stringify({
        clientId: this.clientId,
        clientSecret: this.clientSecret
      })
    })

    const res: TokenResponse = await req.json()

    if (!res.success) {
      throw new Error(res.error.message)
    }

    return {
      access_token: res.data.accessToken,
      refresh_token: res.data.refreshToken,
      refresh_expires_in: res.data.refreshTokenExpiresIn,
      expires_in: res.data.accessTokenExpiresIn
    }
  }

  async getRefreshToken(token: Token): Promise<Token> {
    const req = await fetch(`${this.baseUrl}/auth/refresh-token`, {
      method: "POST",
      body: JSON.stringify({
        refreshToken: token.refresh_token
      })
    })

    const res: RefreshTokenResponse = await req.json()

    return {
      ...token,
      access_token: res.data.accessToken,
      expires_in: parseInt(res.data.accessTokenExpriresIn, 10)
    }
  }

  private async checkToken(token?: Token) {
    if (!token || !token.refresh_expires_in) {
      token = await this.login();
    }

    if (token.refresh_expires_in && new Date(token.refresh_expires_in * 1000) <= new Date()) {
      token = await this.login();
    } else if (
      new Date(token.expires_in * 1000) <= new Date()
    ) {
      token = await this.getRefreshToken(token);
    }

    return token;
  }

  async createInvoice(input: CreateInvoiceInput, token?: Token) {
    token = await this.checkToken(token)

    const req = await fetch(`${this.baseUrl}/api/v1/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.access_token}`,
      },
      body: JSON.stringify(input)
    })

    const res: CreateInvoiceResponse = await req.json()

    return {
      data: res,
      token
    }
  }

  async checkInvoice(invoiceId: string, token?: Token) {
    token = await this.checkToken(token)

    const req = await fetch(`${this.baseUrl}/api/v1/invoices/${invoiceId}`, {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      }
    })

    const res: InvoiceCheckResponse = await req.json()

    return {
      data: res,
      token
    }
  }
}
