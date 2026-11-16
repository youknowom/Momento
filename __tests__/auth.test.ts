import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
  getAccessToken,
  refreshAccessToken,
  disconnect,
  checkAuthState,
  authFetch,
  getClientId,
  getRedirectUri,
} from '../src/services/auth';

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockAuthSession = AuthSession as jest.Mocked<typeof AuthSession>;

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
  });

  it('retrieves access token from SecureStore if not expired', async () => {
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce('valid_token_123') // access token
      .mockResolvedValueOnce((Date.now() + 100000).toString()); // future expiry

    const token = await getAccessToken();
    expect(token).toBe('valid_token_123');
  });

  it('refreshes token silently when expired', async () => {
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce('expired_token') // access token
      .mockResolvedValueOnce((Date.now() - 10000).toString()) // expired!
      .mockResolvedValueOnce('refresh_token_abc'); // refresh token call

    mockAuthSession.refreshAsync.mockResolvedValueOnce({
      accessToken: 'fresh_access_token_xyz',
      refreshToken: 'new_refresh_token_optional',
      expiresIn: 3600,
    } as any);

    const token = await getAccessToken();
    expect(token).toBe('fresh_access_token_xyz');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'dp_access_token',
      'fresh_access_token_xyz',
    );
  });

  it('disconnect revokes token and clears SecureStore', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce('token_to_revoke');

    await disconnect();

    expect(mockAuthSession.revokeAsync).toHaveBeenCalledWith(
      { token: 'token_to_revoke' },
      expect.any(Object),
    );
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalled();
  });

  it('authFetch refreshes on 401 response and retries once', async () => {
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce('maybe_bad_token') // getAccessToken
      .mockResolvedValueOnce((Date.now() + 100000).toString()) // expiry ok
      .mockResolvedValueOnce('valid_refresh_token'); // for refresh call

    // First fetch returns 401
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
      })
      // Second fetch (after refresh) returns 200
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ success: true }),
      });

    mockAuthSession.refreshAsync.mockResolvedValueOnce({
      accessToken: 'refreshed_access_token_401',
      expiresIn: 3600,
    } as any);

    const response = await authFetch('https://www.googleapis.com/drive/v3/files');
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  describe('OAuth Configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID =
        '155400204245-5ng092ij8ibr0hhmi71nprj6hm29acch.apps.googleusercontent.com';
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID =
        '155400204245-9cptte63nakr5gum69rbr9a09ss2dici.apps.googleusercontent.com';
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('selects iOS client ID on iOS', () => {
      Platform.OS = 'ios';
      expect(getClientId()).toBe(
        '155400204245-5ng092ij8ibr0hhmi71nprj6hm29acch.apps.googleusercontent.com',
      );
    });

    it('selects Android client ID on Android', () => {
      Platform.OS = 'android';
      expect(getClientId()).toBe(
        '155400204245-9cptte63nakr5gum69rbr9a09ss2dici.apps.googleusercontent.com',
      );
    });

    it('formats iOS redirect URI with reversed client ID scheme', () => {
      Platform.OS = 'ios';
      Constants.executionEnvironment = ExecutionEnvironment.Standalone;
      expect(getRedirectUri()).toBe(
        'com.googleusercontent.apps.155400204245-5ng092ij8ibr0hhmi71nprj6hm29acch:/oauth2redirect',
      );
    });

    it('uses standard scheme for non-iOS standalone environments', () => {
      Platform.OS = 'android';
      Constants.executionEnvironment = ExecutionEnvironment.Standalone;
      mockAuthSession.makeRedirectUri.mockReturnValueOnce('drivephotos://oauth');
      expect(getRedirectUri()).toBe('drivephotos://oauth');
      expect(mockAuthSession.makeRedirectUri).toHaveBeenCalledWith({
        scheme: 'drivephotos',
      });
    });

    it('uses default makeRedirectUri in Expo Go (StoreClient)', () => {
      Platform.OS = 'ios';
      Constants.executionEnvironment = ExecutionEnvironment.StoreClient;
      mockAuthSession.makeRedirectUri.mockReturnValueOnce('exp://127.0.0.1:8081');
      expect(getRedirectUri()).toBe('exp://127.0.0.1:8081');
    });
  });
});
