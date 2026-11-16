/**
 * Album repository — CRUD for local albums.
 * Albums are local-only (app albums, not Drive folders).
 */

import { getDatabase } from './database';
import type { Album, AlbumItem, MediaItem } from '../types';

function rowToAlbum(row: Record<string, unknown>): Album {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}

// ─── Album CRUD ──────────────────────────────────────────────────────

export function createAlbum(id: string, name: string): Album {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.runSync(
    'INSERT INTO albums (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
    id,
    name,
    now,
    now,
  );

  return { id, name, createdAt: now, updatedAt: now };
}

export function renameAlbum(id: string, name: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.runSync(
    'UPDATE albums SET name = ?, updated_at = ? WHERE id = ?',
    name,
    now,
    id,
  );
}

export function deleteAlbum(id: string): void {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM album_items WHERE album_id = ?', id);
    db.runSync('DELETE FROM albums WHERE id = ?', id);
  });
}

export function getAlbum(id: string): Album | null {
  const db = getDatabase();
  const row = db.getFirstSync<Record<string, unknown>>(
    'SELECT * FROM albums WHERE id = ?',
    id,
  );
  return row ? rowToAlbum(row) : null;
}

export function getAllAlbums(): Album[] {
  const db = getDatabase();
  const rows = db.getAllSync<Record<string, unknown>>(
    'SELECT * FROM albums ORDER BY updated_at DESC',
  );
  return rows.map(rowToAlbum);
}

// ─── Album Items ─────────────────────────────────────────────────────

export function addToAlbum(albumId: string, mediaIds: string[]): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.withTransactionSync(() => {
    // Get current max sort order
    const maxRow = db.getFirstSync<{ max_order: number | null }>(
      'SELECT MAX(sort_order) as max_order FROM album_items WHERE album_id = ?',
      albumId,
    );
    let sortOrder = (maxRow?.max_order ?? -1) + 1;

    for (const mediaId of mediaIds) {
      db.runSync(
        `INSERT OR IGNORE INTO album_items (album_id, media_id, added_at, sort_order)
         VALUES (?, ?, ?, ?)`,
        albumId,
        mediaId,
        now,
        sortOrder++,
      );
    }

    // Update album timestamp
    db.runSync(
      'UPDATE albums SET updated_at = ? WHERE id = ?',
      now,
      albumId,
    );
  });
}

export function removeFromAlbum(
  albumId: string,
  mediaIds: string[],
): void {
  if (mediaIds.length === 0) return;
  const db = getDatabase();

  db.withTransactionSync(() => {
    for (const mediaId of mediaIds) {
      db.runSync(
        'DELETE FROM album_items WHERE album_id = ? AND media_id = ?',
        albumId,
        mediaId,
      );
    }

    const now = new Date().toISOString();
    db.runSync(
      'UPDATE albums SET updated_at = ? WHERE id = ?',
      now,
      albumId,
    );
  });
}

export function getAlbumItems(
  albumId: string,
  limit: number,
  offset: number = 0,
): MediaItem[] {
  const db = getDatabase();
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT m.* FROM media_items m
     INNER JOIN album_items ai ON m.id = ai.media_id
     WHERE ai.album_id = ?
     ORDER BY ai.sort_order ASC
     LIMIT ? OFFSET ?`,
    albumId,
    limit,
    offset,
  );

  return rows.map((row) => ({
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
  }));
}

export function getAlbumItemCount(albumId: string): number {
  const db = getDatabase();
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM album_items WHERE album_id = ?',
    albumId,
  );
  return row?.count ?? 0;
}

/**
 * Get the first item in an album (for cover image).
 */
export function getAlbumCoverItem(albumId: string): MediaItem | null {
  const db = getDatabase();
  const row = db.getFirstSync<Record<string, unknown>>(
    `SELECT m.* FROM media_items m
     INNER JOIN album_items ai ON m.id = ai.media_id
     WHERE ai.album_id = ?
     ORDER BY ai.sort_order ASC
     LIMIT 1`,
    albumId,
  );

  if (!row) return null;

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

/**
 * Get albums that contain a specific media item.
 */
export function getAlbumsForMedia(mediaId: string): Album[] {
  const db = getDatabase();
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT a.* FROM albums a
     INNER JOIN album_items ai ON a.id = ai.album_id
     WHERE ai.media_id = ?
     ORDER BY a.name ASC`,
    mediaId,
  );
  return rows.map(rowToAlbum);
}
