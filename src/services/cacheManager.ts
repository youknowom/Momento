/**
 * Thumbnail and original cache manager.
 *
 * Caches thumbnail bytes on disk keyed by file ID + modifiedTime.
 * On expiry (403), re-fetches file metadata for a fresh thumbnailLink.
 * Originals are cached with an LRU size cap.
 *
 * Cache clearing never touches Drive or uploaded data.
 */

import * as FileSystem from 'expo-file-system';
import { THUMBNAIL_CACHE_DIR, ORIGINAL_CACHE_DIR, DEFAULT_ORIGINAL_CACHE_SIZE_MB } from '../constants';
import * as driveClient from './driveClient';

const cacheRoot = (FileSystem as any).cacheDirectory ?? (FileSystem.Paths ? `${FileSystem.Paths.cache.uri}/` : 'file:///cache/');
const THUMB_BASE = `${cacheRoot}${THUMBNAIL_CACHE_DIR}/`;
const ORIGINAL_BASE = `${cacheRoot}${ORIGINAL_CACHE_DIR}/`;

// ─── Init ─────────────────────────────────────────────────────────────

async function ensureDirs(): Promise<void> {
  const thumbInfo = await FileSystem.getInfoAsync(THUMB_BASE);
  if (!thumbInfo.exists) {
    await FileSystem.makeDirectoryAsync(THUMB_BASE, { intermediates: true });
  }

  const origInfo = await FileSystem.getInfoAsync(ORIGINAL_BASE);
  if (!origInfo.exists) {
    await FileSystem.makeDirectoryAsync(ORIGINAL_BASE, { intermediates: true });
  }
}

let dirsReady: Promise<void> | null = null;
function ready(): Promise<void> {
  if (!dirsReady) {
    dirsReady = ensureDirs();
  }
  return dirsReady;
}

// ─── Thumbnail cache ─────────────────────────────────────────────────

function thumbKey(fileId: string, modifiedTime: string | null): string {
  const mod = modifiedTime ? modifiedTime.replace(/[:.]/g, '-') : 'unknown';
  return `${fileId}_${mod}`;
}

/**
 * Get the local path for a cached thumbnail.
 * Returns null if not cached.
 */
export async function getCachedThumbnailPath(
  fileId: string,
  modifiedTime: string | null,
): Promise<string | null> {
  await ready();
  const path = `${THUMB_BASE}${thumbKey(fileId, modifiedTime)}.jpg`;
  const info = await FileSystem.getInfoAsync(path);
  return info.exists ? path : null;
}

/**
 * Cache a thumbnail from a Drive thumbnailLink.
 * Returns the local file path.
 *
 * If the link returns 403, re-fetches file metadata for a fresh link.
 */
export async function cacheThumbnail(
  fileId: string,
  thumbnailLink: string,
  modifiedTime: string | null,
  accessToken: string,
  size: number = 400,
): Promise<string> {
  await ready();
  const path = `${THUMB_BASE}${thumbKey(fileId, modifiedTime)}.jpg`;

  // Check if already cached
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) return path;

  // Resize the thumbnail link for a larger preview
  const resizedLink = driveClient.resizeThumbnailLink(thumbnailLink, size);

  try {
    const result = await FileSystem.downloadAsync(resizedLink, path, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (result.status === 200) return path;

    // If 403, the link expired — try to get a fresh one
    if (result.status === 403) {
      return await retryWithFreshLink(fileId, modifiedTime, path, accessToken, size);
    }

    throw new Error(`Thumbnail download failed: ${result.status}`);
  } catch (error) {
    // On network error, try with fresh link once
    try {
      return await retryWithFreshLink(fileId, modifiedTime, path, accessToken, size);
    } catch {
      throw error;
    }
  }
}

async function retryWithFreshLink(
  fileId: string,
  modifiedTime: string | null,
  path: string,
  accessToken: string,
  size: number,
): Promise<string> {
  const freshFile = await driveClient.getFile(fileId);
  if (!freshFile.thumbnailLink) {
    throw new Error('No thumbnail available');
  }

  const freshLink = driveClient.resizeThumbnailLink(freshFile.thumbnailLink, size);
  const result = await FileSystem.downloadAsync(freshLink, path, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (result.status === 200) return path;
  throw new Error(`Thumbnail retry failed: ${result.status}`);
}

// ─── Original cache ──────────────────────────────────────────────────

/**
 * Get the local path for a cached original.
 */
export async function getCachedOriginalPath(
  fileId: string,
): Promise<string | null> {
  await ready();
  const path = `${ORIGINAL_BASE}${fileId}`;
  const info = await FileSystem.getInfoAsync(path);
  return info.exists ? path : null;
}

/**
 * Download and cache an original file.
 */
export async function cacheOriginal(
  fileId: string,
  accessToken: string,
  extension: string = '',
): Promise<string> {
  await ready();
  const path = `${ORIGINAL_BASE}${fileId}${extension}`;

  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) return path;

  const url = driveClient.getDownloadUrl(fileId);
  const result = await FileSystem.downloadAsync(url, path, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (result.status !== 200) {
    // Clean up partial download
    try { await FileSystem.deleteAsync(path, { idempotent: true }); } catch {}
    throw new Error(`Original download failed: ${result.status}`);
  }

  // After successful download, enforce LRU cache size
  await enforceOriginalCacheSize();

  return path;
}

// ─── Cache size management ───────────────────────────────────────────

/**
 * Get the total cache size in bytes.
 */
export async function getCacheSize(): Promise<{
  thumbnails: number;
  originals: number;
  total: number;
}> {
  await ready();

  const thumbSize = await getDirSize(THUMB_BASE);
  const origSize = await getDirSize(ORIGINAL_BASE);

  return {
    thumbnails: thumbSize,
    originals: origSize,
    total: thumbSize + origSize,
  };
}

async function getDirSize(dirPath: string): Promise<number> {
  try {
    const files = await FileSystem.readDirectoryAsync(dirPath);
    let total = 0;

    for (const file of files) {
      const info = await FileSystem.getInfoAsync(`${dirPath}${file}`);
      if (info.exists && 'size' in info) {
        total += (info as { size: number }).size;
      }
    }

    return total;
  } catch {
    return 0;
  }
}

/**
 * Enforce LRU cache size limit for originals.
 * Removes oldest files until under the size limit.
 */
async function enforceOriginalCacheSize(): Promise<void> {
  const maxBytes = DEFAULT_ORIGINAL_CACHE_SIZE_MB * 1024 * 1024;

  try {
    const files = await FileSystem.readDirectoryAsync(ORIGINAL_BASE);
    const fileInfos: Array<{ name: string; size: number; modTime: number }> = [];

    for (const file of files) {
      const info = await FileSystem.getInfoAsync(`${ORIGINAL_BASE}${file}`);
      if (info.exists && 'size' in info) {
        fileInfos.push({
          name: file,
          size: (info as { size: number }).size,
          modTime: (info as { modificationTime?: number }).modificationTime ?? 0,
        });
      }
    }

    // Sort by modification time (oldest first)
    fileInfos.sort((a, b) => a.modTime - b.modTime);

    let totalSize = fileInfos.reduce((sum, f) => sum + f.size, 0);

    // Remove oldest files until under limit
    for (const file of fileInfos) {
      if (totalSize <= maxBytes) break;
      await FileSystem.deleteAsync(`${ORIGINAL_BASE}${file.name}`, {
        idempotent: true,
      });
      totalSize -= file.size;
    }
  } catch {
    // Non-critical
  }
}

/**
 * Clear all cached data.
 * NEVER touches Drive or uploaded data.
 */
export async function clearCache(): Promise<void> {
  try {
    await FileSystem.deleteAsync(THUMB_BASE, { idempotent: true });
    await FileSystem.deleteAsync(ORIGINAL_BASE, { idempotent: true });
    dirsReady = null; // Reset so dirs get recreated
    await ready();
  } catch {
    // Best effort
  }
}

/**
 * Clear only the thumbnail cache.
 */
export async function clearThumbnailCache(): Promise<void> {
  try {
    await FileSystem.deleteAsync(THUMB_BASE, { idempotent: true });
    dirsReady = null;
    await ready();
  } catch {}
}

/**
 * Clear only the originals cache.
 */
export async function clearOriginalCache(): Promise<void> {
  try {
    await FileSystem.deleteAsync(ORIGINAL_BASE, { idempotent: true });
    dirsReady = null;
    await ready();
  } catch {}
}
