import { z } from 'zod';

// ─── Drive API Response Schemas ───────────────────────────────────────

export const ImageMediaMetadataSchema = z
  .object({
    width: z.number().optional(),
    height: z.number().optional(),
    time: z.string().optional(), // EXIF: "YYYY:MM:DD HH:MM:SS"
    cameraMake: z.string().optional(),
    cameraModel: z.string().optional(),
  })
  .optional();

export const VideoMediaMetadataSchema = z
  .object({
    width: z.number().optional(),
    height: z.number().optional(),
    durationMillis: z.string().optional(), // API returns string
  })
  .optional();

export const DriveFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  originalFilename: z.string().optional(),
  mimeType: z.string(),
  size: z.string().optional(), // Drive returns size as string
  md5Checksum: z.string().optional(),
  createdTime: z.string().optional(),
  modifiedTime: z.string().optional(),
  parents: z.array(z.string()).optional(),
  trashed: z.boolean().optional(),
  thumbnailLink: z.string().optional(),
  imageMediaMetadata: ImageMediaMetadataSchema,
  videoMediaMetadata: VideoMediaMetadataSchema,
});

export type DriveFile = z.infer<typeof DriveFileSchema>;

export const DriveFilesListResponseSchema = z.object({
  nextPageToken: z.string().optional(),
  files: z.array(DriveFileSchema).optional(),
});

export type DriveFilesListResponse = z.infer<
  typeof DriveFilesListResponseSchema
>;

// Changes API
export const DriveChangeSchema = z.object({
  type: z.string().optional(),
  fileId: z.string().optional(),
  removed: z.boolean().optional(),
  file: DriveFileSchema.optional(),
});

export type DriveChange = z.infer<typeof DriveChangeSchema>;

export const DriveChangesListResponseSchema = z.object({
  nextPageToken: z.string().optional(),
  newStartPageToken: z.string().optional(),
  changes: z.array(DriveChangeSchema).optional(),
});

export type DriveChangesListResponse = z.infer<
  typeof DriveChangesListResponseSchema
>;

export const DriveStartPageTokenResponseSchema = z.object({
  startPageToken: z.string(),
});

// ─── Local Database Models ────────────────────────────────────────────

export interface MediaItem {
  id: string; // Drive file ID
  name: string;
  originalFilename: string | null;
  mimeType: string;
  size: number | null;
  md5Checksum: string | null;
  driveCreatedTime: string | null; // ISO 8601
  driveModifiedTime: string | null; // ISO 8601
  parentId: string | null;
  thumbnailLink: string | null;

  // Image metadata
  width: number | null;
  height: number | null;
  exifTime: string | null; // Raw EXIF "YYYY:MM:DD HH:MM:SS"
  cameraMake: string | null;
  cameraModel: string | null;

  // Video metadata
  durationMillis: number | null;

  // Computed date fields
  captureDate: string; // "YYYY-MM-DD" — from best source
  captureTime: string | null; // "HH:MM:SS" if known
  dateSource: 'exif' | 'drive_created' | 'unknown';

  // Local state
  isFavourite: boolean;
  syncedAt: string; // ISO 8601 — when this row was created/updated
}

export interface Album {
  id: string; // UUID
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlbumItem {
  albumId: string;
  mediaId: string;
  addedAt: string;
  sortOrder: number;
}

export interface UploadRecord {
  id: string; // UUID
  localAssetId: string;
  localUri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  md5Hash: string | null;
  driveFileId: string | null;
  driveFolderId: string | null;
  sessionUri: string | null; // Resumable upload session
  bytesUploaded: number;
  state: 'queued' | 'uploading' | 'paused' | 'failed' | 'verifying' | 'done';
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  assetCreationDate: string | null; // Original creation date from media library
  retryCount: number;
}

export interface SyncCursor {
  key: string;
  value: string;
  updatedAt: string;
}

// ─── UI Types ─────────────────────────────────────────────────────────

export interface TimelineSection {
  key: string; // "YYYY-MM-DD"
  title: string; // Human-readable date
  data: MediaItem[];
}

export interface MonthSection {
  key: string; // "YYYY-MM"
  title: string; // "November 2024"
  days: TimelineSection[];
  count: number;
}

export interface YearSection {
  key: string; // "YYYY"
  title: string;
  months: MonthSection[];
  count: number;
}

// Auth types
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  userEmail: string | null;
  userPhoto: string | null;
  error: string | null;
}

// Sync info
export interface SyncInfo {
  state: 'idle' | 'syncing' | 'error';
  lastSyncAt: string | null;
  totalItems: number;
  errorMessage: string | null;
}
