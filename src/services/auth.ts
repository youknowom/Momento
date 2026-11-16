/**
 * Authentication service using expo-auth-session with PKCE.
 *
 * Uses platform-native OAuth client types:
 * - Android: package name + SHA-1 fingerprint
 * - iOS: bundle identifier
 *
 * No client secret exists in the app. Refresh tokens are stored in SecureStore.
 * Tokens are NEVER logged.
 */

import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { GOOGLE_DISCOVERY, DRIVE_SCOPES, APP_SCHEME } from '../constants';

// Ensure browser auth session completes properly
WebBrowser.maybeCompleteAuthSession();

// ─── Keys ─────────────────────────────────────────────────────────────

const SECURE_KEYS = {
  ACCESS_TOKEN: 'dp_access_token',
  REFRESH_TOKEN: 'dp_refresh_token',
  TOKEN_EXPIRY: 'dp_token_expiry',
  USER_EMAIL: 'dp_user_email',
  USER_PHOTO: 'dp_user_photo',
} as const;

// ─── Client ID selection ─────────────────────────────────────────────

export function getClientId(): string {
  const androidId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const iosId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  if (Platform.OS === 'ios' && iosId) return iosId;
  if (Platform.OS === 'android' && androidId) return androidId;

  // Fallback
  return androidId ?? iosId ?? '';
}

export function getRedirectUri(): string {
  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (isExpoGo) {
    return AuthSession.makeRedirectUri();
  }

  // Standalone iOS builds require Google's reversed client ID scheme
  if (Platform.OS === 'ios') {
    const iosId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    if (iosId) {
      const prefix = iosId.replace('.apps.googleusercontent.com', '');
      const reversedScheme = `com.googleusercontent.apps.${prefix}`;
      return `${reversedScheme}:/oauth2redirect`;
    }
  }

  return AuthSession.makeRedirectUri({ scheme: APP_SCHEME });
}

// ─── Token management (SecureStore only) ─────────────────────────────

export async function getAccessToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
    if (!token) return null;

    // Check expiry
    const expiryStr = await SecureStore.getItemAsync(SECURE_KEYS.TOKEN_EXPIRY);
    if (expiryStr) {
      const expiry = parseInt(expiryStr, 10);
      if (Date.now() >= expiry) {
        // Token expired — try to refresh
        const refreshed = await refreshAccessToken();
        return refreshed;
      }
    }

    return token;
  } catch {
    return null;
  }
}

async function storeTokens(
  accessToken: string,
  refreshToken: string | null,
  expiresIn: number | null,
): Promise<void> {
  await SecureStore.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, accessToken);

  if (refreshToken) {
    await SecureStore.setItemAsync(SECURE_KEYS.REFRESH_TOKEN, refreshToken);
  }

  if (expiresIn) {
    const expiry = Date.now() + expiresIn * 1000 - 60000; // 1 min buffer
    await SecureStore.setItemAsync(
      SECURE_KEYS.TOKEN_EXPIRY,
      expiry.toString(),
    );
  }
}

async function clearTokens(): Promise<void> {
  await Promise.all(
    Object.values(SECURE_KEYS).map((key) =>
      SecureStore.deleteItemAsync(key).catch(() => {}),
    ),
  );
}

// ─── Refresh ─────────────────────────────────────────────────────────

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await SecureStore.getItemAsync(
      SECURE_KEYS.REFRESH_TOKEN,
    );
    if (!refreshToken) return null;

    const result = await AuthSession.refreshAsync(
      {
        clientId: getClientId(),
        refreshToken,
      },
      GOOGLE_DISCOVERY,
    );

    if (result.accessToken) {
      await storeTokens(
        result.accessToken,
        result.refreshToken ?? null,
        result.expiresIn ?? null,
      );
      return result.accessToken;
    }

    return null;
  } catch {
    // Refresh failed — user needs to re-authenticate
    return null;
  }
}

// ─── Exchange code ───────────────────────────────────────────────────

export async function exchangeCode(
  code: string,
  codeVerifier: string,
): Promise<{ accessToken: string; email: string | null }> {
  const result = await AuthSession.exchangeCodeAsync(
    {
      code,
      clientId: getClientId(),
      redirectUri: getRedirectUri(),
      extraParams: {
        code_verifier: codeVerifier,
      },
    },
    GOOGLE_DISCOVERY,
  );

  if (!result.accessToken) {
    throw new Error('Failed to exchange code for tokens');
  }

  await storeTokens(
    result.accessToken,
    result.refreshToken ?? null,
    result.expiresIn ?? null,
  );

  // Fetch user info
  let email: string | null = null;
  let photo: string | null = null;
  try {
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${result.accessToken}` },
      },
    );
    if (userInfoResponse.ok) {
      const userInfo = (await userInfoResponse.json()) as {
        email?: string;
        picture?: string;
      };
      email = userInfo.email ?? null;
      photo = userInfo.picture ?? null;

      if (email) {
        await SecureStore.setItemAsync(SECURE_KEYS.USER_EMAIL, email);
      }
      if (photo) {
        await SecureStore.setItemAsync(SECURE_KEYS.USER_PHOTO, photo);
      }
    }
  } catch {
    // Non-critical
  }

  return { accessToken: result.accessToken, email };
}

// ─── Auth request hook config ────────────────────────────────────────

export function getAuthRequestConfig(): AuthSession.AuthRequestConfig {
  return {
    clientId: getClientId(),
    scopes: [...DRIVE_SCOPES],
    redirectUri: getRedirectUri(),
    usePKCE: true,
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  };
}

export { GOOGLE_DISCOVERY as discovery };

// ─── Disconnect (revoke token) ───────────────────────────────────────

export async function disconnect(): Promise<void> {
  try {
    const accessToken = await SecureStore.getItemAsync(
      SECURE_KEYS.ACCESS_TOKEN,
    );

    if (accessToken) {
      // Revoke the token
      await AuthSession.revokeAsync(
        { token: accessToken },
        GOOGLE_DISCOVERY,
      );
    }
  } catch {
    // Continue with local cleanup even if revocation fails
  } finally {
    await clearTokens();
  }
}

// ─── Check auth state ────────────────────────────────────────────────

export async function checkAuthState(): Promise<{
  isAuthenticated: boolean;
  email: string | null;
  photo: string | null;
}> {
  try {
    const token = await getAccessToken();
    const email = await SecureStore.getItemAsync(SECURE_KEYS.USER_EMAIL);
    const photo = await SecureStore.getItemAsync(SECURE_KEYS.USER_PHOTO);

    return {
      isAuthenticated: token !== null,
      email,
      photo,
    };
  } catch {
    return { isAuthenticated: false, email: null, photo: null };
  }
}

/**
 * Get an authenticated fetch function that handles token refresh.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  let token = await getAccessToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  // If 401, try refreshing the token once
  if (response.status === 401) {
    token = await refreshAccessToken();
    if (!token) {
      throw new Error('Authentication expired. Please sign in again.');
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return response;
}
