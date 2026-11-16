import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { MediaItem } from '../types';
import { formatDuration, isVideo } from '../utils/dates';
import { useThemeColors } from '../ThemeProvider';

interface PhotoThumbnailProps {
  item: MediaItem;
  size: number;
  onPress: (item: MediaItem) => void;
  onLongPress?: (item: MediaItem) => void;
  isSelected?: boolean;
  isSelectionMode?: boolean;
}

export const PhotoThumbnail = memo(function PhotoThumbnail({
  item,
  size,
  onPress,
  onLongPress,
  isSelected = false,
  isSelectionMode = false,
}: PhotoThumbnailProps) {
  const colors = useThemeColors();
  const isVid = isVideo(item.mimeType);

  // Use thumbnailLink if available; otherwise placeholder color
  // In dev fixture or local cache, we use the thumbnail link or placeholder
  const imageSource = item.thumbnailLink
    ? { uri: item.thumbnailLink }
    : undefined;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor: colors.gridPlaceholder,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress?.(item)}
      delayLongPress={250}
    >
      {imageSource ? (
        <Image
          source={imageSource}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <Ionicons
            name={isVid ? 'videocam-outline' : 'image-outline'}
            size={Math.max(20, size * 0.3)}
            color={colors.tertiaryLabel}
          />
        </View>
      )}

      {/* Video duration badge — Apple Photos translucent pill */}
      {isVid && (
        <View style={styles.videoBadge}>
          <Ionicons name="play" size={10} color="#FFFFFF" style={styles.playIcon} />
          <Text style={styles.videoDurationText}>
            {formatDuration(item.durationMillis)}
          </Text>
        </View>
      )}

      {/* Favourite indicator */}
      {item.isFavourite && !isSelectionMode && (
        <View style={styles.favouriteBadge}>
          <Ionicons name="heart" size={12} color="#FFFFFF" />
        </View>
      )}

      {/* Multi-selection circle indicator */}
      {isSelectionMode && (
        <View
          style={[
            styles.selectionCircle,
            isSelected && styles.selectionCircleActive,
          ]}
        >
          {isSelected && (
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          )}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
  },
  playIcon: {
    marginRight: 3,
  },
  videoDurationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  favouriteBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 10,
    padding: 3,
  },
  selectionCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCircleActive: {
    backgroundColor: '#007AFF',
    borderColor: '#FFFFFF',
  },
});
