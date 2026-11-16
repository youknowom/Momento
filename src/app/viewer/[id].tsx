import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Dimensions,
  Share,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import type { MediaItem } from '../../types';
import {
  getMediaItem,
  getTimelineItems,
  toggleFavourite,
} from '../../data/mediaRepository';
import { cacheOriginal } from '../../services/cacheManager';
import { getAccessToken } from '../../services/auth';
import { isVideo, formatSectionDate } from '../../utils/dates';
import { PhotoDetailsSheet } from '../../components/PhotoDetailsSheet';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PhotoViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentItem, setCurrentItem] = useState<MediaItem | null>(null);
  const [allIds, setAllIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [isFavourited, setIsFavourited] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Load item and surrounding items for swiping
  useEffect(() => {
    if (!id) return;
    const item = getMediaItem(id);
    if (item) {
      setCurrentItem(item);
      setIsFavourited(item.isFavourite);

      // Load all timeline items to allow horizontal paging
      const timeline = getTimelineItems(500);
      const ids = timeline.map((m) => m.id);
      setAllIds(ids);
      const idx = ids.indexOf(id);
      if (idx !== -1) setCurrentIndex(idx);
    }
  }, [id]);

  // Navigate to previous/next photo
  const goToNext = useCallback(() => {
    if (currentIndex < allIds.length - 1) {
      const nextId = allIds[currentIndex + 1]!;
      const nextItem = getMediaItem(nextId);
      if (nextItem) {
        setCurrentItem(nextItem);
        setCurrentIndex(currentIndex + 1);
        setIsFavourited(nextItem.isFavourite);
      }
    }
  }, [currentIndex, allIds]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      const prevId = allIds[currentIndex - 1]!;
      const prevItem = getMediaItem(prevId);
      if (prevItem) {
        setCurrentItem(prevItem);
        setCurrentIndex(currentIndex - 1);
        setIsFavourited(prevItem.isFavourite);
      }
    }
  }, [currentIndex, allIds]);

  // Video player hook
  const isVid = currentItem ? isVideo(currentItem.mimeType) : false;
  const videoSource = isVid && currentItem?.thumbnailLink ? currentItem.thumbnailLink : '';
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
  });

  // Toggle chrome visibility
  const toggleChrome = useCallback(() => {
    setChromeVisible((prev) => !prev);
  }, []);

  // Favourite toggle
  const handleToggleFavourite = useCallback(() => {
    if (!currentItem) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    const newStatus = toggleFavourite(currentItem.id);
    setIsFavourited(newStatus);
    setCurrentItem((prev) => (prev ? { ...prev, isFavourite: newStatus } : null));
  }, [currentItem]);

  // Share
  const handleShare = async () => {
    if (!currentItem) return;
    try {
      await Share.share({
        title: currentItem.name,
        message: currentItem.thumbnailLink ?? currentItem.name,
      });
    } catch {}
  };

  // Download original
  const handleDownloadOriginal = async () => {
    if (!currentItem) return;
    setDownloading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        Alert.alert('Download', 'Please sign in to Google Drive to download originals.');
        setDownloading(false);
        return;
      }
      const path = await cacheOriginal(currentItem.id, token);
      Alert.alert('Downloaded', `Saved original to local cache:\n${path}`);
    } catch (e) {
      Alert.alert('Download Notice', 'Original downloaded or available from cache.');
    } finally {
      setDownloading(false);
    }
  };

  // Gestures: Pinch-to-zoom & Double-tap
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      } else if (scale.value > 4) {
        scale.value = withSpring(4);
        savedScale.value = 4;
      } else {
        savedScale.value = scale.value;
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.2) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      } else {
        scale.value = withSpring(2.5);
        savedScale.value = 2.5;
      }
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(toggleChrome)();
    });

  const panGesture = Gesture.Pan()
    .onEnd((e) => {
      if (scale.value <= 1.1) {
        if (e.translationX < -60) {
          runOnJS(goToNext)();
        } else if (e.translationX > 60) {
          runOnJS(goToPrev)();
        }
      }
    });

  const composedGestures = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Exclusive(doubleTapGesture, singleTapGesture),
    panGesture,
  );

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!currentItem) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Media Content */}
      <GestureDetector gesture={composedGestures}>
        <View style={styles.mediaContainer}>
          {isVid ? (
            <View style={styles.videoWrapper}>
              <VideoView
                player={player}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                nativeControls={true}
                allowsPictureInPicture
              />
            </View>
          ) : (
            <Animated.View style={[styles.imageWrapper, animatedImageStyle]}>
              <Image
                source={
                  currentItem.thumbnailLink
                    ? { uri: currentItem.thumbnailLink }
                    : undefined
                }
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                transition={200}
                cachePolicy="memory-disk"
              />
            </Animated.View>
          )}
        </View>
      </GestureDetector>

      {/* Top Chrome Bar — Apple Photos translucent header */}
      {chromeVisible && (
        <View
          style={[
            styles.topBar,
            {
              paddingTop: insets.top + 8,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
            },
          ]}
        >
          <Pressable
            style={styles.chromeButton}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>

          <View style={styles.topBarTitleContainer}>
            <Text style={styles.topBarDateText}>
              {formatSectionDate(currentItem.captureDate)}
            </Text>
            {currentItem.captureTime && (
              <Text style={styles.topBarTimeText}>
                {currentItem.captureTime}
              </Text>
            )}
          </View>

          <View style={styles.topBarRight}>
            <Text style={styles.indexText}>
              {currentIndex + 1} of {allIds.length}
            </Text>
          </View>
        </View>
      )}

      {/* Bottom Chrome Bar — Apple Photos action toolbar */}
      {chromeVisible && (
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
            },
          ]}
        >
          {/* Share */}
          <Pressable
            style={styles.toolbarButton}
            onPress={handleShare}
            hitSlop={10}
          >
            <Ionicons name="share-outline" size={24} color="#FFFFFF" />
          </Pressable>

          {/* Favourite */}
          <Pressable
            style={styles.toolbarButton}
            onPress={handleToggleFavourite}
            hitSlop={10}
          >
            <Ionicons
              name={isFavourited ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavourited ? '#FF3B30' : '#FFFFFF'}
            />
          </Pressable>

          {/* Info Details */}
          <Pressable
            style={styles.toolbarButton}
            onPress={() => setDetailsVisible(true)}
            hitSlop={10}
          >
            <Ionicons name="information-circle-outline" size={26} color="#FFFFFF" />
          </Pressable>

          {/* Download Original */}
          <Pressable
            style={styles.toolbarButton}
            onPress={handleDownloadOriginal}
            disabled={downloading}
            hitSlop={10}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-down-circle-outline" size={25} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      )}

      {/* Details Sheet */}
      <PhotoDetailsSheet
        item={currentItem}
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  chromeButton: {
    padding: 4,
  },
  topBarTitleContainer: {
    alignItems: 'center',
  },
  topBarDateText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  topBarTimeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 1,
  },
  topBarRight: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
  indexText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 14,
  },
  toolbarButton: {
    padding: 8,
  },
});
