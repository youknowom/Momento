import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useThemeColors } from '../../ThemeProvider';
import { typography, spacing, radii } from '../../theme';
import type { Album, MediaItem } from '../../types';
import {
  getAllAlbums,
  createAlbum,
  getAlbumItemCount,
  getAlbumCoverItem,
} from '../../data/albumRepository';
import {
  getFavouriteCount,
  getFavourites,
} from '../../data/mediaRepository';
import { getUploadStats } from '../../data/uploadRepository';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ALBUM_CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - spacing.md) / 2;

export default function AlbumsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumCovers, setAlbumCovers] = useState<Record<string, MediaItem | null>>({});
  const [albumCounts, setAlbumCounts] = useState<Record<string, number>>({});
  const [favouriteCount, setFavouriteCount] = useState(0);
  const [uploadStats, setUploadStats] = useState({ total: 0, queued: 0, uploading: 0, failed: 0, done: 0 });

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

  const loadAlbums = useCallback(() => {
    try {
      const all = getAllAlbums();
      setAlbums(all);

      const covers: Record<string, MediaItem | null> = {};
      const counts: Record<string, number> = {};
      for (const a of all) {
        covers[a.id] = getAlbumCoverItem(a.id);
        counts[a.id] = getAlbumItemCount(a.id);
      }
      setAlbumCovers(covers);
      setAlbumCounts(counts);

      setFavouriteCount(getFavouriteCount());
      setUploadStats(getUploadStats());
    } catch (e) {
      console.warn('Failed to load albums:', e);
    }
  }, []);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  const handleCreateAlbum = () => {
    if (!newAlbumName.trim()) return;
    const id = `album_${Date.now()}`;
    createAlbum(id, newAlbumName.trim());
    setNewAlbumName('');
    setCreateModalVisible(false);
    loadAlbums();
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
          Albums
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          onPress={() => setCreateModalVisible(true)}
        >
          <Ionicons name="add" size={28} color={colors.tint} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
      >
        {/* Notice that these are app albums, not Drive folders */}
        <View
          style={[
            styles.infoBanner,
            { backgroundColor: colors.secondaryBackground },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.secondaryLabel}
            style={styles.bannerIcon}
          />
          <Text style={[styles.bannerText, { color: colors.secondaryLabel }]}>
            App albums organize your synced library locally. They do not alter
            folders in Google Drive.
          </Text>
        </View>

        {/* My Albums Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.label }]}>
            My Albums
          </Text>
        </View>

        {albums.length === 0 ? (
          <View style={styles.emptyAlbums}>
            <Text style={[styles.emptyText, { color: colors.secondaryLabel }]}>
              No albums yet. Tap + to create one.
            </Text>
          </View>
        ) : (
          <View style={styles.albumGrid}>
            {albums.map((album) => {
              const cover = albumCovers[album.id];
              const count = albumCounts[album.id] ?? 0;

              return (
                <Pressable
                  key={album.id}
                  style={styles.albumCard}
                  onPress={() => router.push(`/album/${album.id}`)}
                >
                  <View
                    style={[
                      styles.albumThumbnail,
                      { backgroundColor: colors.gridPlaceholder },
                    ]}
                  >
                    {cover?.thumbnailLink ? (
                      <Image
                        source={{ uri: cover.thumbnailLink }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <Ionicons
                        name="images-outline"
                        size={32}
                        color={colors.tertiaryLabel}
                      />
                    )}
                  </View>
                  <Text
                    style={[styles.albumName, { color: colors.label }]}
                    numberOfLines={1}
                  >
                    {album.name}
                  </Text>
                  <Text
                    style={[
                      styles.albumCount,
                      { color: colors.secondaryLabel },
                    ]}
                  >
                    {count} {count === 1 ? 'item' : 'items'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Media Types Section — Apple Photos style */}
        <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
          <Text style={[styles.sectionTitle, { color: colors.label }]}>
            Media Types
          </Text>
        </View>

        <View
          style={[
            styles.listGroup,
            {
              backgroundColor: colors.secondaryBackground,
              borderColor: colors.separator,
            },
          ]}
        >
          {/* Favourites */}
          <Pressable
            style={[styles.listRow, { borderBottomColor: colors.separator }]}
            onPress={() => router.push('/search?filter=favourites')}
          >
            <View style={styles.listRowLeft}>
              <Ionicons
                name="heart"
                size={22}
                color={colors.tint}
                style={styles.listIcon}
              />
              <Text style={[styles.listLabel, { color: colors.label }]}>
                Favourites
              </Text>
            </View>
            <View style={styles.listRowRight}>
              <Text
                style={[styles.listCount, { color: colors.secondaryLabel }]}
              >
                {favouriteCount}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.tertiaryLabel}
              />
            </View>
          </Pressable>

          {/* Videos */}
          <Pressable
            style={styles.listRow}
            onPress={() => router.push('/search?filter=videos')}
          >
            <View style={styles.listRowLeft}>
              <Ionicons
                name="videocam"
                size={22}
                color={colors.tint}
                style={styles.listIcon}
              />
              <Text style={[styles.listLabel, { color: colors.label }]}>
                Videos
              </Text>
            </View>
            <View style={styles.listRowRight}>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.tertiaryLabel}
              />
            </View>
          </Pressable>
        </View>

        {/* Utilities Section */}
        <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
          <Text style={[styles.sectionTitle, { color: colors.label }]}>
            Utilities
          </Text>
        </View>

        <View
          style={[
            styles.listGroup,
            {
              backgroundColor: colors.secondaryBackground,
              borderColor: colors.separator,
            },
          ]}
        >
          <Pressable
            style={styles.listRow}
            onPress={() => router.push('/uploads')}
          >
            <View style={styles.listRowLeft}>
              <Ionicons
                name="cloud-upload"
                size={22}
                color={colors.tint}
                style={styles.listIcon}
              />
              <Text style={[styles.listLabel, { color: colors.label }]}>
                Upload Queue
              </Text>
            </View>
            <View style={styles.listRowRight}>
              {uploadStats.queued + uploadStats.uploading > 0 && (
                <Text
                  style={[styles.listCount, { color: colors.tint, fontWeight: '600' }]}
                >
                  {uploadStats.queued + uploadStats.uploading} active
                </Text>
              )}
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.tertiaryLabel}
              />
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* New Album Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.secondaryBackground },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.label }]}>
              New Album
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                { color: colors.secondaryLabel },
              ]}
            >
              Enter a name for this album.
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.tertiaryBackground,
                  color: colors.label,
                  borderColor: colors.separator,
                },
              ]}
              placeholder="Album Name"
              placeholderTextColor={colors.tertiaryLabel}
              value={newAlbumName}
              onChangeText={setNewAlbumName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { borderRightColor: colors.separator }]}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.tint }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={styles.modalButton}
                onPress={handleCreateAlbum}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    { color: colors.tint, fontWeight: '600' },
                  ]}
                >
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  addButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerIcon: {
    marginRight: spacing.sm,
  },
  bannerText: {
    ...typography.footnote,
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.title2,
    fontSize: 20,
    fontWeight: '700',
  },
  emptyAlbums: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.subheadline,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  albumCard: {
    width: ALBUM_CARD_WIDTH,
    marginBottom: spacing.lg,
  },
  albumThumbnail: {
    width: ALBUM_CARD_WIDTH,
    height: ALBUM_CARD_WIDTH,
    borderRadius: radii.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  albumName: {
    ...typography.subheadline,
    fontWeight: '600',
    fontSize: 15,
  },
  albumCount: {
    ...typography.footnote,
    fontSize: 13,
  },
  listGroup: {
    borderRadius: radii.lg,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
  },
  listRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listIcon: {
    marginRight: spacing.md,
    width: 24,
  },
  listLabel: {
    ...typography.body,
    fontSize: 16,
  },
  listRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listCount: {
    ...typography.body,
    fontSize: 15,
    marginRight: 6,
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
    paddingTop: spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  modalTitle: {
    ...typography.headline,
    fontSize: 17,
    marginBottom: 4,
  },
  modalSubtitle: {
    ...typography.footnote,
    fontSize: 13,
    marginBottom: spacing.md,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  input: {
    width: '85%',
    height: 36,
    borderRadius: 6,
    borderWidth: 0.5,
    paddingHorizontal: 10,
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.2)',
  },
  modalButton: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.5,
  },
  modalButtonText: {
    fontSize: 17,
  },
});
