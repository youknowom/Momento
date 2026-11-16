import * as driveClient from '../src/services/driveClient';
import { runSync, resetSync } from '../src/services/syncEngine';
import { getMediaItem, getSyncCursor } from '../src/data/mediaRepository';
import type { DriveFilesListResponse, DriveChangesListResponse } from '../src/types';

jest.mock('../src/services/driveClient');

const mockDriveClient = driveClient as jest.Mocked<typeof driveClient>;

describe('Sync Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('performs initial crawl with start token fetched first', async () => {
    // 1. Changes start page token fetched before crawl
    mockDriveClient.getChangesStartPageToken.mockResolvedValue('token_changes_start');

    // 2. files.list returns 2 items on page 1, has nextPageToken
    mockDriveClient.listFiles
      .mockResolvedValueOnce({
        nextPageToken: 'page_token_2',
        files: [
          {
            id: 'crawl_file_1',
            name: 'photo1.jpg',
            mimeType: 'image/jpeg',
            createdTime: '2024-01-01T00:00:00Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        nextPageToken: undefined,
        files: [
          {
            id: 'crawl_file_2',
            name: 'photo2.jpg',
            mimeType: 'image/jpeg',
            createdTime: '2024-01-02T00:00:00Z',
          },
        ],
      });

    // 3. changes.list returns no immediate changes
    mockDriveClient.listChanges.mockResolvedValue({
      nextPageToken: undefined,
      newStartPageToken: 'token_changes_v2',
      changes: [],
    });

    const result = await runSync();

    expect(mockDriveClient.getChangesStartPageToken).toHaveBeenCalled();
    expect(mockDriveClient.listFiles).toHaveBeenCalledTimes(2);
    expect(result.itemsSynced).toBeGreaterThanOrEqual(2);

    const item1 = getMediaItem('crawl_file_1');
    expect(item1).not.toBeNull();
    expect(item1?.name).toBe('photo1.jpg');

    const item2 = getMediaItem('crawl_file_2');
    expect(item2).not.toBeNull();
    expect(item2?.name).toBe('photo2.jpg');
  });

  it('handles incremental sync with file additions and removals', async () => {
    // Crawl is marked complete from previous run
    mockDriveClient.listChanges.mockResolvedValueOnce({
      nextPageToken: undefined,
      newStartPageToken: 'token_changes_v3',
      changes: [
        {
          fileId: 'crawl_file_1',
          removed: true,
        },
        {
          fileId: 'new_file_3',
          removed: false,
          file: {
            id: 'new_file_3',
            name: 'photo3.jpg',
            mimeType: 'image/jpeg',
            createdTime: '2024-01-03T00:00:00Z',
          },
        },
      ],
    });

    const result = await runSync();
    expect(result.changesProcessed).toBe(2);

    // crawl_file_1 should have been removed
    const removedItem = getMediaItem('crawl_file_1');
    expect(removedItem).toBeNull();

    // new_file_3 should have been added
    const newItem = getMediaItem('new_file_3');
    expect(newItem).not.toBeNull();
    expect(newItem?.name).toBe('photo3.jpg');
  });
});
