/**
 * Media repository — CRUD operations on the media_items table.
 * All UI reads go through here, never directly to Drive.
 */

import { getDatabase } from './database';
import type { DriveFile, MediaItem, TimelineSection } from '../types';
import { extractCaptureDate, formatSectionDate } from '../utils/dates';

// ─── Helpers ──────────────────────────────────────────────────────────

function rowToMediaItem(row: Record<string, unknown>): MediaItem {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    originalFilename: (row['original_filename'] as string) ?? null,
    mimeType: row['mime_type'] as string,
    size: (row['size'] as number) ?? null,
    md5Checksum: (row['md5_checksum'] as string) ?? null,
    driveCreatedTime: (row['drive_created_time'] as string) ?? null,
    driveModifiedTime: (row['drive_modified_time'] as string) ?? null,
    parentId: (row['parent_id'] as string) ?? null,
    thumbnailLink: (row['thumbnail_link'] as string) ?? null,
    width: (row['width'] as number) ?? null,
    height: (row['height'] as number) ?? null,
    exifTime: (row['exif_time'] as string) ?? null,
    cameraMake: (row['camera_make'] as string) ?? null,
    cameraModel: (row['camera_model'] as string) ?? null,
    durationMillis: (row['duration_millis'] as number) ?? null,
    captureDate: row['capture_date'] as string,
    captureTime: (row['capture_time'] as string) ?? null,
    dateSource: row['date_source'] as MediaItem['dateSource'],
    isFavourite: (row['is_favourite'] as number) === 1,
    syncedAt: row['synced_at'] as string,
  };
}

// ─── Upsert from Drive ───────────────────────────────────────────────

/**
 * Insert or update a media item from a Drive file.
 */
export function upsertMediaItem(file: DriveFile): void {
  const db = getDatabase();
  const { captureDate, captureTime, dateSource } = extractCaptureDate(file);
  const now = new Date().toISOString();

  db.runSync(
    `INSERT INTO media_items (
      id, name, original_filename, mime_type, size, md5_checksum,
      drive_created_time, drive_modified_time, parent_id, thumbnail_link,
      width, height, exif_time, camera_make, camera_model,
      duration_millis, capture_date, capture_time, date_source, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      original_filename = excluded.original_filename,
      mime_type = excluded.mime_type,
      size = excluded.size,
      md5_checksum = excluded.md5_checksum,
      drive_created_time = excluded.drive_created_time,
      drive_modified_time = excluded.drive_modified_time,
      parent_id = excluded.parent_id,
      thumbnail_link = excluded.thumbnail_link,
      width = excluded.width,
      height = excluded.height,
      exif_time = excluded.exif_time,
      camera_make = excluded.camera_make,
      camera_model = excluded.camera_model,
      duration_millis = excluded.duration_millis,
      capture_date = excluded.capture_date,
      capture_time = excluded.capture_time,
      date_source = excluded.date_source,
      synced_at = excluded.synced_at`,
    file.id,
    file.name,
    file.originalFilename ?? null,
    file.mimeType,
    file.size ? parseInt(file.size, 10) : null,
    file.md5Checksum ?? null,
    file.createdTime ?? null,
    file.modifiedTime ?? null,
    file.parents?.[0] ?? null,
    file.thumbnailLink ?? null,
    file.imageMediaMetadata?.width ?? file.videoMediaMetadata?.width ?? null,
    file.imageMediaMetadata?.height ?? file.videoMediaMetadata?.height ?? null,
    file.imageMediaMetadata?.time ?? null,
    file.imageMediaMetadata?.cameraMake ?? null,
    file.imageMediaMetadata?.cameraModel ?? null,
    file.videoMediaMetadata?.durationMillis
      ? parseInt(file.videoMediaMetadata.durationMillis, 10)
      : null,
    captureDate,
    captureTime,
    dateSource,
    now,
  );
}

/**
 * Batch upsert media items.
 */
export function upsertMediaItems(files: DriveFile[]): void {
  const db = getDatabase();
  db.withTransactionSync(() => {
    for (const file of files) {
      upsertMediaItem(file);
    }
  });
}

/**
 * Remove a media item by ID.
 */
export function removeMediaItem(id: string): void {
  const db = getDatabase();
  db.runSync('DELETE FROM media_items WHERE id = ?', id);
}

/**
 * Remove media items by IDs (batch).
 */
export function removeMediaItems(ids: string[]): void {
  if (ids.length === 0) return;
  const db = getDatabase();
  db.withTransactionSync(() => {
    for (const id of ids) {
      db.runSync('DELETE FROM media_items WHERE id = ?', id);
    }
  });
}

// ─── Query ────────────────────────────────────────────────────────────

/**
 * Get a single media item by ID.
 */
export function getMediaItem(id: string): MediaItem | null {
  const db = getDatabase();
  const row = db.getFirstSync<Record<string, unknown>>(
    'SELECT * FROM media_items WHERE id = ?',
    id,
  );
  return row ? rowToMediaItem(row) : null;
}

/**
 * Keyset-paginated timeline query, ordered by capture date descending.
 * Returns items for the timeline grid.
 */
export function getTimelineItems(
  limit: number,
  afterDate?: string,
  afterId?: string,
): MediaItem[] {
  const db = getDatabase();

  let query: string;
  let params: (string | number)[];

  if (afterDate && afterId) {
    // Keyset pagination: items after (date, id)
    query = `
      SELECT * FROM media_items
      WHERE (capture_date < ? OR (capture_date = ? AND id > ?))
      ORDER BY capture_date DESC, id ASC
      LIMIT ?
    `;
    params = [afterDate, afterDate, afterId, limit];
  } else {
    query = `
      SELECT * FROM media_items
      ORDER BY capture_date DESC, id ASC
      LIMIT ?
    `;
    params = [limit];
  }

  const rows = db.getAllSync<Record<string, unknown>>(query, ...params);
  return rows.map(rowToMediaItem);
}

/**
 * Get media items grouped by date for the timeline.
 */
export function getTimelineSections(
  limit: number,
  afterDate?: string,
  afterId?: string,
): TimelineSection[] {
  const items = getTimelineItems(limit, afterDate, afterId);
  const sections = new Map<string, TimelineSection>();

  for (const item of items) {
    const key = item.captureDate;
    let section = sections.get(key);
    if (!section) {
      section = {
        key,
        title: formatSectionDate(key),
        data: [],
      };
      sections.set(key, section);
    }
    section.data.push(item);
  }

  return Array.from(sections.values());
}

/**
 * Get total count of media items.
 */
export function getMediaCount(): number {
  const db = getDatabase();
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM media_items',
  );
  return row?.count ?? 0;
}

/**
 * Get all distinct capture dates (for scrollbar/scrubber).
 */
export function getDistinctDates(): string[] {
  const db = getDatabase();
  const rows = db.getAllSync<{ capture_date: string }>(
    'SELECT DISTINCT capture_date FROM media_items ORDER BY capture_date DESC',
  );
  return rows.map((r) => r.capture_date);
}

// ─── Favourites ──────────────────────────────────────────────────────

export function toggleFavourite(id: string): boolean {
  const db = getDatabase();
  const item = db.getFirstSync<{ is_favourite: number }>(
    'SELECT is_favourite FROM media_items WHERE id = ?',
    id,
  );
  if (!item) return false;

  const newValue = item.is_favourite === 1 ? 0 : 1;
  db.runSync('UPDATE media_items SET is_favourite = ? WHERE id = ?', newValue, id);
  return newValue === 1;
}

export function getFavourites(
  limit: number,
  afterDate?: string,
  afterId?: string,
): MediaItem[] {
  const db = getDatabase();

  let query: string;
  let params: (string | number)[];

  if (afterDate && afterId) {
    query = `
      SELECT * FROM media_items
      WHERE is_favourite = 1
        AND (capture_date < ? OR (capture_date = ? AND id > ?))
      ORDER BY capture_date DESC, id ASC
      LIMIT ?
    `;
    params = [afterDate, afterDate, afterId, limit];
  } else {
    query = `
      SELECT * FROM media_items
      WHERE is_favourite = 1
      ORDER BY capture_date DESC, id ASC
      LIMIT ?
    `;
    params = [limit];
  }

  const rows = db.getAllSync<Record<string, unknown>>(query, ...params);
  return rows.map(rowToMediaItem);
}

export function getFavouriteCount(): number {
  const db = getDatabase();
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM media_items WHERE is_favourite = 1',
  );
  return row?.count ?? 0;
}

// ─── Search ──────────────────────────────────────────────────────────

export interface SearchFilters {
  query?: string;
  mediaType?: 'image' | 'video';
  dateFrom?: string; // "YYYY-MM-DD"
  dateTo?: string;
  albumId?: string;
  favouritesOnly?: boolean;
}

export function searchMedia(
  filters: SearchFilters,
  limit: number,
  afterDate?: string,
  afterId?: string,
): MediaItem[] {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.query) {
    conditions.push('(name LIKE ? OR original_filename LIKE ?)');
    const like = `%${filters.query}%`;
    params.push(like, like);
  }

  if (filters.mediaType === 'image') {
    conditions.push("mime_type LIKE 'image/%'");
  } else if (filters.mediaType === 'video') {
    conditions.push("mime_type LIKE 'video/%'");
  }

  if (filters.dateFrom) {
    conditions.push('capture_date >= ?');
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push('capture_date <= ?');
    params.push(filters.dateTo);
  }

  if (filters.favouritesOnly) {
    conditions.push('is_favourite = 1');
  }

  if (filters.albumId) {
    conditions.push(
      'id IN (SELECT media_id FROM album_items WHERE album_id = ?)',
    );
    params.push(filters.albumId);
  }

  if (afterDate && afterId) {
    conditions.push('(capture_date < ? OR (capture_date = ? AND id > ?))');
    params.push(afterDate, afterDate, afterId);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT * FROM media_items
    ${whereClause}
    ORDER BY capture_date DESC, id ASC
    LIMIT ?
  `;
  params.push(limit);

  const rows = db.getAllSync<Record<string, unknown>>(query, ...params);
  return rows.map(rowToMediaItem);
}

// ─── Sync cursors ────────────────────────────────────────────────────

export function getSyncCursor(key: string): string | null {
  const db = getDatabase();
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM sync_cursors WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export function setSyncCursor(key: string, value: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.runSync(
    'INSERT OR REPLACE INTO sync_cursors (key, value, updated_at) VALUES (?, ?, ?)',
    key,
    value,
    now,
  );
}

// ─── Find by MD5 (for duplicate detection) ──────────────────────────

export function findByMd5(md5: string): MediaItem[] {
  const db = getDatabase();
  const rows = db.getAllSync<Record<string, unknown>>(
    'SELECT * FROM media_items WHERE md5_checksum = ?',
    md5,
  );
  return rows.map(rowToMediaItem);
}

/**
 * Weak duplicate check: name + size
 */
export function findByNameAndSize(
  name: string,
  size: number,
): MediaItem[] {
  const db = getDatabase();
  const rows = db.getAllSync<Record<string, unknown>>(
    'SELECT * FROM media_items WHERE name = ? AND size = ?',
    name,
    size,
  );
  return rows.map(rowToMediaItem);
}

/**
 * Clear all synced data (for re-sync). Does NOT touch albums or favourites state.
 */
export function clearAllMedia(): void {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM media_items');
    db.runSync("DELETE FROM sync_cursors WHERE key LIKE 'drive_%'");
  });
}
