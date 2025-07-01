import { Token } from "./types";

type CreateInvoiceRequestInput = {
  sender_invoice_no: string;
  invoice_receiver_code: string;
  invoice_description: string;
  amount: number;
  callback_url: string;
};

type TokenResponse = {
  token_type: string;
  refresh_expires_in: number;
  refresh_token: string;
  access_token: string;
  expires_in: number;
  scope: string;
  "not-before-policy": string;
  session_state: string;
};

type InvoiceResponse = {
  invoice_id: string;
  qr_text: string;
  qr_image: string;
  qPay_shortUrl: string;
  urls: {
    name: string;
    description: string;
    logo: string;
    link: string;
  }[];
};

type InvoiceCheckResponse = {
  count: number;
  paid_amount: number;
  rows: Array<{
    payment_id: string;
    payment_status: string;
    payment_amount: string;
    trx_fee: string;
    payment_currency: string;
    payment_wallet: string;
    payment_type: string;
    next_payment_date: any;
    next_payment_datetime: any;
    card_transactions: Array<any>;
    p2p_transactions: Array<{
      id: string;
      transaction_bank_code: string;
      account_bank_code: string;
      account_bank_name: string;
      account_number: string;
      status: string;
      amount: string;
      currency: string;
      settlement_status: string;
    }>;
  }>;
};

export class Qpay {
  private username: string;
  private password: string;
  private invoiceCode: string;
  private baseUrl = "https://merchant.qpay.mn";

  constructor(username: string, password: string, invoiceCode: string) {
    this.username = username;
    this.password = password;
    this.invoiceCode = invoiceCode;
  }

  private async login() {
    const req = await fetch(`${this.baseUrl}/v2/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${this.username}:${this.password}`)}`,
      },
    });

    const res = await req.json();

    if (res.error) {
      throw new Error(res.message);
    }

    return res as TokenResponse;
  }

  private async getRefreshToken(refreshToken: string) {
    const req = await fetch(`${this.baseUrl}/v2/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    const res = await req.json();

    if (res.error) {
      throw new Error(res.message);
    }

    return res as TokenResponse;
  }

  private async checkToken(token?: Token) {
    if (!token || !token.refresh_expires_in) {
      token = await this.login();
    }

    if (token.refresh_expires_in && new Date(token.refresh_expires_in * 1000) <= new Date()) {
      token = await this.login();
    } else {
      token = await this.getRefreshToken(token.refresh_token);
    }

    return token;
  }

  async createInvoice(input: CreateInvoiceRequestInput, token?: Token) {
    token = await this.checkToken(token);

    const req = await fetch(`${this.baseUrl}/v2/invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.access_token}`,
      },
      body: JSON.stringify({
        ...input,
        invoice_code: this.invoiceCode,
      }),
    });

    const res: InvoiceResponse = await req.json();

    return {
      data: res,
      token,
    };
  }

  async checkInvoice(invoiceId: string, token?: Token) {
    token = await this.checkToken(token);
    const req = await fetch(`${this.baseUrl}/v2/payment/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.access_token}`,
      },
      body: JSON.stringify({
        object_type: "INVOICE",
        object_id: invoiceId,
      }),
    });

    const res: InvoiceCheckResponse = await req.json();

    return {
      data: res,
      token,
    };
  }
}
