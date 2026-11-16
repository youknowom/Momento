import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useThemeColors } from '../ThemeProvider';
import { typography, spacing } from '../theme';

interface SyncStatusBarProps {
  photoCount: number;
  videoCount: number;
  isSyncing?: boolean;
  syncProgress?: string | null;
  lastSyncTime?: string | null;
  errorMessage?: string | null;
}

export const SyncStatusBar = memo(function SyncStatusBar({
  photoCount,
  videoCount,
  isSyncing = false,
  syncProgress,
  lastSyncTime,
  errorMessage,
}: SyncStatusBarProps) {
  const colors = useThemeColors();

  const countsText = [
    photoCount > 0 ? `${photoCount.toLocaleString()} Photo${photoCount === 1 ? '' : 's'}` : null,
    videoCount > 0 ? `${videoCount.toLocaleString()} Video${videoCount === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={styles.container}>
      <Text style={[styles.countsText, { color: colors.label }]}>
        {countsText || 'No Items'}
      </Text>

      {isSyncing ? (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={colors.tint} style={styles.spinner} />
          <Text style={[styles.statusText, { color: colors.secondaryLabel }]}>
            {syncProgress ?? 'Syncing with Google Drive...'}
          </Text>
        </View>
      ) : errorMessage ? (
        <Text style={[styles.statusText, { color: colors.red }]}>
          {errorMessage}
        </Text>
      ) : lastSyncTime ? (
        <Text style={[styles.statusText, { color: colors.secondaryLabel }]}>
          Updated {lastSyncTime}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countsText: {
    ...typography.headline,
    fontSize: 15,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  spinner: {
    marginRight: 6,
    transform: [{ scale: 0.8 }],
  },
  statusText: {
    ...typography.footnote,
    fontSize: 12,
  },
});
