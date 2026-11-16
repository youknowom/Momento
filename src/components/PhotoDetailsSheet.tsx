import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MediaItem } from '../types';
import { useThemeColors } from '../ThemeProvider';
import { typography, spacing, radii } from '../theme';
import {
  formatFileSize,
  formatDuration,
  isDateEstimated,
  isVideo,
} from '../utils/dates';

interface PhotoDetailsSheetProps {
  item: MediaItem;
  visible: boolean;
  onClose: () => void;
}

export function PhotoDetailsSheet({
  item,
  visible,
  onClose,
}: PhotoDetailsSheetProps) {
  const colors = useThemeColors();
  const isVid = isVideo(item.mimeType);
  const estimatedDate = isDateEstimated(item.dateSource);

  // Compute megapixels
  const megapixels =
    item.width && item.height
      ? ((item.width * item.height) / 1_000_000).toFixed(1)
      : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.secondaryBackground },
          ]}
        >
          {/* Header handle */}
          <View style={styles.handleContainer}>
            <View
              style={[styles.handle, { backgroundColor: colors.separator }]}
            />
          </View>

          {/* Top row with close button */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.label }]}>
              Info
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={[
                styles.closeButton,
                { backgroundColor: colors.tertiaryFill },
              ]}
            >
              <Ionicons name="close" size={16} color={colors.label} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Date and Time Section */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.tertiaryBackground },
              ]}
            >
              <View style={styles.row}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.tint}
                  style={styles.icon}
                />
                <View style={styles.rowContent}>
                  <Text style={[styles.cardTitle, { color: colors.label }]}>
                    {item.captureDate}
                    {item.captureTime ? ` at ${item.captureTime}` : ''}
                  </Text>
                  {estimatedDate ? (
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: colors.quaternaryFill },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: colors.secondaryLabel },
                          ]}
                        >
                          Estimated date ({item.dateSource})
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.cardSubtitle,
                        { color: colors.secondaryLabel },
                      ]}
                    >
                      EXIF Original Capture Date
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Camera / Device Section */}
            {(item.cameraMake || item.cameraModel) && (
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.tertiaryBackground },
                ]}
              >
                <View style={styles.row}>
                  <Ionicons
                    name="camera-outline"
                    size={20}
                    color={colors.tint}
                    style={styles.icon}
                  />
                  <View style={styles.rowContent}>
                    <Text style={[styles.cardTitle, { color: colors.label }]}>
                      {[item.cameraMake, item.cameraModel]
                        .filter(Boolean)
                        .join(' ')}
                    </Text>
                    <Text
                      style={[
                        styles.cardSubtitle,
                        { color: colors.secondaryLabel },
                      ]}
                    >
                      Camera
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* File & Resolution Specifications */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.tertiaryBackground },
              ]}
            >
              <View style={styles.row}>
                <Ionicons
                  name={isVid ? 'film-outline' : 'image-outline'}
                  size={20}
                  color={colors.tint}
                  style={styles.icon}
                />
                <View style={styles.rowContent}>
                  <Text
                    style={[styles.cardTitle, { color: colors.label }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.specText,
                      { color: colors.secondaryLabel },
                    ]}
                  >
                    {[
                      megapixels ? `${megapixels} MP` : null,
                      item.width && item.height
                        ? `${item.width} × ${item.height}`
                        : null,
                      formatFileSize(item.size),
                      isVid ? formatDuration(item.durationMillis) : null,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Cloud Drive Storage Info */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.tertiaryBackground },
              ]}
            >
              <View style={styles.row}>
                <Ionicons
                  name="cloud-outline"
                  size={20}
                  color={colors.tint}
                  style={styles.icon}
                />
                <View style={styles.rowContent}>
                  <Text style={[styles.cardTitle, { color: colors.label }]}>
                    Google Drive
                  </Text>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: colors.secondaryLabel },
                    ]}
                    numberOfLines={1}
                  >
                    ID: {item.id}
                  </Text>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: colors.secondaryLabel },
                    ]}
                  >
                    MIME: {item.mimeType}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '65%',
    minHeight: 320,
    paddingBottom: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.headline,
    fontSize: 17,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  card: {
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: spacing.md,
  },
  rowContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.subheadline,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardSubtitle: {
    ...typography.footnote,
    fontSize: 12,
  },
  specText: {
    ...typography.footnote,
    fontSize: 12,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
