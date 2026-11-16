import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  Pressable,
  RefreshControl,
  Share,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../ThemeProvider';
import { grid, typography, spacing } from '../../theme';
import type { MediaItem, TimelineSection } from '../../types';
import {
  getTimelineSections,
  getMediaCount,
  toggleFavourite,
} from '../../data/mediaRepository';
import { runSync } from '../../services/syncEngine';
import { seedFixtures } from '../../services/fixtures';
import { PhotoThumbnail } from '../../components/PhotoThumbnail';
import { TimelineHeader } from '../../components/TimelineHeader';
import {
  ViewModeSegmentedControl,
  type ViewMode,
} from '../../components/ViewModeSegmentedControl';
import { SyncStatusBar } from '../../components/SyncStatusBar';
import { EmptyState } from '../../components/EmptyState';
import { MediaPickerModal } from '../../components/MediaPickerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ListItem =
  | { type: 'header'; key: string; title: string; count: number }
  | { type: 'row'; key: string; items: MediaItem[] }
  | { type: 'footer'; key: string };

export default function LibraryScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [sections, setSections] = useState<TimelineSection[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pickerVisible, setPickerVisible] = useState(false);

  // Column calculations
  const numColumns = useMemo(() => {
    if (viewMode === 'years') return 5;
    if (viewMode === 'months') return 4;
    return grid.getColumns(SCREEN_WIDTH);
  }, [viewMode]);

  const itemSize = useMemo(() => {
    return (SCREEN_WIDTH - grid.gap * (numColumns - 1)) / numColumns;
  }, [numColumns]);

  // Load data from SQLite
  const loadData = useCallback(() => {
    try {
      const data = getTimelineSections(1500);
      setSections(data);
      setTotalCount(getMediaCount());
    } catch (e) {
      console.warn('Failed to load timeline sections:', e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pull-to-refresh sync
  const handleRefresh = async () => {
    setRefreshing(true);
    setSyncStatus('Syncing with Google Drive...');
    try {
      await runSync((progress) => {
        setSyncStatus(`Syncing: ${progress.itemsSynced} items`);
      });
      loadData();
    } catch (e) {
      // In dev mode or without credentials, refresh SQLite data
      loadData();
    } finally {
      setRefreshing(false);
      setSyncStatus(null);
    }
  };

  // Selection handlers
  const handleItemPress = (item: MediaItem) => {
    if (isSelectionMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      });
    } else {
      router.push(`/viewer/${item.id}`);
    }
  };

  const handleItemLongPress = (item: MediaItem) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds(new Set([item.id]));
    }
  };

  const handleShareSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      await Share.share({
        message: `Sharing ${selectedIds.size} photo(s) from Drive Photos`,
      });
    } catch {}
  };

  const handleFavouriteSelected = () => {
    for (const id of selectedIds) {
      toggleFavourite(id);
    }
    loadData();
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  // Flatten sections into rows for FlashList grid
  const listData = useMemo<ListItem[]>(() => {
    const list: ListItem[] = [];

    for (const section of sections) {
      // Section header
      list.push({
        type: 'header',
        key: `header_${section.key}`,
        title: section.title,
        count: section.data.length,
      });

      // Chunk items into rows
      for (let i = 0; i < section.data.length; i += numColumns) {
        const rowItems = section.data.slice(i, i + numColumns);
        list.push({
          type: 'row',
          key: `row_${section.key}_${i}`,
          items: rowItems,
        });
      }
    }

    if (list.length > 0) {
      list.push({ type: 'footer', key: 'footer' });
    }

    return list;
  }, [sections, numColumns]);

  // Video count
  const videoCount = useMemo(() => {
    let vCount = 0;
    for (const s of sections) {
      for (const item of s.data) {
        if (item.mimeType.startsWith('video/')) vCount++;
      }
    }
    return vCount;
  }, [sections]);

  const photoCount = totalCount - videoCount;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header Bar — Apple Photos style */}
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
          {isSelectionMode
            ? `${selectedIds.size} Selected`
            : 'Library'}
        </Text>

        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={() => setPickerVisible(true)}
          >
            <Ionicons name="add" size={26} color={colors.tint} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={() => {
              setIsSelectionMode(!isSelectionMode);
              setSelectedIds(new Set());
            }}
          >
            <Text style={[styles.actionButtonText, { color: colors.tint }]}>
              {isSelectionMode ? 'Done' : 'Select'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main FlashList Grid */}
      {sections.length === 0 ? (
        <EmptyState
          iconName="images-outline"
          title="No Photos"
          description="Photos and videos from your Google Drive will appear here."
          actionLabel="Upload Photos"
          onAction={() => setPickerVisible(true)}
          secondaryActionLabel="Seed Demo Fixtures (500 items)"
          onSecondaryAction={() => {
            seedFixtures({ count: 500 });
            loadData();
          }}
        />
      ) : (
        <FlashList
          data={listData}
          keyExtractor={(item) => item.key}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
            />
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <TimelineHeader
                  title={item.title}
                  count={item.count}
                />
              );
            }

            if (item.type === 'row') {
              return (
                <View style={styles.row}>
                  {item.items.map((media) => (
                    <View key={media.id} style={{ marginRight: grid.gap }}>
                      <PhotoThumbnail
                        item={media}
                        size={itemSize}
                        onPress={handleItemPress}
                        onLongPress={handleItemLongPress}
                        isSelected={selectedIds.has(media.id)}
                        isSelectionMode={isSelectionMode}
                      />
                    </View>
                  ))}
                </View>
              );
            }

            if (item.type === 'footer') {
              return (
                <SyncStatusBar
                  photoCount={photoCount}
                  videoCount={videoCount}
                  isSyncing={refreshing}
                  syncProgress={syncStatus}
                  lastSyncTime="Just Now"
                />
              );
            }

            return null;
          }}
          contentContainerStyle={{
            paddingBottom: 80,
          }}
        />
      )}

      {/* Floating Bottom ViewMode Segmented Control */}
      {!isSelectionMode && sections.length > 0 && (
        <View style={[styles.floatingPill, { bottom: insets.bottom + 12 }]}>
          <ViewModeSegmentedControl
            currentMode={viewMode}
            onModeChange={setViewMode}
          />
        </View>
      )}

      {/* Multi-selection bottom action bar */}
      {isSelectionMode && (
        <View
          style={[
            styles.selectionBottomBar,
            {
              backgroundColor: colors.secondaryBackground,
              borderTopColor: colors.separator,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <Pressable
            style={styles.selectionBarButton}
            onPress={handleShareSelected}
            disabled={selectedIds.size === 0}
          >
            <Ionicons
              name="share-outline"
              size={24}
              color={selectedIds.size === 0 ? colors.tertiaryLabel : colors.tint}
            />
          </Pressable>

          <Pressable
            style={styles.selectionBarButton}
            onPress={handleFavouriteSelected}
            disabled={selectedIds.size === 0}
          >
            <Ionicons
              name="heart-outline"
              size={24}
              color={selectedIds.size === 0 ? colors.tertiaryLabel : colors.tint}
            />
          </Pressable>
        </View>
      )}

      {/* Media Picker Modal */}
      <MediaPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onUploadEnqueued={() => loadData()}
      />
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
  },
  headerTitle: {
    ...typography.largeTitle,
    fontSize: 28,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: spacing.md,
    padding: spacing.xs,
  },
  actionButtonText: {
    ...typography.headline,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    marginBottom: grid.gap,
  },
  floatingPill: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  selectionBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  selectionBarButton: {
    padding: 8,
  },
});
