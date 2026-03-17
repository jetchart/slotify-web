export interface UserCredential {
  name: string;
  token: string;
  exp?: number;
  [key: string]: any;
}
