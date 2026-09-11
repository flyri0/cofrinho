import * as AuthSession from 'expo-auth-session';

import { GOOGLE_DRIVE_SCOPES } from './scopes';
import {
  clearAccountEmail,
  clearTokens,
  loadTokens,
  saveTokens,
  type StoredTokens,
} from './tokenStorage';

// Google's fixed OAuth 2.0 endpoints — hardcoded rather than fetched via
// AuthSession.useAutoDiscovery, since they're well-known and stable (this is
// the same set expo-auth-session's own Google provider hardcodes internally).
// Avoiding a discovery fetch also means the sign-in button never has to wait
// on a "discovery not loaded yet" state.
export const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Requires a Google Cloud OAuth 2.0 Client ID of the "Desktop app" type. Set up:
//   1. In Google Cloud Console, enable the Google Drive API for your project.
//   2. Create an OAuth 2.0 Client ID of type "Desktop app".
//      - NOT "Web application": that type validates redirect URIs and
//        REJECTS a custom scheme like `cofrinho://` with "Invalid redirect:
//        must contain a domain" ("Redirecionamento inválido: é preciso haver
//        um domínio") — Web clients only accept http(s) URLs with a real
//        domain. "Desktop app" is Google's client type for installed/native
//        apps (see https://developers.google.com/identity/protocols/oauth2/native-app):
//        it has no client secret, doesn't ask for or validate a redirect URI
//        in the Console at all, and accepts a private-use URI scheme
//        redirect (like `cofrinho://`) at request time.
//      - NOT "Android"/"iOS" either — those use Google's own fixed
//        reverse-domain redirect convention instead of this app's own scheme.
//   3. Put the client ID in a (gitignored) .env file as
//      EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
// This external setup can't be automated or verified from here — sign-in
// should be tested manually on a real device once configured.
export function getGoogleClientId(): string {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      'EXPO_PUBLIC_GOOGLE_CLIENT_ID is not set. See src/lib/googleDrive/auth.ts for setup steps.',
    );
  }
  return clientId;
}

export function buildAuthRequestConfig(redirectUri: string): AuthSession.AuthRequestConfig {
  return {
    clientId: getGoogleClientId(),
    scopes: [...GOOGLE_DRIVE_SCOPES],
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    // access_type=offline + prompt=consent: without both, Google only issues a
    // refresh_token on a user's very first-ever consent, which would silently
    // break automatic background/foreground backups (§7.6) after the access
    // token's ~1h expiry on any subsequent sign-in.
    extraParams: { access_type: 'offline' },
    prompt: AuthSession.Prompt.Consent,
  };
}

export async function exchangeAuthCode(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<void> {
  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId: getGoogleClientId(),
      code,
      redirectUri,
      extraParams: { code_verifier: codeVerifier },
    },
    GOOGLE_DISCOVERY,
  );

  await saveTokens({
    accessToken: tokenResponse.accessToken,
    refreshToken: tokenResponse.refreshToken ?? null,
    expiresAt: tokenResponse.expiresIn
      ? new Date(Date.now() + tokenResponse.expiresIn * 1000).toISOString()
      : null,
  });
}

// A stored access token is treated as expired 5 minutes early, to leave
// margin for the backup request itself to complete before it truly expires.
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

function isExpired(tokens: StoredTokens): boolean {
  if (!tokens.expiresAt) return false; // no reported expiry; trust it until Drive itself rejects it
  return Date.now() >= new Date(tokens.expiresAt).getTime() - EXPIRY_MARGIN_MS;
}

// Returns a currently-valid access token, refreshing it first if it's stale.
// Returns null if there's no stored connection, or if the refresh itself
// fails (e.g. the user revoked access from their Google Account settings) —
// callers should treat that the same as "not connected".
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) return null;
  if (!isExpired(tokens)) return tokens.accessToken;
  if (!tokens.refreshToken) return null;

  try {
    const refreshed = await AuthSession.refreshAsync(
      { clientId: getGoogleClientId(), refreshToken: tokens.refreshToken },
      GOOGLE_DISCOVERY,
    );
    await saveTokens({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
      expiresAt: refreshed.expiresIn
        ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
        : null,
    });
    return refreshed.accessToken;
  } catch {
    return null;
  }
}

// see technical-specification.md §6.3 — "revokes the local token, doesn't
// affect files already saved on Drive". Revoking with Google is best-effort:
// local state is always cleared even if the network call fails.
export async function disconnectGoogleDrive(): Promise<void> {
  const tokens = await loadTokens();
  if (tokens) {
    try {
      await AuthSession.revokeAsync(
        { clientId: getGoogleClientId(), token: tokens.accessToken },
        GOOGLE_DISCOVERY,
      );
    } catch {
      // best-effort, see above
    }
  }
  await clearTokens();
  await clearAccountEmail();
}
