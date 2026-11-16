/**
 * Sync engine — crawls Drive metadata into SQLite.
 *
 * Two-phase sync:
 * 1. Initial crawl: pages through files.list, persists crawl cursor
 * 2. Incremental sync: uses Changes API with persisted start token
 *
 * The Changes API start token is fetched BEFORE the initial crawl begins,
 * so no changes are missed between crawl start and first incremental sync.
 */

import * as driveClient from './driveClient';
import {
  upsertMediaItems,
  removeMediaItem,
  getSyncCursor,
  setSyncCursor,
  getMediaCount,
} from '../data/mediaRepository';
import type { DriveFile } from '../types';

// Cursor keys
const CURSOR_CHANGES_TOKEN = 'drive_changes_token';
const CURSOR_CRAWL_PAGE = 'drive_crawl_page';
const CURSOR_CRAWL_COMPLETE = 'drive_crawl_complete';

export type SyncProgress = {
  phase: 'crawl' | 'incremental';
  itemsSynced: number;
  totalItems: number | null;
  currentPage: number;
};

export type SyncCallback = (progress: SyncProgress) => void;

/**
 * Run a full sync cycle:
 * - If initial crawl is incomplete, continue it
 * - Then run incremental sync via Changes API
 */
export async function runSync(onProgress?: SyncCallback): Promise<{
  itemsSynced: number;
  pagesProcessed: number;
  changesProcessed: number;
}> {
  let itemsSynced = 0;
  let pagesProcessed = 0;
  let changesProcessed = 0;

  // Phase 1: Initial crawl (if not complete)
  const crawlComplete = getSyncCursor(CURSOR_CRAWL_COMPLETE);
  if (crawlComplete !== 'true') {
    // Fetch Changes API start token BEFORE crawl begins
    let changesToken = getSyncCursor(CURSOR_CHANGES_TOKEN);
    if (!changesToken) {
      changesToken = await driveClient.getChangesStartPageToken();
      setSyncCursor(CURSOR_CHANGES_TOKEN, changesToken);
    }

    // Resume from last crawl page
    let pageToken = getSyncCursor(CURSOR_CRAWL_PAGE) ?? undefined;
    let page = 0;

    do {
      const response = await driveClient.listFiles(pageToken);
      const files = response.files ?? [];

      if (files.length > 0) {
        // Filter to only media files (should already be filtered by query)
        const mediaFiles = files.filter(
          (f) => isMediaType(f.mimeType) && !f.trashed,
        );
        upsertMediaItems(mediaFiles);
        itemsSynced += mediaFiles.length;
      }

      page++;
      pagesProcessed++;

      onProgress?.({
        phase: 'crawl',
        itemsSynced,
        totalItems: null,
        currentPage: page,
      });

      if (response.nextPageToken) {
        pageToken = response.nextPageToken;
        setSyncCursor(CURSOR_CRAWL_PAGE, pageToken);
      } else {
        pageToken = undefined;
      }
    } while (pageToken);

    // Mark crawl complete
    setSyncCursor(CURSOR_CRAWL_COMPLETE, 'true');
  }

  // Phase 2: Incremental sync via Changes API
  let changesToken = getSyncCursor(CURSOR_CHANGES_TOKEN);
  if (changesToken) {
    let hasMore = true;

    while (hasMore) {
      const response = await driveClient.listChanges(changesToken!);
      const changes = response.changes ?? [];

      for (const change of changes) {
        if (change.removed || change.file?.trashed) {
          // File was removed or trashed
          if (change.fileId) {
            removeMediaItem(change.fileId);
          }
        } else if (change.file && isMediaType(change.file.mimeType)) {
          // File was added or updated
          upsertMediaItems([change.file]);
          itemsSynced++;
        }
        changesProcessed++;
      }

      if (response.newStartPageToken) {
        changesToken = response.newStartPageToken;
        setSyncCursor(CURSOR_CHANGES_TOKEN, changesToken);
        hasMore = false;
      } else if (response.nextPageToken) {
        changesToken = response.nextPageToken;
        setSyncCursor(CURSOR_CHANGES_TOKEN, changesToken);
      } else {
        hasMore = false;
      }

      onProgress?.({
        phase: 'incremental',
        itemsSynced,
        totalItems: getMediaCount(),
        currentPage: pagesProcessed,
      });
    }
  }

  return { itemsSynced, pagesProcessed, changesProcessed };
}

/**
 * Reset sync state so the next runSync does a full crawl.
 */
export function resetSync(): void {
  // Clear crawl cursors but keep changes token
  const db = require('../data/database').getDatabase();
  db.runSync("DELETE FROM sync_cursors WHERE key LIKE 'drive_crawl%'");
}

/**
 * Full reset: clear all synced data and cursors.
 */
export function fullReset(): void {
  const { clearAllMedia } = require('../data/mediaRepository');
  clearAllMedia();
}

// ─── Helpers ─────────────────────────────────────────────────────────

function isMediaType(mimeType: string): boolean {
  return mimeType.startsWith('image/') || mimeType.startsWith('video/');
}
