import type { Credentials } from "google-auth-library";

export interface GoogleWorkspaceAccount {
  id: string;
  email: string;
  name: string;
  picture?: string;
  tokens: Credentials;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleWorkspaceStoreData {
  accounts: Record<string, GoogleWorkspaceAccount>;
}

export interface GoogleWorkspaceResolution {
  ok: boolean;
  account?: GoogleWorkspaceAccount;
  error?: string;
  code?:
    | "oauth_not_configured"
    | "no_accounts"
    | "account_not_found"
    | "multiple_accounts";
  accounts?: Array<Pick<GoogleWorkspaceAccount, "id" | "email" | "name">>;
}
