import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Dimensions,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../ThemeProvider';
import { typography, spacing, radii, grid } from '../../theme';
import type { Album, MediaItem } from '../../types';
import {
  getAlbum,
  getAlbumItems,
  renameAlbum,
  deleteAlbum,
  addToAlbum,
  removeFromAlbum,
} from '../../data/albumRepository';
import { getTimelineItems } from '../../data/mediaRepository';
import { PhotoThumbnail } from '../../components/PhotoThumbnail';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - grid.gap * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [album, setAlbum] = useState<Album | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [addPhotosModalVisible, setAddPhotosModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [availablePhotos, setAvailablePhotos] = useState<MediaItem[]>([]);

  const loadAlbumData = useCallback(() => {
    if (!id) return;
    const alb = getAlbum(id);
    if (alb) {
      setAlbum(alb);
      setNewTitle(alb.name);
      const albumMedia = getAlbumItems(id, 500);
      setItems(albumMedia);
    }
  }, [id]);

  useEffect(() => {
    loadAlbumData();
  }, [loadAlbumData]);

  // Rename
  const handleRename = () => {
    if (!album || !newTitle.trim()) return;
    renameAlbum(album.id, newTitle.trim());
    setRenameModalVisible(false);
    loadAlbumData();
  };

  // Delete album
  const handleDeleteAlbum = () => {
    if (!album) return;
    Alert.alert(
      'Delete Album',
      `Are you sure you want to delete "${album.name}"? Photos in this album will NOT be deleted from your library or Google Drive.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteAlbum(album.id);
            router.back();
          },
        },
      ],
    );
  };

  // Remove selected items
  const handleRemoveSelected = () => {
    if (!album || selectedIds.size === 0) return;
    removeFromAlbum(album.id, Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    loadAlbumData();
  };

  // Open add photos modal
  const openAddPhotos = () => {
    const all = getTimelineItems(200);
    const existingIds = new Set(items.map((i) => i.id));
    setAvailablePhotos(all.filter((i) => !existingIds.has(i.id)));
    setAddPhotosModalVisible(true);
  };

  const handleAddPhotos = (photoId: string) => {
    if (!album) return;
    addToAlbum(album.id, [photoId]);
    setAddPhotosModalVisible(false);
    loadAlbumData();
  };

  if (!album) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.secondaryLabel }]}>
          Album not found
        </Text>
      </View>
    );
  }

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
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={28} color={colors.tint} />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <Text
            style={[styles.headerTitle, { color: colors.label }]}
            numberOfLines={1}
          >
            {album.name}
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.secondaryLabel }]}
          >
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <Pressable
            style={styles.actionButton}
            onPress={openAddPhotos}
            hitSlop={10}
          >
            <Ionicons name="add" size={26} color={colors.tint} />
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => setRenameModalVisible(true)}
            hitSlop={10}
          >
            <Ionicons name="ellipsis-horizontal-circle" size={24} color={colors.tint} />
          </Pressable>
        </View>
      </View>

      {/* Grid */}
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.label }]}>
            No Photos in this Album
          </Text>
          <Text
            style={[styles.emptySubtitle, { color: colors.secondaryLabel }]}
          >
            Tap + to add photos from your library.
          </Text>
          <Pressable
            style={[styles.addPhotosButton, { backgroundColor: colors.tint }]}
            onPress={openAddPhotos}
          >
            <Text style={styles.addPhotosButtonText}>Add Photos</Text>
          </Pressable>

          <Pressable
            style={styles.deleteAlbumButton}
            onPress={handleDeleteAlbum}
          >
            <Text style={[styles.deleteAlbumText, { color: colors.red }]}>
              Delete Album
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={items}
          numColumns={NUM_COLUMNS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ marginRight: grid.gap, marginBottom: grid.gap }}>
              <PhotoThumbnail
                item={item}
                size={ITEM_SIZE}
                onPress={(media) => {
                  if (isSelectionMode) {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(media.id)) next.delete(media.id);
                      else next.add(media.id);
                      return next;
                    });
                  } else {
                    router.push(`/viewer/${media.id}`);
                  }
                }}
                isSelected={selectedIds.has(item.id)}
                isSelectionMode={isSelectionMode}
              />
            </View>
          )}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 40,
          }}
        />
      )}

      {/* Rename Album Modal */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.secondaryBackground },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.label }]}>
              Album Options
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.tertiaryBackground,
                  color: colors.label,
                  borderColor: colors.separator,
                },
              ]}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Album Name"
              placeholderTextColor={colors.tertiaryLabel}
            />

            <Pressable
              style={[styles.modalActionItem, { borderTopColor: colors.separator }]}
              onPress={handleRename}
            >
              <Text style={[styles.modalActionText, { color: colors.tint }]}>
                Rename Album
              </Text>
            </Pressable>

            <Pressable
              style={[styles.modalActionItem, { borderTopColor: colors.separator }]}
              onPress={() => {
                setRenameModalVisible(false);
                handleDeleteAlbum();
              }}
            >
              <Text style={[styles.modalActionText, { color: colors.red }]}>
                Delete Album
              </Text>
            </Pressable>

            <Pressable
              style={[styles.modalActionItem, { borderTopColor: colors.separator }]}
              onPress={() => setRenameModalVisible(false)}
            >
              <Text style={[styles.modalActionText, { color: colors.secondaryLabel }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Add Photos Modal */}
      <Modal
        visible={addPhotosModalVisible}
        animationType="slide"
        onRequestClose={() => setAddPhotosModalVisible(false)}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
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
              Add to Album
            </Text>
            <Pressable
              onPress={() => setAddPhotosModalVisible(false)}
              hitSlop={10}
            >
              <Text style={[styles.doneButtonText, { color: colors.tint }]}>
                Done
              </Text>
            </Pressable>
          </View>

          <FlashList
            data={availablePhotos}
            numColumns={NUM_COLUMNS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{ marginRight: grid.gap, marginBottom: grid.gap }}>
                <PhotoThumbnail
                  item={item}
                  size={ITEM_SIZE}
                  onPress={(media) => handleAddPhotos(media.id)}
                />
              </View>
            )}
            contentContainerStyle={{
              paddingBottom: insets.bottom + 20,
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notFoundText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: 100,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerTitle: {
    ...typography.headline,
    fontSize: 17,
  },
  headerSubtitle: {
    ...typography.caption2,
    fontSize: 11,
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  doneButtonText: {
    ...typography.headline,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.title2,
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.subheadline,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  addPhotosButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radii.full,
    marginBottom: spacing.lg,
  },
  addPhotosButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAlbumButton: {
    paddingVertical: 8,
  },
  deleteAlbumText: {
    fontSize: 15,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 290,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  modalTitle: {
    ...typography.headline,
    fontSize: 17,
    marginBottom: spacing.md,
  },
  modalInput: {
    width: '85%',
    height: 36,
    borderRadius: 6,
    borderWidth: 0.5,
    paddingHorizontal: 10,
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  modalActionItem: {
    width: '100%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 0.5,
  },
  modalActionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
