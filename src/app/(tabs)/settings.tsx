import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as AuthSession from 'expo-auth-session';
import { useThemeColors } from '../../ThemeProvider';
import { typography, spacing, radii } from '../../theme';
import {
  APP_NAME,
  DEFAULT_UPLOAD_FOLDER,
  USE_DEV_FIXTURES,
} from '../../constants';
import {
  checkAuthState,
  disconnect,
  getAuthRequestConfig,
  discovery,
  exchangeCode,
} from '../../services/auth';
import {
  getCacheSize,
  clearCache,
} from '../../services/cacheManager';
import { runSync, fullReset } from '../../services/syncEngine';
import { seedFixtures, clearFixtures } from '../../services/fixtures';
import { getMediaCount } from '../../data/mediaRepository';
import { formatFileSize } from '../../utils/dates';

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [auth, setAuth] = useState<{
    isAuthenticated: boolean;
    email: string | null;
    photo: string | null;
  }>({
    isAuthenticated: false,
    email: null,
    photo: null,
  });

  const [cacheInfo, setCacheInfo] = useState<{
    thumbnails: number;
    originals: number;
    total: number;
  }>({
    thumbnails: 0,
    originals: 0,
    total: 0,
  });

  const [mediaCount, setMediaCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [uploadFolder, setUploadFolder] = useState(DEFAULT_UPLOAD_FOLDER);

  // Setup auth request hook
  const authConfig = getAuthRequestConfig();
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    authConfig,
    discovery,
  );

  // Load state
  const loadState = useCallback(async () => {
    try {
      const authState = await checkAuthState();
      setAuth(authState);

      const cache = await getCacheSize();
      setCacheInfo(cache);

      setMediaCount(getMediaCount());
    } catch (e) {
      console.warn('Failed to load settings state:', e);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Handle OAuth code response
  useEffect(() => {
    if (response?.type === 'success' && response.params['code'] && request?.codeVerifier) {
      exchangeCode(response.params['code'], request.codeVerifier)
        .then(() => {
          Alert.alert('Signed In', 'Successfully connected your Google Drive.');
          loadState();
        })
        .catch((err) => {
          Alert.alert('Sign In Failed', err.message);
        });
    }
  }, [response, request, loadState]);

  // Handle Disconnect
  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Google Drive',
      'This will revoke tokens and sign out. Synced photos will remain in SQLite until cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnect();
            loadState();
          },
        },
      ],
    );
  };

  // Handle Sync Now
  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncProgress('Starting sync...');
    try {
      const result = await runSync((p) => {
        setSyncProgress(`Synced ${p.itemsSynced} items`);
      });
      Alert.alert(
        'Sync Complete',
        `Synced ${result.itemsSynced} items across ${result.pagesProcessed} page(s).`,
      );
    } catch (e) {
      Alert.alert('Sync Notice', e instanceof Error ? e.message : 'Sync interrupted');
    } finally {
      setSyncing(false);
      setSyncProgress(null);
      loadState();
    }
  };

  // Handle Clear Cache
  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This deletes local thumbnail and original caches. It will NEVER touch your Google Drive or local albums.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearCache();
            loadState();
            Alert.alert('Cache Cleared', 'Local cache has been cleared.');
          },
        },
      ],
    );
  };

  // Handle Clear Database
  const handleResetLibrary = () => {
    Alert.alert(
      'Reset Library',
      'This deletes all synced photo metadata from your local database. Your Google Drive files will NOT be touched.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            fullReset();
            loadState();
            Alert.alert('Library Reset', 'Local metadata database has been cleared.');
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: colors.separator,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.label }]}>
          Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
      >
        {/* Account Section */}
        <Text style={[styles.sectionTitle, { color: colors.secondaryLabel }]}>
          GOOGLE ACCOUNT
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.secondaryBackground,
              borderColor: colors.separator,
            },
          ]}
        >
          {auth.isAuthenticated ? (
            <View style={styles.accountRow}>
              {auth.photo ? (
                <Image source={{ uri: auth.photo }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: colors.tint },
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {auth.email?.[0]?.toUpperCase() ?? 'U'}
                  </Text>
                </View>
              )}
              <View style={styles.accountInfo}>
                <Text
                  style={[styles.accountEmail, { color: colors.label }]}
                  numberOfLines={1}
                >
                  {auth.email ?? 'Google Drive Connected'}
                </Text>
                <Text
                  style={[
                    styles.accountStatus,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  OAuth PKCE • Read-Only & File Scope
                </Text>
              </View>
              <Pressable
                style={styles.disconnectButton}
                onPress={handleDisconnect}
              >
                <Text style={[styles.disconnectText, { color: colors.red }]}>
                  Disconnect
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.signInRow}>
              <View style={styles.signInInfo}>
                <Text style={[styles.signInTitle, { color: colors.label }]}>
                  Not Connected
                </Text>
                <Text
                  style={[
                    styles.signInDesc,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  Connect your Google Drive to browse photos and videos.
                </Text>
              </View>
              <Pressable
                style={[styles.signInButton, { backgroundColor: colors.tint }]}
                onPress={() => promptAsync()}
                disabled={!request}
              >
                <Text style={styles.signInButtonText}>Sign In</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Library & Sync Section */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.secondaryLabel, marginTop: spacing.xl },
          ]}
        >
          LIBRARY & SYNC
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.secondaryBackground,
              borderColor: colors.separator,
            },
          ]}
        >
          <View style={[styles.row, { borderBottomColor: colors.separator }]}>
            <Text style={[styles.rowLabel, { color: colors.label }]}>
              Synced Media Items
            </Text>
            <Text
              style={[styles.rowValue, { color: colors.secondaryLabel }]}
            >
              {mediaCount.toLocaleString()} items
            </Text>
          </View>

          <Pressable
            style={[styles.actionRow, { borderBottomColor: colors.separator }]}
            onPress={handleSyncNow}
            disabled={syncing}
          >
            <Text style={[styles.actionRowLabel, { color: colors.tint }]}>
              {syncing ? syncProgress ?? 'Syncing...' : 'Sync with Drive Now'}
            </Text>
            {syncing && (
              <ActivityIndicator size="small" color={colors.tint} />
            )}
          </Pressable>

          <Pressable style={styles.actionRow} onPress={handleResetLibrary}>
            <Text style={[styles.actionRowLabel, { color: colors.red }]}>
              Reset Local Library Metadata
            </Text>
          </Pressable>
        </View>

        {/* Cache Section */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.secondaryLabel, marginTop: spacing.xl },
          ]}
        >
          STORAGE & CACHE
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.secondaryBackground,
              borderColor: colors.separator,
            },
          ]}
        >
          <View style={[styles.row, { borderBottomColor: colors.separator }]}>
            <Text style={[styles.rowLabel, { color: colors.label }]}>
              Thumbnail Cache
            </Text>
            <Text
              style={[styles.rowValue, { color: colors.secondaryLabel }]}
            >
              {formatFileSize(cacheInfo.thumbnails)}
            </Text>
          </View>
          <View style={[styles.row, { borderBottomColor: colors.separator }]}>
            <Text style={[styles.rowLabel, { color: colors.label }]}>
              Originals Cache (LRU capped)
            </Text>
            <Text
              style={[styles.rowValue, { color: colors.secondaryLabel }]}
            >
              {formatFileSize(cacheInfo.originals)}
            </Text>
          </View>
          <View style={[styles.row, { borderBottomColor: colors.separator }]}>
            <Text
              style={[
                styles.rowLabel,
                { color: colors.label, fontWeight: '600' },
              ]}
            >
              Total Local Cache
            </Text>
            <Text
              style={[
                styles.rowValue,
                { color: colors.label, fontWeight: '600' },
              ]}
            >
              {formatFileSize(cacheInfo.total)}
            </Text>
          </View>

          <Pressable style={styles.actionRow} onPress={handleClearCache}>
            <Text style={[styles.actionRowLabel, { color: colors.tint }]}>
              Clear Cache
            </Text>
          </Pressable>
        </View>

        {/* Upload Settings */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.secondaryLabel, marginTop: spacing.xl },
          ]}
        >
          UPLOAD PREFERENCES
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.secondaryBackground,
              borderColor: colors.separator,
            },
          ]}
        >
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.label }]}>
              Drive Upload Folder
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.label,
                  backgroundColor: colors.tertiaryBackground,
                },
              ]}
              value={uploadFolder}
              onChangeText={setUploadFolder}
            />
          </View>
        </View>

        {/* Dev Fixtures (Gated) */}
        {USE_DEV_FIXTURES && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.secondaryLabel, marginTop: spacing.xl },
              ]}
            >
              DEVELOPER FIXTURES
            </Text>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.secondaryBackground,
                  borderColor: colors.separator,
                },
              ]}
            >
              <Pressable
                style={[
                  styles.actionRow,
                  { borderBottomColor: colors.separator },
                ]}
                onPress={() => {
                  seedFixtures({ count: 500 });
                  loadState();
                  Alert.alert('Seeded', 'Seeded 500 demo items into SQLite.');
                }}
              >
                <Text style={[styles.actionRowLabel, { color: colors.tint }]}>
                  Seed 500 Demo Items
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.actionRow,
                  { borderBottomColor: colors.separator },
                ]}
                onPress={() => {
                  seedFixtures({ count: 10_000 });
                  loadState();
                  Alert.alert(
                    'Seeded',
                    'Seeded 10,000 items into SQLite for performance stress testing.',
                  );
                }}
              >
                <Text style={[styles.actionRowLabel, { color: colors.tint }]}>
                  Seed 10,000 Items (Performance Benchmark)
                </Text>
              </Pressable>

              <Pressable style={styles.actionRow} onPress={() => {
                clearFixtures();
                loadState();
                Alert.alert('Cleared', 'Cleared fixture items.');
              }}>
                <Text style={[styles.actionRowLabel, { color: colors.red }]}>
                  Clear Fixtures
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Privacy & Safety Explanation */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.secondaryLabel, marginTop: spacing.xl },
          ]}
        >
          PRIVACY & SAFETY
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.secondaryBackground,
              borderColor: colors.separator,
              padding: spacing.md,
            },
          ]}
        >
          <Text
            style={[
              styles.privacyText,
              { color: colors.secondaryLabel, marginBottom: spacing.sm },
            ]}
          >
            • <Text style={{ fontWeight: '600', color: colors.label }}>Local vs. Remote:</Text> Only
            metadata (dates, dimensions, filenames) and temporary image caches are stored
            on your device in SQLite and file cache. All original photos and videos remain safely in
            Google Drive.
          </Text>
          <Text
            style={[
              styles.privacyText,
              { color: colors.secondaryLabel, marginBottom: spacing.sm },
            ]}
          >
            • <Text style={{ fontWeight: '600', color: colors.label }}>No 3rd Party Telemetry:</Text> No
            external backend, Firebase, Supabase, or telemetry services are used.
          </Text>
          <Text
            style={[
              styles.privacyText,
              { color: colors.secondaryLabel, marginBottom: spacing.sm },
            ]}
          >
            • <Text style={{ fontWeight: '600', color: colors.label }}>Security:</Text> Tokens are
            stored exclusively in your device's hardware-backed SecureStore and are never logged.
          </Text>
          <Text style={[styles.privacyText, { color: colors.secondaryLabel }]}>
            • <Text style={{ fontWeight: '600', color: colors.label }}>No File Deletion in v1:</Text> Drive
            Photos will never delete files from Google Drive or local storage.
          </Text>
        </View>

        {/* Version info */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.tertiaryLabel }]}>
            {APP_NAME} v1.0.0
          </Text>
          <Text style={[styles.versionText, { color: colors.tertiaryLabel }]}>
            Independent personal cloud photo client
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.largeTitle,
    fontSize: 28,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    ...typography.caption1,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  accountInfo: {
    flex: 1,
  },
  accountEmail: {
    ...typography.headline,
    fontSize: 16,
  },
  accountStatus: {
    ...typography.caption2,
    marginTop: 2,
  },
  disconnectButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  disconnectText: {
    fontSize: 14,
    fontWeight: '600',
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  signInInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  signInTitle: {
    ...typography.headline,
    fontSize: 16,
    marginBottom: 2,
  },
  signInDesc: {
    ...typography.footnote,
    fontSize: 13,
  },
  signInButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radii.md,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
  },
  rowLabel: {
    ...typography.body,
    fontSize: 15,
  },
  rowValue: {
    ...typography.body,
    fontSize: 15,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
  },
  actionRowLabel: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '500',
  },
  input: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 14,
    minWidth: 160,
    textAlign: 'right',
  },
  privacyText: {
    ...typography.footnote,
    fontSize: 13,
    lineHeight: 18,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
  versionText: {
    ...typography.caption1,
    fontSize: 12,
    marginBottom: 2,
  },
});
