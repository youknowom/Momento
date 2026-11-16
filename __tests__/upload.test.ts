import { enqueueUpload } from '../src/services/uploadService';
import { upsertMediaItem } from '../src/data/mediaRepository';
import type { DriveFile } from '../src/types';

describe('Upload Service', () => {
  it('enqueues an upload and detects duplicate MD5 checksums', async () => {
    // Insert an existing item into DB with known MD5
    const existingFile: DriveFile = {
      id: 'existing_drive_file_99',
      name: 'IMG_ORIGINAL.JPG',
      mimeType: 'image/jpeg',
      size: '5000000',
      md5Checksum: 'mock_md5_hash_32chars_long_12345',
      createdTime: '2023-01-01T00:00:00Z',
    };
    upsertMediaItem(existingFile);

    const result = await enqueueUpload({
      id: 'upload_job_duplicate_test',
      localAssetId: 'local_asset_99',
      localUri: 'file:///data/IMG_ORIGINAL.JPG',
      fileName: 'IMG_ORIGINAL.JPG',
      mimeType: 'image/jpeg',
      fileSize: 5000000,
      assetCreationDate: '2023-01-01T00:00:00Z',
    });

    expect(result.upload.id).toBe('upload_job_duplicate_test');
    expect(result.upload.state).toBe('queued');

    // Duplicate detection check
    expect(result.duplicates.exact.length).toBeGreaterThan(0);
    expect(result.duplicates.exact[0]?.id).toBe('existing_drive_file_99');
  });

  it('detects weak duplicate (name + size match)', async () => {
    const result = await enqueueUpload({
      id: 'upload_job_weak_test',
      localAssetId: 'local_asset_100',
      localUri: 'file:///data/IMG_DIFFERENT.JPG',
      fileName: 'IMG_ORIGINAL.JPG', // Same name as existing
      mimeType: 'image/jpeg',
      fileSize: 5000000, // Same size
      assetCreationDate: '2023-01-01T00:00:00Z',
    });

    expect(result.duplicates.weak.length).toBeGreaterThan(0);
    expect(result.duplicates.weak[0]?.id).toBe('existing_drive_file_99');
  });
});
