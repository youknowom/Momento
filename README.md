# Drive Photos

**Drive Photos** is an independent, personal-use mobile photo gallery app built with React Native and Expo. It uses **Google Drive** as its cloud media library while delivering an **Apple Photos-inspired user experience** on both iOS and Android from a single codebase.

---

## Key Highlights

- **Sync-First Architecture:** Google Drive metadata is crawled page-by-page into local SQLite (`expo-sqlite`). The entire UI (gallery timeline, albums, search, details) reads strictly from local SQLite using indexed keyset pagination ordered by capture date.
- **Incremental Sync with Changes API:** A Changes API start token is fetched *prior* to initial crawl, allowing subsequent background or manual syncs to instantly reflect newly added or deleted media in Drive.
- **Smart Date Extraction:** Naive EXIF capture time (`imageMediaMetadata.time`) is prioritized without UTC conversion so local capture dates remain faithful; falls back cleanly to Drive `createdTime` with visual "Estimated date" badges for transparency.
- **Resumable Upload Engine with Duplicate Protection:** Uses Drive's resumable upload protocol. Upload sessions and byte offsets are persisted in SQLite to survive app interruptions. Local MD5 hashes are checked against synced items to flag duplicates before uploading.
- **Full-Screen Immersive Viewer:** Double-tap zoom, pinch-to-zoom, horizontal photo paging, single-tap chrome toggling, native sharing, favourite toggling, video playback with `expo-video`, and a slide-up photo details panel.
- **Security & Privacy:** Platform-native OAuth with PKCE (no client secret). Scopes strictly limited to `drive.readonly` and `drive.file`. Hardware-backed `expo-secure-store` for tokens; zero 3rd-party telemetry. v1 contains **no deletion** features.

---

## Prerequisites

- **Node.js**: v18+ (tested on Node.js v24)
- **Windows 11** development machine
- **Android Studio** (for local Android emulator testing)
- **Google Cloud Console account** (see [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md))
- **Apple Developer Account** (for real iPhone builds via EAS)

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
cd Momento
npm install --legacy-peer-deps
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

If you do not have Google Cloud OAuth credentials ready, keep fixtures enabled (`EXPO_PUBLIC_USE_DEV_FIXTURES=true`). The app will launch with pre-seeded mock photo and video items covering years of capture dates.

---

## Running on Android (Windows 11 Dev Loop)

Because this app utilizes native modules (SQLite, FileSystem, SecureStore, Video), **Expo Go is not supported**. You must use a Development Build.

1. Ensure an Android Emulator is running (or a physical Android device is connected with USB debugging enabled).
2. Start the development server and build the Android client:

```bash
npx expo run:android
```

Or start the bundler:

```bash
npx expo start
```

---

## Building for iOS via EAS (Physical iPhone Target)

Because development occurs on Windows, building the iOS native binary is done in the cloud using **EAS (Expo Application Services)**:

### 1. Install EAS CLI and Log In

```bash
npm install -g eas-cli
eas login
```

### 2. Configure EAS Project

```bash
eas build:configure
```

### 3. Requirements for Real iPhone Installation

> [!IMPORTANT]
> Apple enforces strict code signing on physical iOS devices. To install and run the app on your personal iPhone:
> 1. You will need an **Apple Developer Account** (paid membership, \$99/year).
> 2. Register your iPhone's UDID with EAS:
>    ```bash
>    eas device:create
>    ```
> 3. Build an internal development build:
>    ```bash
>    eas build --profile development --platform ios
>    ```
> 4. Scan the resulting QR code with your iPhone's camera to install the development build directly via ad-hoc provisioning.
> 5. Once installed, start the local Metro server (`npx expo start`) and connect your iPhone over the same Wi-Fi network.

---

## Verification & Testing

Run the automated verification suite:

```bash
# 1. Run Jest Unit Tests (40 passing tests)
npm test

# 2. Strict TypeScript Typecheck (0 errors)
npx tsc --noEmit

# 3. Expo Doctor Diagnostic Suite (20/20 checks passed)
npx expo-doctor

# 4. Metro Bundling & Export Verification
npx expo export
```

---

## Project Structure

```
Momento/
├── assets/                  # App icon, adaptive launcher icons, splash screen
├── src/
│   ├── app/                 # Expo Router file-based screens
│   │   ├── (tabs)/          # Bottom tab navigation
│   │   │   ├── _layout.tsx  # Apple Photos translucent tab bar
│   │   │   ├── index.tsx    # Library timeline grid (FlashList)
│   │   │   ├── albums.tsx   # My Albums, Media Types, Utilities
│   │   │   ├── search.tsx   # Instant search and media filtering
│   │   │   └── settings.tsx # Account, Sync, Cache, and Privacy
│   │   ├── viewer/[id].tsx  # Full-screen photo/video viewer with gestures
│   │   ├── album/[id].tsx   # Album detail and photo management
│   │   ├── uploads.tsx      # Upload queue progress and verification
│   │   └── _layout.tsx      # Root providers (Theme, GestureHandler, Safe Area)
│   ├── components/          # UI components (Apple-inspired fidelity)
│   │   ├── PhotoThumbnail.tsx
│   │   ├── TimelineHeader.tsx
│   │   ├── ViewModeSegmentedControl.tsx
│   │   ├── PhotoDetailsSheet.tsx
│   │   ├── MediaPickerModal.tsx
│   │   ├── SyncStatusBar.tsx
│   │   └── EmptyState.tsx
│   ├── data/                # SQLite repositories & migrations
│   │   ├── database.ts      # Schema, indexes, WAL mode
│   │   ├── mediaRepository.ts
│   │   ├── albumRepository.ts
│   │   └── uploadRepository.ts
│   ├── services/            # Application services
│   │   ├── auth.ts          # PKCE OAuth, silent refresh, SecureStore
│   │   ├── driveClient.ts   # Google Drive v3 client & resumable upload
│   │   ├── syncEngine.ts    # Two-phase crawl & Changes API engine
│   │   ├── uploadService.ts # Resumable upload processor & verification
│   │   ├── cacheManager.ts  # Disk thumbnail & LRU original cache
│   │   └── fixtures.ts      # 10k items dev fixture engine
│   ├── utils/
│   │   └── dates.ts         # EXIF naive date parsing & formatters
│   ├── constants.ts         # Single source of truth constants
│   ├── theme.ts             # Apple Photos typography & neutral palette
│   └── ThemeProvider.tsx    # Light/Dark dynamic theme provider
├── __tests__/               # Unit test suites (Jest)
├── BUILD_STATUS.md          # Honest verification & status report
└── GOOGLE_OAUTH_SETUP.md    # Step-by-step Google Cloud guide
```

---

## License

Personal, private use. Not affiliated with or endorsed by Apple Inc. or Google LLC.
