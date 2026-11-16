/**
 * Google Drive API client.
 *
 * Handles: file listing, metadata fetching, thumbnail/original downloads,
 * resumable uploads, Changes API.
 *
 * All requests use authFetch which handles token refresh automatically.
 */

import { authFetch } from './auth';
import {
  DRIVE_API_BASE,
  DRIVE_UPLOAD_BASE,
  DRIVE_FILES_LIST_FIELDS,
  DRIVE_FILE_FIELDS,
  DRIVE_PAGE_SIZE,
  DRIVE_MEDIA_QUERY,
  UPLOAD_CHUNK_SIZE,
} from '../constants';
import {
  DriveFilesListResponseSchema,
  DriveChangesListResponseSchema,
  DriveStartPageTokenResponseSchema,
  DriveFileSchema,
  type DriveFile,
  type DriveFilesListResponse,
  type DriveChangesListResponse,
} from '../types';

// ─── Files.list ──────────────────────────────────────────────────────

/**
 * List media files from Drive, one page at a time.
 * Uses maximum page size (1000).
 */
export async function listFiles(
  pageToken?: string,
): Promise<DriveFilesListResponse> {
  const params = new URLSearchParams({
    q: DRIVE_MEDIA_QUERY,
    fields: DRIVE_FILES_LIST_FIELDS,
    pageSize: DRIVE_PAGE_SIZE.toString(),
    orderBy: 'createdTime desc',
  });

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const response = await authFetch(
    `${DRIVE_API_BASE}/files?${params.toString()}`,
  );

  if (!response.ok) {
    throw new DriveApiError(
      `files.list failed: ${response.status}`,
      response.status,
    );
  }

  const json = await response.json();
  return DriveFilesListResponseSchema.parse(json);
}

// ─── Files.get (single file metadata) ────────────────────────────────

export async function getFile(fileId: string): Promise<DriveFile> {
  const params = new URLSearchParams({
    fields: DRIVE_FILE_FIELDS,
  });

  const response = await authFetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?${params.toString()}`,
  );

  if (!response.ok) {
    throw new DriveApiError(
      `files.get failed for ${fileId}: ${response.status}`,
      response.status,
    );
  }

  const json = await response.json();
  return DriveFileSchema.parse(json);
}

// ─── Changes API ─────────────────────────────────────────────────────

/**
 * Get the start page token for the Changes API.
 * Must be called BEFORE the initial crawl.
 */
export async function getChangesStartPageToken(): Promise<string> {
  const response = await authFetch(
    `${DRIVE_API_BASE}/changes/startPageToken`,
  );

  if (!response.ok) {
    throw new DriveApiError(
      `changes.getStartPageToken failed: ${response.status}`,
      response.status,
    );
  }

  const json = await response.json();
  const parsed = DriveStartPageTokenResponseSchema.parse(json);
  return parsed.startPageToken;
}

/**
 * List changes since a given page token.
 */
export async function listChanges(
  pageToken: string,
): Promise<DriveChangesListResponse> {
  const params = new URLSearchParams({
    pageToken,
    fields:
      'nextPageToken,newStartPageToken,changes(type,fileId,removed,file(' +
      DRIVE_FILE_FIELDS +
      '))',
    pageSize: DRIVE_PAGE_SIZE.toString(),
    spaces: 'drive',
    includeRemoved: 'true',
  });

  const response = await authFetch(
    `${DRIVE_API_BASE}/changes?${params.toString()}`,
  );

  if (!response.ok) {
    throw new DriveApiError(
      `changes.list failed: ${response.status}`,
      response.status,
    );
  }

  const json = await response.json();
  return DriveChangesListResponseSchema.parse(json);
}

// ─── Thumbnail download ─────────────────────────────────────────────

/**
 * Fetch thumbnail bytes. thumbnailLink is short-lived and requires auth
 * for non-public files.
 *
 * The size suffix on thumbnailLink can be changed:
 * Replace `=s220` with `=s400` (or any size) for a larger preview.
 */
export function resizeThumbnailLink(
  thumbnailLink: string,
  size: number,
): string {
  // Drive thumbnail URLs end with =sNNN
  return thumbnailLink.replace(/=s\d+$/, `=s${size}`);
}

export async function fetchThumbnail(
  thumbnailLink: string,
): Promise<ArrayBuffer> {
  const response = await authFetch(thumbnailLink);

  if (!response.ok) {
    throw new DriveApiError(
      `Thumbnail fetch failed: ${response.status}`,
      response.status,
    );
  }

  return response.arrayBuffer();
}

// ─── Original file download ─────────────────────────────────────────

/**
 * Get the download URL for a file's content.
 */
export function getDownloadUrl(fileId: string): string {
  return `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media`;
}

// ─── Upload (resumable) ─────────────────────────────────────────────

/**
 * Initiate a resumable upload session.
 * Returns the session URI to use for subsequent PUT requests.
 */
export async function initiateResumableUpload(params: {
  fileName: string;
  mimeType: string;
  folderId: string;
  fileSize: number;
  createdTime?: string;
  modifiedTime?: string;
}): Promise<string> {
  const metadata: Record<string, unknown> = {
    name: params.fileName,
    mimeType: params.mimeType,
    parents: [params.folderId],
  };

  // Set createdTime and modifiedTime from original asset date
  if (params.createdTime) {
    metadata['createdTime'] = params.createdTime;
  }
  if (params.modifiedTime) {
    metadata['modifiedTime'] = params.modifiedTime;
  }

  const urlParams = new URLSearchParams({
    uploadType: 'resumable',
    fields: DRIVE_FILE_FIELDS,
  });

  const response = await authFetch(
    `${DRIVE_UPLOAD_BASE}/files?${urlParams.toString()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': params.mimeType,
        'X-Upload-Content-Length': params.fileSize.toString(),
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!response.ok) {
    throw new DriveApiError(
      `Resumable upload initiation failed: ${response.status}`,
      response.status,
    );
  }

  const sessionUri = response.headers.get('Location');
  if (!sessionUri) {
    throw new DriveApiError('No session URI in upload response', 0);
  }

  return sessionUri;
}

/**
 * Upload a chunk to a resumable upload session.
 */
export async function uploadChunk(
  sessionUri: string,
  chunk: ArrayBuffer,
  offset: number,
  totalSize: number,
): Promise<{ complete: boolean; file?: DriveFile; bytesUploaded: number }> {
  const end = offset + chunk.byteLength - 1;

  const response = await fetch(sessionUri, {
    method: 'PUT',
    headers: {
      'Content-Length': chunk.byteLength.toString(),
      'Content-Range': `bytes ${offset}-${end}/${totalSize}`,
    },
    body: chunk,
  });

  if (response.status === 200 || response.status === 201) {
    // Upload complete
    const json = await response.json();
    const file = DriveFileSchema.parse(json);
    return { complete: true, file, bytesUploaded: totalSize };
  }

  if (response.status === 308) {
    // Resumable — more chunks needed
    const range = response.headers.get('Range');
    const uploaded = range ? parseInt(range.split('-')[1]!, 10) + 1 : end + 1;
    return { complete: false, bytesUploaded: uploaded };
  }

  throw new DriveApiError(
    `Chunk upload failed: ${response.status}`,
    response.status,
  );
}

/**
 * Check the status of a resumable upload session.
 */
export async function checkUploadStatus(
  sessionUri: string,
  totalSize: number,
): Promise<{ complete: boolean; bytesUploaded: number }> {
  const response = await fetch(sessionUri, {
    method: 'PUT',
    headers: {
      'Content-Length': '0',
      'Content-Range': `bytes */${totalSize}`,
    },
  });

  if (response.status === 200 || response.status === 201) {
    return { complete: true, bytesUploaded: totalSize };
  }

  if (response.status === 308) {
    const range = response.headers.get('Range');
    const uploaded = range ? parseInt(range.split('-')[1]!, 10) + 1 : 0;
    return { complete: false, bytesUploaded: uploaded };
  }

  // Session expired or invalid
  return { complete: false, bytesUploaded: 0 };
}

// ─── Folder operations ──────────────────────────────────────────────

/**
 * Find or create the upload folder.
 */
export async function findOrCreateFolder(
  folderName: string,
): Promise<string> {
  // Search for existing folder
  const searchParams = new URLSearchParams({
    q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id,name)',
    pageSize: '1',
  });

  const searchResponse = await authFetch(
    `${DRIVE_API_BASE}/files?${searchParams.toString()}`,
  );

  if (searchResponse.ok) {
    const searchJson = (await searchResponse.json()) as {
      files?: Array<{ id: string }>;
    };
    if (searchJson.files && searchJson.files.length > 0) {
      return searchJson.files[0]!.id;
    }
  }

  // Create new folder
  const createResponse = await authFetch(`${DRIVE_API_BASE}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createResponse.ok) {
    throw new DriveApiError(
      `Failed to create folder: ${createResponse.status}`,
      createResponse.status,
    );
  }

  const folderJson = (await createResponse.json()) as { id: string };
  return folderJson.id;
}

// ─── Error class ─────────────────────────────────────────────────────

export class DriveApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'DriveApiError';
    this.status = status;
  }
}
