import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../ThemeProvider';
import { typography, spacing, radii } from '../theme';
import { enqueueUpload } from '../services/uploadService';
import { processNextUpload } from '../services/uploadService';

interface MediaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onUploadEnqueued?: (count: number) => void;
}

export function MediaPickerModal({
  visible,
  onClose,
  onUploadEnqueued,
}: MediaPickerModalProps) {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(false);

  const handlePickMedia = async () => {
    try {
      setLoading(true);

      // Request permissions
      const pickerPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!pickerPerm.granted) {
        Alert.alert(
          'Photo Library Access',
          'Please allow photo library access in Settings to upload photos.',
        );
        setLoading(false);
        return;
      }

      // Launch picker with multi-selection
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 1, // Original quality, unmodified
        exif: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setLoading(false);
        onClose();
        return;
      }

      let enqueuedCount = 0;
      let duplicatesFound = 0;

      for (const asset of result.assets) {
        const id = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const fileName =
          asset.fileName ??
          `upload_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`;
        const mimeType =
          asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
        const fileSize = asset.fileSize ?? 1024;

        // Try to get original asset capture date from EXIF or asset metadata
        let assetCreationDate: string | null = null;
        if (asset.exif && typeof asset.exif === 'object') {
          const exifObj = asset.exif as Record<string, unknown>;
          if (typeof exifObj['DateTimeOriginal'] === 'string') {
            assetCreationDate = exifObj['DateTimeOriginal'];
          }
        }
        if (!assetCreationDate) {
          assetCreationDate = new Date().toISOString();
        }

        const enqueueRes = await enqueueUpload({
          id,
          localAssetId: asset.assetId ?? id,
          localUri: asset.uri,
          fileName,
          mimeType,
          fileSize,
          assetCreationDate,
        });

        if (
          enqueueRes.duplicates.exact.length > 0 ||
          enqueueRes.duplicates.weak.length > 0
        ) {
          duplicatesFound++;
        }
        enqueuedCount++;
      }

      setLoading(false);
      onClose();

      if (duplicatesFound > 0) {
        Alert.alert(
          'Upload Enqueued',
          `${enqueuedCount} item(s) enqueued. ${duplicatesFound} potential duplicate(s) detected with existing items in your library.`,
        );
      } else {
        Alert.alert(
          'Upload Enqueued',
          `${enqueuedCount} item(s) added to the upload queue.`,
        );
      }

      onUploadEnqueued?.(enqueuedCount);

      // Trigger queue processing
      processNextUpload().catch(() => {});
    } catch (error) {
      setLoading(false);
      Alert.alert(
        'Upload Error',
        error instanceof Error ? error.message : 'Failed to pick media',
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.secondaryBackground },
          ]}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="cloud-upload-outline" size={36} color={colors.tint} />
          </View>
          <Text style={[styles.title, { color: colors.label }]}>
            Upload to Google Drive
          </Text>
          <Text style={[styles.subtitle, { color: colors.secondaryLabel }]}>
            Select original photos or videos from your device. Files will be uploaded
            uncompressed with capture dates preserved.
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
          ) : (
            <View style={styles.actions}>
              <Pressable
                style={[styles.primaryButton, { backgroundColor: colors.tint }]}
                onPress={handlePickMedia}
              >
                <Text style={styles.primaryButtonText}>Choose from Library</Text>
              </Pressable>

              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={[styles.cancelButtonText, { color: colors.secondaryLabel }]}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title3,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.subheadline,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  loader: {
    marginVertical: spacing.lg,
  },
  actions: {
    width: '100%',
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
