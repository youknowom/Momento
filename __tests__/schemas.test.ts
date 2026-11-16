import {
  DriveFileSchema,
  DriveFilesListResponseSchema,
  DriveChangesListResponseSchema,
  DriveStartPageTokenResponseSchema,
} from '../src/types';

describe('Zod Schemas for Drive API', () => {
  it('parses minimal Drive file', () => {
    const raw = {
      id: 'file_123',
      name: 'IMG_0001.JPG',
      mimeType: 'image/jpeg',
    };
    const parsed = DriveFileSchema.parse(raw);
    expect(parsed.id).toBe('file_123');
    expect(parsed.name).toBe('IMG_0001.JPG');
    expect(parsed.mimeType).toBe('image/jpeg');
  });

  it('parses full image file with EXIF metadata', () => {
    const raw = {
      id: 'img_456',
      name: 'IMG_456.HEIC',
      originalFilename: 'IMG_456.HEIC',
      mimeType: 'image/heic',
      size: '2456789',
      md5Checksum: 'c4ca4238a0b923820dcc509a6f75849b',
      createdTime: '2023-05-12T14:30:00.000Z',
      modifiedTime: '2023-05-12T14:30:00.000Z',
      parents: ['folder_1'],
      trashed: false,
      thumbnailLink: 'https://lh3.googleusercontent.com/test=s220',
      imageMediaMetadata: {
        width: 4032,
        height: 3024,
        time: '2023:05:12 10:20:30',
        cameraMake: 'Apple',
        cameraModel: 'iPhone 14 Pro',
      },
    };
    const parsed = DriveFileSchema.parse(raw);
    expect(parsed.imageMediaMetadata?.time).toBe('2023:05:12 10:20:30');
    expect(parsed.imageMediaMetadata?.cameraModel).toBe('iPhone 14 Pro');
  });

  it('parses video file with videoMediaMetadata', () => {
    const raw = {
      id: 'vid_789',
      name: 'video.mov',
      mimeType: 'video/quicktime',
      size: '52428800',
      videoMediaMetadata: {
        width: 1920,
        height: 1080,
        durationMillis: '30500',
      },
    };
    const parsed = DriveFileSchema.parse(raw);
    expect(parsed.videoMediaMetadata?.durationMillis).toBe('30500');
    expect(parsed.videoMediaMetadata?.width).toBe(1920);
  });

  it('parses files.list response with pagination', () => {
    const raw = {
      nextPageToken: 'token_page_2',
      files: [
        { id: '1', name: 'a.jpg', mimeType: 'image/jpeg' },
        { id: '2', name: 'b.jpg', mimeType: 'image/jpeg' },
      ],
    };
    const parsed = DriveFilesListResponseSchema.parse(raw);
    expect(parsed.nextPageToken).toBe('token_page_2');
    expect(parsed.files).toHaveLength(2);
  });

  it('parses changes.list response with removed file and start tokens', () => {
    const raw = {
      nextPageToken: undefined,
      newStartPageToken: 'start_token_new',
      changes: [
        {
          type: 'file',
          fileId: 'file_deleted_1',
          removed: true,
        },
        {
          type: 'file',
          fileId: 'file_new_2',
          removed: false,
          file: { id: 'file_new_2', name: 'c.png', mimeType: 'image/png' },
        },
      ],
    };
    const parsed = DriveChangesListResponseSchema.parse(raw);
    expect(parsed.newStartPageToken).toBe('start_token_new');
    expect(parsed.changes?.[0]?.removed).toBe(true);
    expect(parsed.changes?.[1]?.file?.name).toBe('c.png');
  });

  it('parses startPageToken response', () => {
    const raw = { startPageToken: 'token_12345' };
    const parsed = DriveStartPageTokenResponseSchema.parse(raw);
    expect(parsed.startPageToken).toBe('token_12345');
  });
});
