import {
  parseExifTime,
  parseDriveCreatedTime,
  extractCaptureDate,
  formatSectionDate,
  formatMonthYear,
  formatFileSize,
  formatDuration,
  isDateEstimated,
} from '../src/utils/dates';
import { DATE_SOURCE } from '../src/constants';
import type { DriveFile } from '../src/types';

describe('Date Utilities', () => {
  describe('parseExifTime', () => {
    it('parses valid EXIF time string "YYYY:MM:DD HH:MM:SS"', () => {
      const result = parseExifTime('2023:08:15 14:30:45');
      expect(result).toEqual({
        date: '2023-08-15',
        time: '14:30:45',
      });
    });

    it('handles leading and trailing whitespace', () => {
      const result = parseExifTime('  2024:01:01 09:00:00  ');
      expect(result).toEqual({
        date: '2024-01-01',
        time: '09:00:00',
      });
    });

    it('returns null for empty, null, or undefined strings', () => {
      expect(parseExifTime('')).toBeNull();
      expect(parseExifTime(null)).toBeNull();
      expect(parseExifTime(undefined)).toBeNull();
    });

    it('returns null for malformed strings', () => {
      expect(parseExifTime('2023-08-15 14:30:45')).toBeNull(); // dashes instead of colons
      expect(parseExifTime('invalid-date')).toBeNull();
      expect(parseExifTime('99999:99:99 99:99:99')).toBeNull(); // out of range
      expect(parseExifTime('1850:01:01 12:00:00')).toBeNull(); // year < 1900
    });

    it('does not convert naive local time through UTC', () => {
      const result = parseExifTime('2022:12:31 23:59:59');
      expect(result?.date).toBe('2022-12-31');
      expect(result?.time).toBe('23:59:59');
    });
  });

  describe('parseDriveCreatedTime', () => {
    it('extracts YYYY-MM-DD from ISO 8601 string', () => {
      expect(parseDriveCreatedTime('2024-03-20T10:15:30.000Z')).toBe('2024-03-20');
      expect(parseDriveCreatedTime('2021-11-05T23:59:59.999Z')).toBe('2021-11-05');
    });

    it('returns null for missing or invalid dates', () => {
      expect(parseDriveCreatedTime(null)).toBeNull();
      expect(parseDriveCreatedTime(undefined)).toBeNull();
      expect(parseDriveCreatedTime('not-a-date')).toBeNull();
    });
  });

  describe('extractCaptureDate priority logic', () => {
    it('Priority 1: Uses EXIF time when available on image', () => {
      const file: DriveFile = {
        id: 'file1',
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
        createdTime: '2024-05-10T12:00:00.000Z',
        imageMediaMetadata: {
          time: '2022:04:15 18:20:00',
        },
      };

      const result = extractCaptureDate(file);
      expect(result.captureDate).toBe('2022-04-15');
      expect(result.captureTime).toBe('18:20:00');
      expect(result.dateSource).toBe(DATE_SOURCE.EXIF);
    });

    it('Priority 3: Falls back to Drive createdTime when no EXIF time is available', () => {
      const file: DriveFile = {
        id: 'file2',
        name: 'screenshot.png',
        mimeType: 'image/png',
        createdTime: '2023-09-01T08:00:00.000Z',
        imageMediaMetadata: {
          width: 1080,
          height: 1920,
        },
      };

      const result = extractCaptureDate(file);
      expect(result.captureDate).toBe('2023-09-01');
      expect(result.captureTime).toBeNull();
      expect(result.dateSource).toBe(DATE_SOURCE.DRIVE_CREATED);
    });

    it('Videos fall through to Drive createdTime (videoMediaMetadata has no capture time)', () => {
      const file: DriveFile = {
        id: 'file3',
        name: 'video.mp4',
        mimeType: 'video/mp4',
        createdTime: '2024-02-14T15:30:00.000Z',
        videoMediaMetadata: {
          width: 1920,
          height: 1080,
          durationMillis: '45000',
        },
      };

      const result = extractCaptureDate(file);
      expect(result.captureDate).toBe('2024-02-14');
      expect(result.dateSource).toBe(DATE_SOURCE.DRIVE_CREATED);
    });

    it('Priority 4: Returns unknown date if neither EXIF nor createdTime exists', () => {
      const file: DriveFile = {
        id: 'file4',
        name: 'unknown.jpg',
        mimeType: 'image/jpeg',
      };

      const result = extractCaptureDate(file);
      expect(result.captureDate).toBe('0000-00-00');
      expect(result.dateSource).toBe(DATE_SOURCE.UNKNOWN);
    });
  });

  describe('formatSectionDate', () => {
    it('returns "Unknown date" for 0000-00-00', () => {
      expect(formatSectionDate('0000-00-00')).toBe('Unknown date');
    });

    it('formats valid dates nicely', () => {
      const formatted = formatSectionDate('2020-07-04');
      expect(formatted).toBe('July 4, 2020');
    });
  });

  describe('formatMonthYear', () => {
    it('formats YYYY-MM to human readable month and year', () => {
      expect(formatMonthYear('2024-11')).toBe('November 2024');
      expect(formatMonthYear('2023-01')).toBe('January 2023');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes into readable units', () => {
      expect(formatFileSize(null)).toBe('Unknown size');
      expect(formatFileSize(0)).toBe('Unknown size');
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(1073741824)).toBe('1.0 GB');
    });
  });

  describe('formatDuration', () => {
    it('formats milliseconds to MM:SS and H:MM:SS', () => {
      expect(formatDuration(null)).toBe('');
      expect(formatDuration(0)).toBe('');
      expect(formatDuration(45000)).toBe('0:45');
      expect(formatDuration(125000)).toBe('2:05');
      expect(formatDuration(3665000)).toBe('1:01:05');
    });
  });

  describe('isDateEstimated', () => {
    it('returns false only for EXIF', () => {
      expect(isDateEstimated(DATE_SOURCE.EXIF)).toBe(false);
      expect(isDateEstimated(DATE_SOURCE.DRIVE_CREATED)).toBe(true);
      expect(isDateEstimated(DATE_SOURCE.UNKNOWN)).toBe(true);
    });
  });
});
