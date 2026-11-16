// App-wide constants — single source of truth
export const APP_NAME = 'Drive Photos' as const;
export const APP_SLUG = 'drive-photos' as const;
export const APP_SCHEME = 'drivephotos' as const;

// Google Drive API
export const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
export const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
] as const;

// Drive API fields to request for media files
export const DRIVE_FILE_FIELDS = [
  'id',
  'name',
  'originalFilename',
  'mimeType',
  'size',
  'md5Checksum',
  'createdTime',
  'modifiedTime',
  'parents',
  'trashed',
  'thumbnailLink',
  'imageMediaMetadata(width,height,time,cameraMake,cameraModel)',
  'videoMediaMetadata(width,height,durationMillis)',
].join(',');

export const DRIVE_FILES_LIST_FIELDS = `nextPageToken,files(${DRIVE_FILE_FIELDS})`;

// Maximum page size for Drive API
export const DRIVE_PAGE_SIZE = 1000;

// Media queries for Drive
export const DRIVE_MEDIA_QUERY =
  "(mimeType contains 'image/' or mimeType contains 'video/') and trashed = false";

// Google OAuth discovery document
export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
} as const;

// Cache settings
export const THUMBNAIL_CACHE_DIR = 'thumbnails';
export const ORIGINAL_CACHE_DIR = 'originals';
export const DEFAULT_ORIGINAL_CACHE_SIZE_MB = 500;

// Upload settings
export const DEFAULT_UPLOAD_FOLDER =
  process.env.EXPO_PUBLIC_UPLOAD_FOLDER_NAME ?? 'Drive Photos Uploads';
export const UPLOAD_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for resumable upload

// Dev fixtures
export const USE_DEV_FIXTURES =
  process.env.EXPO_PUBLIC_USE_DEV_FIXTURES === 'true';

// Date sources
export const DATE_SOURCE = {
  EXIF: 'exif',
  DRIVE_CREATED: 'drive_created',
  UNKNOWN: 'unknown',
} as const;
export type DateSource = (typeof DATE_SOURCE)[keyof typeof DATE_SOURCE];

// Supported media types
export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/bmp',
  'image/tiff',
] as const;

export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
  'video/3gpp',
] as const;

// Upload states
export const UPLOAD_STATE = {
  QUEUED: 'queued',
  UPLOADING: 'uploading',
  PAUSED: 'paused',
  FAILED: 'failed',
  VERIFYING: 'verifying',
  DONE: 'done',
} as const;
export type UploadState = (typeof UPLOAD_STATE)[keyof typeof UPLOAD_STATE];

// Sync states
export const SYNC_STATE = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  ERROR: 'error',
} as const;
export type SyncState = (typeof SYNC_STATE)[keyof typeof SYNC_STATE];
