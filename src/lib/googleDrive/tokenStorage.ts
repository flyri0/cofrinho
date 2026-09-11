import * as SecureStore from 'expo-secure-store';

// The OAuth token and connected account email are kept in expo-secure-store
// (OS keystore/keychain), NOT in the SQLite database — so they can never end
// up inside a backup export (see buildBackupExport.ts) and aren't readable by
// anything that only has access to the app's regular files.
const ACCESS_TOKEN_KEY = 'googleDrive.accessToken';
const REFRESH_TOKEN_KEY = 'googleDrive.refreshToken';
const EXPIRES_AT_KEY = 'googleDrive.expiresAt'; // ISO string
const ACCOUNT_EMAIL_KEY = 'googleDrive.accountEmail';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string | null;
  /** ISO timestamp string; null if the provider didn't report an expiry. */
  expiresAt: string | null;
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
  if (tokens.expiresAt) {
    await SecureStore.setItemAsync(EXPIRES_AT_KEY, tokens.expiresAt);
  } else {
    await SecureStore.deleteItemAsync(EXPIRES_AT_KEY);
  }
}

export async function loadTokens(): Promise<StoredTokens | null> {
  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (!accessToken) return null;

  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  const expiresAt = await SecureStore.getItemAsync(EXPIRES_AT_KEY);
  return { accessToken, refreshToken, expiresAt };
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(EXPIRES_AT_KEY);
}

export async function saveAccountEmail(email: string): Promise<void> {
  await SecureStore.setItemAsync(ACCOUNT_EMAIL_KEY, email);
}

export async function loadAccountEmail(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCOUNT_EMAIL_KEY);
}

export async function clearAccountEmail(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCOUNT_EMAIL_KEY);
}
