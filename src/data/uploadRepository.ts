/**
 * Upload repository — persisted upload queue state.
 */

import { getDatabase } from './database';
import type { UploadRecord } from '../types';

function rowToUpload(row: Record<string, unknown>): UploadRecord {
  return {
    id: row['id'] as string,
    localAssetId: row['local_asset_id'] as string,
    localUri: row['local_uri'] as string,
    fileName: row['file_name'] as string,
    mimeType: row['mime_type'] as string,
    fileSize: row['file_size'] as number,
    md5Hash: (row['md5_hash'] as string) ?? null,
    driveFileId: (row['drive_file_id'] as string) ?? null,
    driveFolderId: (row['drive_folder_id'] as string) ?? null,
    sessionUri: (row['session_uri'] as string) ?? null,
    bytesUploaded: row['bytes_uploaded'] as number,
    state: row['state'] as UploadRecord['state'],
    errorMessage: (row['error_message'] as string) ?? null,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
    assetCreationDate: (row['asset_creation_date'] as string) ?? null,
    retryCount: row['retry_count'] as number,
  };
}

export function createUpload(upload: UploadRecord): void {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO uploads (
      id, local_asset_id, local_uri, file_name, mime_type, file_size,
      md5_hash, drive_file_id, drive_folder_id, session_uri,
      bytes_uploaded, state, error_message, created_at, updated_at,
      asset_creation_date, retry_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    upload.id,
    upload.localAssetId,
    upload.localUri,
    upload.fileName,
    upload.mimeType,
    upload.fileSize,
    upload.md5Hash,
    upload.driveFileId,
    upload.driveFolderId,
    upload.sessionUri,
    upload.bytesUploaded,
    upload.state,
    upload.errorMessage,
    upload.createdAt,
    upload.updatedAt,
    upload.assetCreationDate,
    upload.retryCount,
  );
}

export function updateUploadState(
  id: string,
  state: UploadRecord['state'],
  updates?: Partial<
    Pick<
      UploadRecord,
      | 'bytesUploaded'
      | 'sessionUri'
      | 'driveFileId'
      | 'errorMessage'
      | 'retryCount'
    >
  >,
): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const sets: string[] = ['state = ?', 'updated_at = ?'];
  const params: (string | number | null)[] = [state, now];

  if (updates?.bytesUploaded !== undefined) {
    sets.push('bytes_uploaded = ?');
    params.push(updates.bytesUploaded);
  }
  if (updates?.sessionUri !== undefined) {
    sets.push('session_uri = ?');
    params.push(updates.sessionUri);
  }
  if (updates?.driveFileId !== undefined) {
    sets.push('drive_file_id = ?');
    params.push(updates.driveFileId);
  }
  if (updates?.errorMessage !== undefined) {
    sets.push('error_message = ?');
    params.push(updates.errorMessage);
  }
  if (updates?.retryCount !== undefined) {
    sets.push('retry_count = ?');
    params.push(updates.retryCount);
  }

  db.runSync(
    `UPDATE uploads SET ${sets.join(', ')} WHERE id = ?`,
    ...params,
    id,
  );
}

export function getUpload(id: string): UploadRecord | null {
  const db = getDatabase();
  const row = db.getFirstSync<Record<string, unknown>>(
    'SELECT * FROM uploads WHERE id = ?',
    id,
  );
  return row ? rowToUpload(row) : null;
}

export function getUploadsByState(
  state: UploadRecord['state'],
): UploadRecord[] {
  const db = getDatabase();
  const rows = db.getAllSync<Record<string, unknown>>(
    'SELECT * FROM uploads WHERE state = ? ORDER BY created_at ASC',
    state,
  );
  return rows.map(rowToUpload);
}

export function getAllUploads(): UploadRecord[] {
  const db = getDatabase();
  const rows = db.getAllSync<Record<string, unknown>>(
    'SELECT * FROM uploads ORDER BY created_at DESC',
  );
  return rows.map(rowToUpload);
}

export function getPendingUploads(): UploadRecord[] {
  const db = getDatabase();
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT * FROM uploads
     WHERE state IN ('queued', 'uploading', 'paused')
     ORDER BY created_at ASC`,
  );
  return rows.map(rowToUpload);
}

export function getUploadStats(): {
  total: number;
  queued: number;
  uploading: number;
  failed: number;
  done: number;
} {
  const db = getDatabase();
  const total =
    db.getFirstSync<{ c: number }>('SELECT COUNT(*) as c FROM uploads')?.c ?? 0;
  const queued =
    db.getFirstSync<{ c: number }>(
      "SELECT COUNT(*) as c FROM uploads WHERE state = 'queued'",
    )?.c ?? 0;
  const uploading =
    db.getFirstSync<{ c: number }>(
      "SELECT COUNT(*) as c FROM uploads WHERE state = 'uploading'",
    )?.c ?? 0;
  const failed =
    db.getFirstSync<{ c: number }>(
      "SELECT COUNT(*) as c FROM uploads WHERE state = 'failed'",
    )?.c ?? 0;
  const done =
    db.getFirstSync<{ c: number }>(
      "SELECT COUNT(*) as c FROM uploads WHERE state = 'done'",
    )?.c ?? 0;

  return { total, queued, uploading, failed, done };
}

export function deleteUpload(id: string): void {
  const db = getDatabase();
  db.runSync('DELETE FROM uploads WHERE id = ?', id);
}

export function clearCompletedUploads(): void {
  const db = getDatabase();
  db.runSync("DELETE FROM uploads WHERE state = 'done'");
}
