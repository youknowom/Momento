/**
 * SQLite database initialization and migrations.
 * Uses expo-sqlite with synchronous API for migrations.
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'drivephotos.db';
const CURRENT_VERSION = 1;

let db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
    runMigrations(db);
  }
  return db;
}

function runMigrations(database: SQLite.SQLiteDatabase): void {
  database.execSync('PRAGMA journal_mode = WAL');
  database.execSync('PRAGMA foreign_keys = ON');

  // Create version tracking table
  database.execSync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL
    )
  `);

  const row = database.getFirstSync<{ version: number }>(
    'SELECT version FROM schema_version WHERE id = 1',
  );
  const currentVersion = row?.version ?? 0;

  if (currentVersion < 1) {
    migrateV1(database);
  }

  // Update version
  database.runSync(
    'INSERT OR REPLACE INTO schema_version (id, version) VALUES (1, ?)',
    CURRENT_VERSION,
  );
}

function migrateV1(database: SQLite.SQLiteDatabase): void {
  database.execSync(`
    -- Main media items table (synced from Drive)
    CREATE TABLE IF NOT EXISTS media_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      original_filename TEXT,
      mime_type TEXT NOT NULL,
      size INTEGER,
      md5_checksum TEXT,
      drive_created_time TEXT,
      drive_modified_time TEXT,
      parent_id TEXT,
      thumbnail_link TEXT,

      -- Image metadata
      width INTEGER,
      height INTEGER,
      exif_time TEXT,
      camera_make TEXT,
      camera_model TEXT,

      -- Video metadata
      duration_millis INTEGER,

      -- Computed date fields
      capture_date TEXT NOT NULL DEFAULT '0000-00-00',
      capture_time TEXT,
      date_source TEXT NOT NULL DEFAULT 'unknown',

      -- Local state
      is_favourite INTEGER NOT NULL DEFAULT 0,
      synced_at TEXT NOT NULL
    );

    -- Indexes for timeline queries
    CREATE INDEX IF NOT EXISTS idx_media_capture_date ON media_items(capture_date DESC, id);
    CREATE INDEX IF NOT EXISTS idx_media_mime_type ON media_items(mime_type);
    CREATE INDEX IF NOT EXISTS idx_media_name ON media_items(name);
    CREATE INDEX IF NOT EXISTS idx_media_md5 ON media_items(md5_checksum);
    CREATE INDEX IF NOT EXISTS idx_media_favourite ON media_items(is_favourite) WHERE is_favourite = 1;

    -- Albums
    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Album items (many-to-many)
    CREATE TABLE IF NOT EXISTS album_items (
      album_id TEXT NOT NULL,
      media_id TEXT NOT NULL,
      added_at TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (album_id, media_id),
      FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
      FOREIGN KEY (media_id) REFERENCES media_items(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_album_items_media ON album_items(media_id);

    -- Upload queue
    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      local_asset_id TEXT NOT NULL,
      local_uri TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      md5_hash TEXT,
      drive_file_id TEXT,
      drive_folder_id TEXT,
      session_uri TEXT,
      bytes_uploaded INTEGER NOT NULL DEFAULT 0,
      state TEXT NOT NULL DEFAULT 'queued',
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      asset_creation_date TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_uploads_state ON uploads(state);

    -- Sync cursors (page tokens, etc.)
    CREATE TABLE IF NOT EXISTS sync_cursors (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

/**
 * Close the database connection.
 */
export function closeDatabase(): void {
  if (db) {
    db.closeSync();
    db = null;
  }
}
