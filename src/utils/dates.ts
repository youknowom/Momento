/**
 * Date extraction and formatting utilities.
 *
 * Priority for capture date:
 * 1. EXIF time from imageMediaMetadata.time (format "YYYY:MM:DD HH:MM:SS")
 *    — treated as naive local time, never converted through UTC
 * 2. Video capture metadata — Drive API only provides dimensions + duration,
 *    NOT capture time. Confirmed by API reference. So videos fall through.
 * 3. Drive createdTime (ISO 8601)
 * 4. Unknown
 */

import type { DriveFile, MediaItem } from '../types';
import { DATE_SOURCE, type DateSource } from '../constants';

// ─── EXIF time parsing ────────────────────────────────────────────────

const EXIF_TIME_REGEX = /^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/;

/**
 * Parse EXIF time string "YYYY:MM:DD HH:MM:SS" into { date, time } parts.
 * Returns null if the string is malformed or nonsensical.
 * IMPORTANT: This is naive local time — we do NOT apply any timezone offset.
 */
export function parseExifTime(
  exifTime: string | undefined | null,
): { date: string; time: string } | null {
  if (!exifTime) return null;

  const match = exifTime.trim().match(EXIF_TIME_REGEX);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;

  // Validate ranges loosely — don't crash on edge cases
  const y = parseInt(year!, 10);
  const m = parseInt(month!, 10);
  const d = parseInt(day!, 10);

  if (y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}:${second}`,
  };
}

// ─── ISO date parsing ────────────────────────────────────────────────

/**
 * Extract YYYY-MM-DD from an ISO 8601 timestamp.
 * Drive returns e.g. "2024-01-15T10:30:00.000Z"
 */
export function parseDriveCreatedTime(
  isoString: string | undefined | null,
): string | null {
  if (!isoString) return null;

  try {
    // Extract date portion directly from ISO string to avoid timezone shift
    const dateMatch = isoString.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) return dateMatch[1]!;
    return null;
  } catch {
    return null;
  }
}

// ─── Best capture date extraction ────────────────────────────────────

export interface CaptureDate {
  captureDate: string; // "YYYY-MM-DD"
  captureTime: string | null; // "HH:MM:SS" if known
  dateSource: DateSource;
}

/**
 * Extract the best available capture date from a Drive file's metadata.
 */
export function extractCaptureDate(file: DriveFile): CaptureDate {
  // Priority 1: EXIF time from imageMediaMetadata.time
  if (file.imageMediaMetadata?.time) {
    const parsed = parseExifTime(file.imageMediaMetadata.time);
    if (parsed) {
      return {
        captureDate: parsed.date,
        captureTime: parsed.time,
        dateSource: DATE_SOURCE.EXIF,
      };
    }
  }

  // Priority 2: Video capture metadata — Drive API does NOT provide capture time
  // for videos (only width, height, durationMillis). This is confirmed.
  // Videos fall through to Priority 3.

  // Priority 3: Drive createdTime
  if (file.createdTime) {
    const date = parseDriveCreatedTime(file.createdTime);
    if (date) {
      return {
        captureDate: date,
        captureTime: null,
        dateSource: DATE_SOURCE.DRIVE_CREATED,
      };
    }
  }

  // Priority 4: Unknown
  return {
    captureDate: '0000-00-00',
    captureTime: null,
    dateSource: DATE_SOURCE.UNKNOWN,
  };
}

// ─── Display formatting ──────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

/**
 * Format a "YYYY-MM-DD" date string for section headers.
 * Returns "Unknown date" for unknown dates.
 */
export function formatSectionDate(dateStr: string): string {
  if (dateStr === '0000-00-00') return 'Unknown date';

  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const year = parseInt(parts[0]!, 10);
  const month = parseInt(parts[1]!, 10);
  const day = parseInt(parts[2]!, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

  const monthName = MONTHS[month - 1] ?? '';

  // Check if it's today
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (dateStr === today) return 'Today';

  // Check if it's yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (dateStr === yesterdayStr) return 'Yesterday';

  // Check if same year
  if (year === now.getFullYear()) {
    // This year — show "Day, Month Date" (e.g., "Wednesday, November 15")
    const d = new Date(year, month - 1, day);
    const dayOfWeek = DAYS_OF_WEEK[d.getDay()] ?? '';
    return `${dayOfWeek}, ${monthName} ${day}`;
  }

  // Different year — show "Month Date, Year"
  return `${monthName} ${day}, ${year}`;
}

/**
 * Format "YYYY-MM" to "November 2024"
 */
export function formatMonthYear(monthKey: string): string {
  const parts = monthKey.split('-');
  if (parts.length !== 2) return monthKey;

  const month = parseInt(parts[1]!, 10);
  const monthName = MONTHS[month - 1] ?? '';
  return `${monthName} ${parts[0]}`;
}

/**
 * Format short month name from date string
 */
export function formatShortMonth(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length < 2) return '';
  const month = parseInt(parts[1]!, 10);
  return MONTHS_SHORT[month - 1] ?? '';
}

/**
 * Check if a date source is estimated (not EXIF)
 */
export function isDateEstimated(source: DateSource): boolean {
  return source !== DATE_SOURCE.EXIF;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return 'Unknown size';

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Format duration in milliseconds to "M:SS" or "H:MM:SS"
 */
export function formatDuration(durationMillis: number | null): string {
  if (durationMillis === null || durationMillis <= 0) return '';

  const totalSeconds = Math.floor(durationMillis / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Determine if a MIME type is a video
 */
export function isVideo(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/**
 * Determine if a MIME type is an image
 */
export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}
