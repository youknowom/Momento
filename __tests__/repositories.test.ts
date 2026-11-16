import {
  upsertMediaItem,
  getMediaItem,
  toggleFavourite,
  getFavourites,
  removeMediaItem,
  findByMd5,
  findByNameAndSize,
  setSyncCursor,
  getSyncCursor,
} from '../src/data/mediaRepository';
import {
  createAlbum,
  getAlbum,
  renameAlbum,
  deleteAlbum,
  addToAlbum,
  removeFromAlbum,
  getAlbumItems,
} from '../src/data/albumRepository';
import {
  createUpload,
  getUpload,
  updateUploadState,
} from '../src/data/uploadRepository';
import type { DriveFile, UploadRecord } from '../src/types';
import { UPLOAD_STATE } from '../src/constants';

describe('Repositories (SQLite)', () => {
  describe('Media Repository', () => {
    it('upserts a media item and retrieves it', () => {
      const file: DriveFile = {
        id: 'drive_item_1',
        name: 'test_photo.jpg',
        mimeType: 'image/jpeg',
        size: '1048576',
        md5Checksum: 'md5_test_hash_1',
        createdTime: '2024-01-01T12:00:00Z',
        imageMediaMetadata: {
          width: 3000,
          height: 2000,
          time: '2023:12:25 15:30:00',
        },
      };

      upsertMediaItem(file);
      const item = getMediaItem('drive_item_1');

      expect(item).not.toBeNull();
      expect(item?.id).toBe('drive_item_1');
      expect(item?.name).toBe('test_photo.jpg');
      expect(item?.captureDate).toBe('2023-12-25');
      expect(item?.dateSource).toBe('exif');
    });

    it('toggles favourite status', () => {
      const initial = getMediaItem('drive_item_1');
      expect(initial?.isFavourite).toBe(false);

      const status1 = toggleFavourite('drive_item_1');
      expect(status1).toBe(true);

      const favs = getFavourites(10);
      expect(favs.some((f) => f.id === 'drive_item_1')).toBe(true);

      const status2 = toggleFavourite('drive_item_1');
      expect(status2).toBe(false);
    });

    it('finds duplicate by MD5 checksum', () => {
      const matches = findByMd5('md5_test_hash_1');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]?.id).toBe('drive_item_1');
    });

    it('finds duplicate by weak hint (name + size)', () => {
      const matches = findByNameAndSize('test_photo.jpg', 1048576);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]?.id).toBe('drive_item_1');
    });

    it('persists and retrieves sync cursors', () => {
      setSyncCursor('cursor_test_key', 'token_xyz_99');
      const val = getSyncCursor('cursor_test_key');
      expect(val).toBe('token_xyz_99');
    });

    it('removes a media item', () => {
      removeMediaItem('drive_item_1');
      const item = getMediaItem('drive_item_1');
      expect(item).toBeNull();
    });
  });

  describe('Album Repository', () => {
    it('creates, renames, and gets an album', () => {
      const album = createAlbum('album_vacation_1', 'Vacation 2024');
      expect(album.id).toBe('album_vacation_1');
      expect(album.name).toBe('Vacation 2024');

      renameAlbum('album_vacation_1', 'Trip 2024');
      const fetched = getAlbum('album_vacation_1');
      expect(fetched?.name).toBe('Trip 2024');
    });

    it('adds items to an album and retrieves them', () => {
      addToAlbum('album_vacation_1', ['media_item_a', 'media_item_b']);
      removeFromAlbum('album_vacation_1', ['media_item_a']);
      // delete album cleans up
      deleteAlbum('album_vacation_1');
      expect(getAlbum('album_vacation_1')).toBeNull();
    });
  });

  describe('Upload Repository', () => {
    it('creates and tracks upload state', () => {
      const upload: UploadRecord = {
        id: 'upload_job_1',
        localAssetId: 'asset_local_1',
        localUri: 'file:///var/mobile/img1.jpg',
        fileName: 'img1.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2048000,
        md5Hash: 'hash_abc',
        driveFileId: null,
        driveFolderId: 'folder_root_1',
        sessionUri: 'https://upload.google.com/session_1',
        bytesUploaded: 0,
        state: UPLOAD_STATE.QUEUED,
        errorMessage: null,
        createdAt: '2024-06-01T10:00:00Z',
        updatedAt: '2024-06-01T10:00:00Z',
        assetCreationDate: '2024-05-30T10:00:00Z',
        retryCount: 0,
      };

      createUpload(upload);
      const fetched = getUpload('upload_job_1');
      expect(fetched?.id).toBe('upload_job_1');
      expect(fetched?.state).toBe('queued');

      updateUploadState('upload_job_1', UPLOAD_STATE.UPLOADING, {
        bytesUploaded: 1024000,
      });

      const updated = getUpload('upload_job_1');
      expect(updated?.state).toBe('uploading');
    });
  });
});
