class MockDatabase {
  constructor() {
    this.tables = new Map();
    this.mediaItems = new Map();
    this.albums = new Map();
    this.albumItems = [];
    this.uploads = new Map();
    this.cursors = new Map();
  }

  execSync(sql) {
    // Basic DDL no-op for tests
  }

  runSync(sql, ...params) {
    const s = sql.trim();
    if (s.startsWith('INSERT INTO schema_version') || s.startsWith('INSERT OR REPLACE INTO schema_version')) {
      // noop
    } else if (s.includes('INSERT INTO media_items') || s.includes('INSERT OR REPLACE INTO media_items')) {
      const [id, name, original_filename, mime_type, size, md5_checksum, drive_created_time, drive_modified_time, parent_id, thumbnail_link, width, height, exif_time, camera_make, camera_model, duration_millis, capture_date, capture_time, date_source, synced_at] = params;
      this.mediaItems.set(id, {
        id, name, original_filename, mime_type, size, md5_checksum,
        drive_created_time, drive_modified_time, parent_id, thumbnail_link,
        width, height, exif_time, camera_make, camera_model,
        duration_millis, capture_date, capture_time, date_source,
        is_favourite: 0, synced_at,
      });
    } else if (s.includes('UPDATE media_items SET is_favourite = ? WHERE id = ?')) {
      const [fav, id] = params;
      const item = this.mediaItems.get(id);
      if (item) item.is_favourite = fav;
    } else if (s.includes('DELETE FROM media_items WHERE id = ?')) {
      this.mediaItems.delete(params[0]);
    } else if (s.includes('DELETE FROM media_items')) {
      this.mediaItems.clear();
    } else if (s.includes('INSERT INTO albums')) {
      const [id, name, created_at, updated_at] = params;
      this.albums.set(id, { id, name, created_at, updated_at });
    } else if (s.includes('UPDATE albums SET name = ?')) {
      const [name, updated_at, id] = params;
      const album = this.albums.get(id);
      if (album) { album.name = name; album.updated_at = updated_at; }
    } else if (s.includes('DELETE FROM albums WHERE id = ?')) {
      this.albums.delete(params[0]);
    } else if (s.includes('INSERT OR IGNORE INTO album_items')) {
      const [album_id, media_id, added_at, sort_order] = params;
      this.albumItems.push({ album_id, media_id, added_at, sort_order });
    } else if (s.includes('DELETE FROM album_items WHERE album_id = ? AND media_id = ?')) {
      const [album_id, media_id] = params;
      this.albumItems = this.albumItems.filter(ai => !(ai.album_id === album_id && ai.media_id === media_id));
    } else if (s.includes('DELETE FROM album_items WHERE album_id = ?')) {
      this.albumItems = this.albumItems.filter(ai => ai.album_id !== params[0]);
    } else if (s.includes('INSERT INTO uploads')) {
      const [id, local_asset_id, local_uri, file_name, mime_type, file_size, md5_hash, drive_file_id, drive_folder_id, session_uri, bytes_uploaded, state, error_message, created_at, updated_at, asset_creation_date, retry_count] = params;
      this.uploads.set(id, {
        id, local_asset_id, local_uri, file_name, mime_type, file_size,
        md5_hash, drive_file_id, drive_folder_id, session_uri, bytes_uploaded,
        state, error_message, created_at, updated_at, asset_creation_date, retry_count
      });
    } else if (s.includes('UPDATE uploads SET')) {
      const id = params[params.length - 1];
      const upload = this.uploads.get(id);
      if (upload) {
        if (s.includes('state = ?')) upload.state = params[0];
      }
    } else if (s.includes('DELETE FROM uploads WHERE id = ?')) {
      this.uploads.delete(params[0]);
    } else if (s.includes('INSERT OR REPLACE INTO sync_cursors')) {
      const [key, value, updated_at] = params;
      this.cursors.set(key, { key, value, updated_at });
    } else if (s.includes('DELETE FROM sync_cursors')) {
      this.cursors.clear();
    }
  }

  getFirstSync(sql, ...params) {
    const s = sql.trim();
    if (s.includes('FROM schema_version')) {
      return { version: 1 };
    }
    if (s.includes('SELECT * FROM media_items WHERE id = ?')) {
      return this.mediaItems.get(params[0]) ?? null;
    }
    if (s.includes('SELECT is_favourite FROM media_items WHERE id = ?')) {
      const item = this.mediaItems.get(params[0]);
      return item ? { is_favourite: item.is_favourite } : null;
    }
    if (s.includes('SELECT COUNT(*) as count FROM media_items WHERE is_favourite = 1')) {
      const count = Array.from(this.mediaItems.values()).filter(m => m.is_favourite === 1).length;
      return { count };
    }
    if (s.includes('SELECT COUNT(*) as count FROM media_items')) {
      return { count: this.mediaItems.size };
    }
    if (s.includes('SELECT * FROM albums WHERE id = ?')) {
      return this.albums.get(params[0]) ?? null;
    }
    if (s.includes('SELECT MAX(sort_order)')) {
      const max = this.albumItems.reduce((m, item) => Math.max(m, item.sort_order), 0);
      return { max_order: max };
    }
    if (s.includes('SELECT COUNT(*) as count FROM album_items WHERE album_id = ?')) {
      const count = this.albumItems.filter(ai => ai.album_id === params[0]).length;
      return { count };
    }
    if (s.includes('SELECT value FROM sync_cursors WHERE key = ?')) {
      const cursor = this.cursors.get(params[0]);
      return cursor ? { value: cursor.value } : null;
    }
    if (s.includes('SELECT * FROM uploads WHERE id = ?')) {
      return this.uploads.get(params[0]) ?? null;
    }
    if (s.includes('SELECT COUNT(*) as c FROM uploads')) {
      if (s.includes("state = 'queued'")) {
        return { c: Array.from(this.uploads.values()).filter(u => u.state === 'queued').length };
      }
      return { c: this.uploads.size };
    }
    return null;
  }

  getAllSync(sql, ...params) {
    const s = sql.trim();
    if (s.includes('FROM media_items') && s.includes('is_favourite = 1')) {
      return Array.from(this.mediaItems.values())
        .filter(m => m.is_favourite === 1)
        .sort((a, b) => b.capture_date.localeCompare(a.capture_date));
    }
    if (s.includes('FROM media_items') && s.includes('md5_checksum = ?')) {
      return Array.from(this.mediaItems.values()).filter(m => m.md5_checksum === params[0]);
    }
    if (s.includes('FROM media_items') && s.includes('name = ? AND size = ?')) {
      return Array.from(this.mediaItems.values()).filter(m => m.name === params[0] && m.size === params[1]);
    }
    if (s.includes('FROM media_items') && s.includes('DISTINCT capture_date')) {
      const dates = Array.from(new Set(Array.from(this.mediaItems.values()).map(m => m.capture_date)));
      dates.sort((a, b) => b.localeCompare(a));
      return dates.map(d => ({ capture_date: d }));
    }
    if (s.includes('FROM media_items')) {
      let items = Array.from(this.mediaItems.values());
      if (s.includes('mime_type LIKE \'image/%\'')) {
        items = items.filter(m => m.mime_type.startsWith('image/'));
      }
      items.sort((a, b) => b.capture_date.localeCompare(a.capture_date));
      return items;
    }
    if (s.includes('FROM albums')) {
      return Array.from(this.albums.values());
    }
    if (s.includes('FROM uploads')) {
      return Array.from(this.uploads.values());
    }
    return [];
  }

  withTransactionSync(fn) {
    fn();
  }

  closeSync() {}
}

const mockDbInstance = new MockDatabase();

module.exports = {
  openDatabaseSync: jest.fn(() => mockDbInstance),
  __mockDb: mockDbInstance,
};
