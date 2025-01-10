import { Token } from "./types"

type CreateInvoiceRequestInput = {
  storeId: number;
  mobileNumber: number;
  description: string;
  amount: number;
  callbackUrl?: string;
  requestId?: string;
}

type InvoiceResponse = {
  value: number
  data: {}
  msgList: Array<string>
  attrs: {}
  status: string
}

type TokenResponse = {
  access_token: string
  token_type: string
  refresh_token: string
  expires_in: number
  scope: string
  current_store_id: any
  user_id: number
  role_id: {
    id: number
    code: string
    description: string
    authority: string
  }
  jti: string
}

type InvoiceCheckResponse = {
  value: boolean
  data: {}
  msgList: Array<string>
  attrs: {}
  status: string
}


export class StorePay {
  private username: string;
  private password: string;
  private appUsername: string;
  private appPassword: string;
  private baseUrl = 'https://service.storepay.mn:8778'

  constructor(username: string, password: string, appUsername: string, appPassword: string) {
    this.username = username;
    this.password = password;
    this.appUsername = appUsername;
    this.appPassword = appPassword;
  }

  async login() {
    const req = await fetch(`${this.baseUrl}/merchant-uaa/oauth/token`, {
      method: 'POST',
      body: JSON.stringify({
        grant_type: "password",
        username: this.username,
        password: this.password,
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${this.appUsername}:${this.appPassword}`)}`,
      }
    })

    const res = await req.json()

    if (res.error) {
      throw new Error(res.error_description)
    }

    return res as TokenResponse
  }

  private async checkToken(token?: Token) {
    if (!token) {
      token = await this.login()
    }

    if (new Date(token.expires_in * 1000) <= new Date()) {
      token = await this.login()
    }

    return token
  }

  async createInvoice(input: CreateInvoiceRequestInput, token?: Token) {
    token = await this.checkToken(token)

    const req = await fetch(`${this.baseUrl}/lend-merchant/merchant/loan`, {
      method: 'POST',
      body: JSON.stringify(input),
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      }
    })

    const res = await req.json()

    if (res.data.status !== 'Success') {
      throw Error(res.data.msgList[0].text);
    }

    return {
      data: res as InvoiceResponse,
      token
    }
  }

  async checkInvoice(invoiceId: string, token?: Token) {
    token = await this.checkToken(token)

    const req = await fetch(`${this.baseUrl}/lend-merchant/merchant/loan/check/${invoiceId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token.access_token}`
      }
    })

    const res: InvoiceCheckResponse = await req.json()

    return {
      data: res,
      token
    }
  }
}
