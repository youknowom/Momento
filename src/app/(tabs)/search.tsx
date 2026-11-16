import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../ThemeProvider';
import { typography, spacing, radii, grid } from '../../theme';
import type { MediaItem } from '../../types';
import { searchMedia } from '../../data/mediaRepository';
import { PhotoThumbnail } from '../../components/PhotoThumbnail';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - grid.gap * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

export default function SearchScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ filter?: string }>();

  const [query, setQuery] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [results, setResults] = useState<MediaItem[]>([]);

  useEffect(() => {
    if (params.filter === 'favourites') {
      setFavouritesOnly(true);
    } else if (params.filter === 'videos') {
      setMediaTypeFilter('video');
    }
  }, [params.filter]);

  const executeSearch = useCallback(() => {
    try {
      const items = searchMedia(
        {
          query: query.trim() || undefined,
          mediaType: mediaTypeFilter === 'all' ? undefined : mediaTypeFilter,
          favouritesOnly: favouritesOnly || undefined,
        },
        500,
      );
      setResults(items);
    } catch (e) {
      console.warn('Search error:', e);
    }
  }, [query, mediaTypeFilter, favouritesOnly]);

  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Header Bar */}
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
          Search
        </Text>

        {/* Apple Photos search input pill */}
        <View
          style={[
            styles.searchPill,
            { backgroundColor: colors.secondaryBackground },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={colors.tertiaryLabel}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.label }]}
            placeholder="Photos, Videos, or File Name"
            placeholderTextColor={colors.tertiaryLabel}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.tertiaryLabel}
              />
            </Pressable>
          )}
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          <Pressable
            style={[
              styles.chip,
              {
                backgroundColor:
                  mediaTypeFilter === 'all' && !favouritesOnly
                    ? colors.tint
                    : colors.secondaryBackground,
              },
            ]}
            onPress={() => {
              setMediaTypeFilter('all');
              setFavouritesOnly(false);
            }}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color:
                    mediaTypeFilter === 'all' && !favouritesOnly
                      ? '#FFFFFF'
                      : colors.label,
                },
              ]}
            >
              All
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.chip,
              {
                backgroundColor:
                  mediaTypeFilter === 'image'
                    ? colors.tint
                    : colors.secondaryBackground,
              },
            ]}
            onPress={() => {
              setMediaTypeFilter(mediaTypeFilter === 'image' ? 'all' : 'image');
            }}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color:
                    mediaTypeFilter === 'image' ? '#FFFFFF' : colors.label,
                },
              ]}
            >
              Photos
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.chip,
              {
                backgroundColor:
                  mediaTypeFilter === 'video'
                    ? colors.tint
                    : colors.secondaryBackground,
              },
            ]}
            onPress={() => {
              setMediaTypeFilter(mediaTypeFilter === 'video' ? 'all' : 'video');
            }}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color:
                    mediaTypeFilter === 'video' ? '#FFFFFF' : colors.label,
                },
              ]}
            >
              Videos
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.chip,
              {
                backgroundColor: favouritesOnly
                  ? colors.tint
                  : colors.secondaryBackground,
              },
            ]}
            onPress={() => setFavouritesOnly(!favouritesOnly)}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: favouritesOnly ? '#FFFFFF' : colors.label,
                },
              ]}
            >
              Favourites
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Results Count */}
      <View style={styles.resultCountRow}>
        <Text style={[styles.resultCountText, { color: colors.secondaryLabel }]}>
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </Text>
      </View>

      {/* Results Grid */}
      <FlashList
        data={results}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginRight: grid.gap, marginBottom: grid.gap }}>
            <PhotoThumbnail
              item={item}
              size={ITEM_SIZE}
              onPress={(media) => router.push(`/viewer/${media.id}`)}
            />
          </View>
        )}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 80,
        }}
      />
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
    marginBottom: spacing.sm,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  filterRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    marginRight: spacing.sm,
  },
  chipText: {
    ...typography.footnote,
    fontWeight: '600',
  },
  resultCountRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  resultCountText: {
    ...typography.footnote,
    fontSize: 12,
  },
});
