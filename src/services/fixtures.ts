/**
 * Dev fixtures — mock Drive data for development without real credentials.
 *
 * IMPORTANT: This module is gated behind the EXPO_PUBLIC_USE_DEV_FIXTURES flag.
 * Fixture code paths must NEVER ship in production builds.
 * The USE_DEV_FIXTURES constant controls access.
 *
 * Generates a configurable number of mock media items with realistic
 * metadata for testing timeline, viewer, search, and performance.
 */

import { getDatabase } from '../data/database';
import { USE_DEV_FIXTURES } from '../constants';

const FIXTURE_COUNT = 10_000; // Test with 10k items as required

interface FixtureConfig {
  count: number;
  startDate: Date;
  endDate: Date;
}

const DEFAULT_CONFIG: FixtureConfig = {
  count: FIXTURE_COUNT,
  startDate: new Date('2019-01-01'),
  endDate: new Date(),
};

const SAMPLE_CAMERA_MAKES = [
  'Apple', 'Samsung', 'Google', 'Sony', 'Canon', 'Nikon',
];

const SAMPLE_CAMERA_MODELS = [
  'iPhone 15 Pro', 'iPhone 14', 'iPhone 13 Pro Max',
  'Galaxy S24 Ultra', 'Galaxy S23', 'Pixel 8 Pro', 'Pixel 7',
  'Alpha A7 IV', 'EOS R6', 'Z6 III',
];

const IMAGE_MIMES = ['image/jpeg', 'image/heic', 'image/png', 'image/webp'];
const VIDEO_MIMES = ['video/mp4', 'video/quicktime'];

/**
 * Seed the database with fixture data.
 * Only works when USE_DEV_FIXTURES is true.
 */
export function seedFixtures(config: Partial<FixtureConfig> = {}): void {
  if (!USE_DEV_FIXTURES) {
    console.warn('Fixtures are disabled. Set EXPO_PUBLIC_USE_DEV_FIXTURES=true');
    return;
  }

  const cfg = { ...DEFAULT_CONFIG, ...config };
  const db = getDatabase();

  // Check if already seeded
  const existing = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM media_items',
  );
  if ((existing?.count ?? 0) >= cfg.count) {
    return; // Already seeded
  }

  console.log(`[Fixtures] Seeding ${cfg.count} items...`);
  const startTime = Date.now();

  const startMs = cfg.startDate.getTime();
  const endMs = cfg.endDate.getTime();
  const rangeMs = endMs - startMs;

  db.withTransactionSync(() => {
    for (let i = 0; i < cfg.count; i++) {
      const isVideo = Math.random() < 0.15; // 15% videos
      const mimeType = isVideo
        ? VIDEO_MIMES[Math.floor(Math.random() * VIDEO_MIMES.length)]!
        : IMAGE_MIMES[Math.floor(Math.random() * IMAGE_MIMES.length)]!;

      // Generate a date — cluster photos in bursts (like real usage)
      const clusterOffset = Math.random() * rangeMs;
      const withinCluster = Math.random() * 86400000 * 3; // up to 3 days spread
      const dateMs = startMs + clusterOffset + withinCluster;
      const date = new Date(Math.min(dateMs, endMs));

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      const second = String(date.getSeconds()).padStart(2, '0');

      const captureDate = `${year}-${month}-${day}`;
      const captureTime = `${hour}:${minute}:${second}`;
      const exifTime = `${year}:${month}:${day} ${hour}:${minute}:${second}`;

      const fileId = `fixture_${String(i).padStart(6, '0')}`;
      const ext = isVideo
        ? mimeType === 'video/mp4' ? '.mp4' : '.mov'
        : mimeType === 'image/heic' ? '.heic'
        : mimeType === 'image/png' ? '.png'
        : mimeType === 'image/webp' ? '.webp'
        : '.jpg';
      const fileName = `IMG_${year}${month}${day}_${hour}${minute}${second}${ext}`;

      const width = isVideo
        ? [1920, 3840, 1280][Math.floor(Math.random() * 3)]!
        : [4032, 3024, 2048, 1920][Math.floor(Math.random() * 4)]!;
      const height = isVideo
        ? [1080, 2160, 720][Math.floor(Math.random() * 3)]!
        : [3024, 4032, 1536, 1080][Math.floor(Math.random() * 4)]!;

      const cameraMake =
        SAMPLE_CAMERA_MAKES[Math.floor(Math.random() * SAMPLE_CAMERA_MAKES.length)]!;
      const cameraModel =
        SAMPLE_CAMERA_MODELS[Math.floor(Math.random() * SAMPLE_CAMERA_MODELS.length)]!;

      const size = isVideo
        ? Math.floor(20_000_000 + Math.random() * 200_000_000) // 20–220 MB
        : Math.floor(1_000_000 + Math.random() * 10_000_000); // 1–11 MB

      const durationMillis = isVideo
        ? Math.floor(3000 + Math.random() * 120000) // 3s–2min
        : null;

      // Generate a fake MD5 (32 hex chars)
      const md5 = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join('');

      db.runSync(
        `INSERT OR IGNORE INTO media_items (
          id, name, original_filename, mime_type, size, md5_checksum,
          drive_created_time, drive_modified_time, parent_id, thumbnail_link,
          width, height, exif_time, camera_make, camera_model,
          duration_millis, capture_date, capture_time, date_source,
          is_favourite, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        fileId,
        fileName,
        fileName,
        mimeType,
        size,
        md5,
        date.toISOString(),
        date.toISOString(),
        'fixture_root',
        `https://lh3.googleusercontent.com/fixture_thumb_${fileId}=s220`,
        width,
        height,
        isVideo ? null : exifTime,
        isVideo ? null : cameraMake,
        isVideo ? null : cameraModel,
        durationMillis,
        captureDate,
        captureTime,
        isVideo ? 'drive_created' : 'exif',
        Math.random() < 0.05 ? 1 : 0, // 5% favourited
        new Date().toISOString(),
      );
    }
  });

  const elapsed = Date.now() - startTime;
  console.log(`[Fixtures] Seeded ${cfg.count} items in ${elapsed}ms`);
}

/**
 * Clear all fixture data.
 */
export function clearFixtures(): void {
  if (!USE_DEV_FIXTURES) return;
  const db = getDatabase();
  db.runSync("DELETE FROM media_items WHERE id LIKE 'fixture_%'");
}
