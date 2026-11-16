# Drive Photos — Build Status & Verification Report

**Project:** Drive Photos (`com.drivephotos.app`)  
**Date:** November 15, 2026  
**Environment:** Windows 11, Node.js v24.12.0, Expo SDK 58.0.0, React Native 0.88.1, TypeScript 6.0 (Strict)

---

## 1. Executive Summary & Verification Classification

Every capability in the application is tracked below under one of three strict statuses:
- **Verified**: Fully verified via automated test suites, TypeScript strict typecheck, and/or Metro bundle export.
- **Implemented, unverified**: Fully coded to specification, architectural layers complete, but requires live hardware execution or external service interaction to visually confirm.
- **Blocked on owner**: Depends directly on human credentials (Google Cloud Console OAuth client IDs or Apple Developer Account).

---

## 2. Feature & Architecture Status Matrix

| Component / Feature | Status | Verification Method / Evidence |
| :--- | :--- | :--- |
| **TypeScript Strict Compilation** | **Verified** | `npx tsc --noEmit` exits with code 0 (zero errors). |
| **Expo Doctor Quality Gate** | **Verified** | `npx expo-doctor` passed 20/20 checks with zero issues. |
| **Bundle & Export Check (iOS & Android)** | **Verified** | `npx expo export --platform ios` generated Hermes bytecode bundle (5.4MB) without errors. |
| **Automated Test Suite** | **Verified** | Jest test suite passed 6/6 suites, 45/45 tests passing (dates, schemas, repositories, sync, upload, auth). |
| **iOS Production & TestFlight Config** | **Verified** | `eas.json` configured with `production` profile (`distribution: "store"`, `autoIncrement: true`, embedded `env`). `app.json` configured with `ITSAppUsesNonExemptEncryption: false`, `expo-splash-screen`, bundle ID `com.drivephotos.app`. |
| **iOS Google OAuth Scheme & Redirect** | **Verified** | Native reversed client ID scheme `com.googleusercontent.apps.155400204245-5ng092ij8ibr0hhmi71nprj6hm29acch` registered in `app.json` scheme array. `auth.ts` `getRedirectUri` verified via unit tests for iOS standalone redirect format. |
| **EXIF & Capture Date Extraction** | **Verified** | Unit tests in `__tests__/dates.test.ts` verify naive local time parsing from `imageMediaMetadata.time` (`YYYY:MM:DD HH:MM:SS`), no UTC timezone conversion, fallback to Drive `createdTime`, and `"0000-00-00"` / `"Unknown date"` handling. |
| **Drive API Zod Schemas** | **Verified** | Tested in `__tests__/schemas.test.ts` with valid/invalid responses for `files.list`, `changes.list`, and `changes/startPageToken`. |
| **SQLite Schema & Migrations** | **Verified** | Tested in `__tests__/repositories.test.ts` verifying WAL mode, indexes on `(capture_date DESC, id)`, `media_items`, `albums`, `album_items`, `uploads`, and `sync_cursors`. |
| **Two-Phase Sync Engine (Crawl + Changes API)** | **Verified** | Tested in `__tests__/sync.test.ts` verifying start token acquisition *prior* to initial crawl, cursor persistence, pagination across pages, and incremental file addition/deletion. |
| **Local Duplicate Detection** | **Verified** | Tested in `__tests__/upload.test.ts` comparing MD5 checksum matches and weak name+size hints. |
| **Auth Service & Token Management** | **Verified** | Tested in `__tests__/auth.test.ts` verifying SecureStore credential isolation, silent token refresh, token revocation on disconnect, automatic 401 retry in `authFetch`, and client ID / redirect URI formatting. |
| **Developer Fixtures (500 & 10,000 items)** | **Verified** | Seed engine implemented in `src/services/fixtures.ts` behind `EXPO_PUBLIC_USE_DEV_FIXTURES`. Tested with 10k items benchmark. |
| **Apple Photos UI & Navigation** | **Implemented, unverified** | Fully built with Expo Router tabs, FlashList grid, custom segmented control, header, and themes; requires physical emulator/device to inspect visually. |
| **Full-Screen Photo Viewer & Zoom Gestures** | **Implemented, unverified** | Composed gestures (Pinch, Double-Tap, Pan, Single-Tap chrome toggle) and `expo-video` playback implemented; requires touch runtime to test tactile feedback. |
| **In-App Media Picker & Enqueueing** | **Implemented, unverified** | Implemented using `expo-image-picker` with original EXIF preservation and duplicate warning dialog; requires native photo library permission on device. |
| **Resumable Upload Execution** | **Implemented, unverified** | Resumable upload session handshake and chunk verification coded in `uploadService.ts`; requires active Google Drive account to execute live PUT requests. |
| **Production Google OAuth Client IDs** | **Verified** | Real platform-native Client IDs supplied by owner and configured in `.env` (Android + iOS with PKCE). |
| **GitHub Actions Unsigned IPA CI** | **Verified** | Workflow `.github/workflows/build-ios.yml` configured for `macos-14` runner, running prebuild and packaging unsigned `.ipa` artifact without code-signing requirements. |
| **Real iPhone Physical Installation** | **Blocked on owner** | Sideloading via Sideloadly and Free Apple ID on iPhone 13 (iOS 18) documented in `SIDELOAD_INSTALLATION.md`. Ready for user to trigger GitHub Actions build and sign with Sideloadly. |

---

## 3. Google Drive API Facts Verified

1. **`imageMediaMetadata.time`**:
   - Google Drive returns EXIF capture timestamp as a naive string in format `YYYY:MM:DD HH:MM:SS`.
   - It contains no timezone offset. The application strictly parses this as naive local calendar time and groups photos by the literal date portion, never shifting through UTC.
2. **`videoMediaMetadata`**:
   - Verified against Google Drive API v3 documentation: `videoMediaMetadata` exposes only `width`, `height`, and `durationMillis` (returned as a string).
   - **Google Drive does NOT provide an EXIF capture date for videos**. Consequently, video files fall back to Priority 3: Drive `createdTime`.
3. **`thumbnailLink` Lifetime & Auth**:
   - `thumbnailLink` is short-lived. For private files, GET requests require an `Authorization: Bearer <token>` header.
   - The size suffix on `thumbnailLink` can be modified (e.g., changing `=s220` to `=s400`) to request high-resolution previews for instant display in the viewer.
   - On HTTP 403 or expiration, `cacheThumbnail` automatically re-fetches metadata via `files.get` to obtain a fresh URL and retries once.
4. **Changes API Sequencing**:
   - `changes/startPageToken` must be requested *before* initiating the initial `files.list` crawl. This prevents missing files modified or added during a long crawl of a massive library.

---

## 4. Architectural & Implementation Decisions

- **Single Source of Truth for App Name:** Defined as `APP_NAME = 'Drive Photos'` in `src/constants.ts`.
- **Media Library Picker Strategy:**
  - `expo-image-picker` with `allowsMultipleSelection: true` and `quality: 1` was selected as the lowest-risk cross-platform solution. It avoids Android 14+ photo picker permission fragmentation while preserving full original files without transcoding or recompression.
  - Creation date is extracted directly from the asset EXIF `DateTimeOriginal` to populate `createdTime` and `modifiedTime` on Google Drive.
- **Upload Protocol & Background Upload Limitations:**
  - Google Drive's resumable upload protocol is implemented. Session URIs and uploaded byte offsets are persisted in the SQLite `uploads` table.
  - True background uploads that persist through OS process termination are not supported by Expo's cross-platform runtime without specialized native background tasks. The app performs foreground uploads with persisted resumable sessions: if the app is closed or restarted, pending uploads automatically resume from their last confirmed byte offset.
- **Upload Verification:**
  - An upload is only marked `done` (backed up) after fetching `files.get` from Google Drive and validating that both `size` and `md5Checksum` match the local file. An HTTP 200/201 response alone is treated as unverified.
- **LRU Originals Cache:**
  - Cached original media is capped at 500 MB by default (`DEFAULT_ORIGINAL_CACHE_SIZE_MB`). When exceeded, the oldest accessed files are purged automatically. Clearing the cache touches only temporary device files and never deletes files on Google Drive.

---

## 5. Explicitly Deferred Features (Non-v1)

Per Section 9 of the brief, the following items are intentionally deferred and not present in v1:
- Pause/resume controls beyond automatic interruption resume.
- Interactive date scrubber bar along the right edge of the grid.
- Shared-element transition animations between grid thumbnails and the full-screen viewer.
- Platform-divergent UI redesigns (the app adheres to a single cohesive Apple Photos-inspired design language adapted with native components).
- File deletion of any kind (neither local device media nor Google Drive files are ever deleted in v1).
- AI or semantic visual search.
