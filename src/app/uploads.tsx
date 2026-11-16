import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../ThemeProvider';
import { typography, spacing, radii } from '../theme';
import type { UploadRecord } from '../types';
import {
  getAllUploads,
  getUploadStats,
  clearCompletedUploads,
} from '../data/uploadRepository';
import {
  retryUpload,
  cancelUpload,
  processNextUpload,
} from '../services/uploadService';
import { formatFileSize } from '../utils/dates';
import { EmptyState } from '../components/EmptyState';

export default function UploadsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    queued: 0,
    uploading: 0,
    failed: 0,
    done: 0,
  });

  const loadUploads = useCallback(() => {
    try {
      const all = getAllUploads();
      setUploads(all);
      setStats(getUploadStats());
    } catch (e) {
      console.warn('Failed to load uploads:', e);
    }
  }, []);

  useEffect(() => {
    loadUploads();
    const interval = setInterval(loadUploads, 2000);
    return () => clearInterval(interval);
  }, [loadUploads]);

  const handleRetry = (id: string) => {
    retryUpload(id);
    loadUploads();
    processNextUpload().catch(() => {});
  };

  const handleCancel = (id: string) => {
    cancelUpload(id);
    loadUploads();
  };

  const handleClearCompleted = () => {
    clearCompletedUploads();
    loadUploads();
  };

  const renderStateBadge = (state: UploadRecord['state']) => {
    let color = colors.secondaryLabel;
    let bg = colors.quaternaryFill;

    if (state === 'uploading') {
      color = colors.tint;
      bg = 'rgba(0, 122, 255, 0.1)';
    } else if (state === 'done') {
      color = colors.green;
      bg = 'rgba(52, 199, 89, 0.1)';
    } else if (state === 'failed') {
      color = colors.red;
      bg = 'rgba(255, 59, 48, 0.1)';
    } else if (state === 'verifying') {
      color = colors.yellow;
      bg = 'rgba(255, 204, 0, 0.1)';
    }

    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color }]}>
          {state.toUpperCase()}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Bar */}
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
          Upload Queue
        </Text>
        <Pressable
          style={styles.closeButton}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Text style={[styles.doneButtonText, { color: colors.tint }]}>
            Done
          </Text>
        </Pressable>
      </View>

      {/* Stats Summary Bar */}
      <View
        style={[
          styles.statsBar,
          {
            backgroundColor: colors.secondaryBackground,
            borderBottomColor: colors.separator,
          },
        ]}
      >
        <Text style={[styles.statsText, { color: colors.secondaryLabel }]}>
          {stats.uploading > 0 ? `${stats.uploading} uploading • ` : ''}
          {stats.queued} queued • {stats.done} completed
          {stats.failed > 0 ? ` • ${stats.failed} failed` : ''}
        </Text>

        {stats.done > 0 && (
          <Pressable onPress={handleClearCompleted} hitSlop={10}>
            <Text style={[styles.clearText, { color: colors.tint }]}>
              Clear Done
            </Text>
          </Pressable>
        )}
      </View>

      {/* Uploads List */}
      {uploads.length === 0 ? (
        <EmptyState
          iconName="cloud-upload-outline"
          title="Upload Queue Empty"
          description="When you select photos or videos to upload, their progress and verification status will be tracked here."
        />
      ) : (
        <FlashList
          data={uploads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const progress =
              item.fileSize > 0
                ? Math.min(100, Math.round((item.bytesUploaded / item.fileSize) * 100))
                : 0;

            return (
              <View
                style={[
                  styles.uploadRow,
                  { borderBottomColor: colors.separator },
                ]}
              >
                <View style={styles.iconColumn}>
                  <Ionicons
                    name={
                      item.mimeType.startsWith('video/')
                        ? 'videocam-outline'
                        : 'image-outline'
                    }
                    size={28}
                    color={colors.tint}
                  />
                </View>

                <View style={styles.infoColumn}>
                  <Text
                    style={[styles.fileName, { color: colors.label }]}
                    numberOfLines={1}
                  >
                    {item.fileName}
                  </Text>
                  <Text
                    style={[styles.fileMeta, { color: colors.secondaryLabel }]}
                  >
                    {formatFileSize(item.fileSize)}
                    {item.state === 'uploading' ? ` • ${progress}%` : ''}
                  </Text>

                  {/* Progress bar */}
                  {item.state === 'uploading' && (
                    <View
                      style={[
                        styles.progressBarBg,
                        { backgroundColor: colors.quaternaryFill },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            backgroundColor: colors.tint,
                            width: `${progress}%`,
                          },
                        ]}
                      />
                    </View>
                  )}

                  {item.errorMessage && (
                    <Text
                      style={[styles.errorText, { color: colors.red }]}
                      numberOfLines={1}
                    >
                      {item.errorMessage}
                    </Text>
                  )}
                </View>

                <View style={styles.statusColumn}>
                  {renderStateBadge(item.state)}

                  <View style={styles.rowActions}>
                    {item.state === 'failed' && (
                      <Pressable
                        onPress={() => handleRetry(item.id)}
                        hitSlop={10}
                        style={styles.retryButton}
                      >
                        <Ionicons
                          name="refresh"
                          size={18}
                          color={colors.tint}
                        />
                      </Pressable>
                    )}

                    {item.state !== 'done' && (
                      <Pressable
                        onPress={() => handleCancel(item.id)}
                        hitSlop={10}
                        style={styles.cancelButton}
                      >
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color={colors.tertiaryLabel}
                        />
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 20,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    ...typography.headline,
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: spacing.xs,
  },
  doneButtonText: {
    ...typography.headline,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
  },
  statsText: {
    ...typography.footnote,
    fontSize: 12,
  },
  clearText: {
    ...typography.footnote,
    fontSize: 12,
    fontWeight: '600',
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
  },
  iconColumn: {
    marginRight: spacing.md,
  },
  infoColumn: {
    flex: 1,
    marginRight: spacing.sm,
  },
  fileName: {
    ...typography.subheadline,
    fontWeight: '600',
    marginBottom: 2,
  },
  fileMeta: {
    ...typography.caption1,
    fontSize: 12,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  errorText: {
    ...typography.caption2,
    fontSize: 11,
    marginTop: 2,
  },
  statusColumn: {
    alignItems: 'flex-end',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  retryButton: {
    marginRight: 8,
  },
  cancelButton: {
    padding: 2,
  },
});
