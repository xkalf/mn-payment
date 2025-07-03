export type Token = {
  access_token: string;
  refresh_token: string;
  refresh_expires_in?: number;
  expires_in: number;
};

export type SaveToken = (token: Token) => Promise<void>
