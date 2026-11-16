# Momento (Drive Photos) — Free Sideloading Guide (iOS 18 & Windows 11)

This guide details how to compile, sign, and install **Momento (Drive Photos)** on a personal **iPhone 13 running iOS 18** using **Windows 11** and a **completely free Apple ID** (without an Apple Developer Program subscription), using a **GitHub Actions macOS runner** and **Sideloadly**.

---

## 1. System Architecture & Distribution Workflow

```
+-----------------------------------------------------------+
| GitHub Actions (macOS-14 Apple Silicon Cloud Runner)     |
| - Runs on free GitHub Actions tier                        |
| - Prebuilds native iOS project (Expo SDK 58 + Pods)       |
| - Compiles Release binary with xcodebuild                 |
| - Packages compiled .app into Payload -> unsigned .ipa    |
| - Uploads "Momento-unsigned-ipa" build artifact           |
+-----------------------------+-----------------------------+
                              | Download artifact to PC
                              v
+-----------------------------------------------------------+
| Windows 11 PC (Sideloadly)                                |
| - Sideloadly communicates with Apple's free auth servers  |
| - Signs IPA using your Free Personal Apple ID             |
| - Injects 7-day development provisioning profile          |
| - Installs signed app onto iPhone 13 over USB or Wi-Fi    |
+-----------------------------+-----------------------------+
                              | USB or Local Wi-Fi Sync
                              v
+-----------------------------------------------------------+
| Physical iPhone 13 (iOS 18)                               |
| - "Developer Mode" enabled (iOS 18 requirement)           |
| - Personal Team Certificate trusted in Settings           |
| - Native standalone app on Home Screen                    |
| - Full access to native camera roll, SQLite, and Google   |
+-----------------------------------------------------------+
```

---

## 2. Core Differences: Free Apple ID vs Paid Developer Account

| Feature | Paid Apple Developer (\$99/year) | Free Apple ID + Sideloadly |
| :--- | :--- | :--- |
| **Cost** | \$99 USD per year | **100% Free** |
| **Distribution Method** | TestFlight | Sideloadly |
| **Provisioning Expiry** | 90 days per build | **7 days** (refreshed automatically or manually) |
| **Max Sideloaded Apps** | Unlimited | **3 active apps** per device |
| **App Review** | Apple automated scan | **Zero Apple review** |
| **Mac / Xcode Requirement** | None (EAS builds) | **None** (GitHub Actions macOS runner builds) |
| **Native Feature Access** | Full | **Full** (SQLite, FileSystem, MediaLibrary, Video) |
| **Google OAuth** | Fully supported | **Fully supported** (URL schemes preserved) |

---

## 3. Step 1: Build the Unsigned IPA via GitHub Actions

The workflow file is located in your repository at [`.github/workflows/build-ios.yml`](file:///d:/prod-Projects/Momento/.github/workflows/build-ios.yml).

1. Push your repository to GitHub (public or private repository).
2. Open your repository in your browser on GitHub.
3. Click the **Actions** tab at the top.
4. In the left sidebar, click **Build Unsigned iOS IPA**.
5. Click the **Run workflow** dropdown on the right and select **Run workflow**.
6. GitHub will launch an Apple Silicon `macos-14` runner:
   - It checks out the code, verifies TypeScript and Jest tests (45/45 passing).
   - Injects your Google OAuth client IDs.
   - Runs `npx expo prebuild --platform ios --clean`.
   - Compiles the native iOS binary using `xcodebuild` without code-signing requirements (`CODE_SIGNING_ALLOWED=NO`).
   - Packages the `.app` inside a standard `Payload/` folder and creates `Momento-unsigned.ipa`.
7. Once the run completes (approx. 10–15 minutes), click on the completed run.
8. Scroll down to the **Artifacts** section at the bottom and download **`Momento-unsigned-ipa`**.
9. Extract the downloaded zip file on your Windows 11 PC to obtain **`Momento-unsigned.ipa`**.

---

## 4. Step 2: Prepare iPhone 13 (Enable Developer Mode in iOS 18)

Starting with iOS 16 and continuing in iOS 18, Apple requires **Developer Mode** to be turned on before running any sideloaded application signed with a free Apple ID:

1. On your iPhone 13, open **Settings**.
2. Scroll down and tap **Privacy & Security**.
3. Scroll to the very bottom and tap **Developer Mode**.
4. Toggle the switch to **On**.
5. A prompt will appear asking to restart your device. Tap **Restart**.
6. After your iPhone reboots, unlock the screen.
7. A system alert will appear: *"Turn on Developer Mode?"*. Tap **Turn On**, then enter your device passcode.

---

## 5. Step 3: Install Sideloadly on Windows 11

Sideloadly communicates directly with your iPhone using Apple's device driver services.

1. **Install Apple Device Drivers (Crucial on Windows):**
   - Sideloadly requires the official non-Microsoft Store versions of **iTunes** and **iCloud**.
   - If you have the Microsoft Store version of iTunes, uninstall it and download the direct 64-bit Windows installer:
     - [iTunes 64-bit for Windows](https://www.apple.com/itunes/download/win64)
     - [iCloud for Windows (standalone)](https://updates.cdn-apple.com/2020/windows/001-39935-20200911-45FB3CA0-F44D-11EA-86F7-4180CE53F5EB/iCloudSetup.exe)
   - Alternatively, Sideloadly has an option to download and install the required standalone drivers directly upon first launch.
2. **Download & Install Sideloadly:**
   - Download the official Windows 64-bit installer from [sideloadly.io](https://sideloadly.io/).
   - Run the installer and launch Sideloadly.

---

## 6. Step 4: Sideload & Sign Momento with Your Free Apple ID

1. Connect your iPhone 13 to your Windows 11 PC using a Lightning-to-USB cable.
2. Unlock your iPhone. If prompted *"Trust This Computer?"*, tap **Trust** and enter your passcode.
3. In Sideloadly:
   - **Device**: Verify that your iPhone 13 appears in the device selector dropdown.
   - **Apple account**: Enter your **Free Apple ID** email address.
   - **IPA Selection**: Click the large icon on the left (or drag and drop **`Momento-unsigned.ipa`** directly onto the Sideloadly window).
   - Under **Advanced Options** (gear icon):
     - Ensure **Signing Mode** is set to **Apple ID Sideload**.
     - Leave **Bundle ID** as original (`com.drivephotos.app`).
4. Click the blue **Start** button.
5. Sideloadly will prompt for your Apple ID password:
   - Enter your Apple ID password.
   - Sideloadly connects to Apple's free developer provisioning API to generate a personal development certificate.
   - When prompted, enter the 2FA verification code sent to your iPhone.
6. Watch the progress bar in Sideloadly:
   - Extracting IPA...
   - Signing application with Free Personal Team Certificate...
   - Installing to device...
   - **Done!**
7. The **Drive Photos** app icon will now appear on your iPhone 13 home screen.

---

## 7. Step 5: Trust Your Free Developer Certificate on iOS 18

When you tap the app icon for the first time, iOS will display an alert: *"Untrusted Developer"*. This is standard Apple security for free personal certificates:

1. Open **Settings** on your iPhone.
2. Tap **General** &rarr; **VPN & Device Management**.
3. Under **Developer App**, tap your Apple ID email address.
4. Tap **Trust "[Your Email Address]"**.
5. Tap **Trust** in the confirmation popup.
6. Return to your home screen and tap **Drive Photos** to launch the app!

---

## 8. Step 6: Verifying Native Functionality & Google OAuth

Once opened on your iPhone 13:

1. **Google OAuth Deep-Linking**:
   - Tap **"Connect with Google Drive"** in Settings or on the welcome card.
   - iOS displays the native authentication alert: `“Drive Photos” Wants to Use “google.com” to Sign In`. Tap **Continue**.
   - Sign in with your Google account.
   - Upon granting permissions, Safari deep-links back through `com.googleusercontent.apps.155400204245-5ng092ij8ibr0hhmi71nprj6hm29acch:/oauth2redirect`.
   - The app resumes instantly and SecureStore securely caches your session.
2. **Native iOS Photo Library**:
   - Tap `+` to open the media picker.
   - Tap **Allow Full Access** when iOS prompts for photo library permissions (`NSPhotoLibraryUsageDescription`).
   - Select photos/videos to queue resumable uploads to Google Drive.
3. **Local SQLite & FileSystem Caching**:
   - Drive thumbnails and metadata are cached locally in SQLite (`expo-sqlite`) and the device cache directory (`expo-file-system`).
   - Media playback (HEIC images, full-screen pinch-to-zoom, MP4/MOV video with `expo-video`) runs with full native hardware acceleration.

---

## 9. Understanding the 7-Day Expiry & Refresh Process

Apple's free developer accounts enforce a strict **7-day certificate validity** on sideloaded apps. After 7 days, attempting to launch the app will show an alert that the app is no longer available.

### How to Keep Momento Running Permanently:

#### Method A: Automatic Wi-Fi Refresh (Zero-Cable Routine)
Sideloadly has built-in automatic background refreshing over local Wi-Fi:
1. In iTunes on Windows, select your iPhone and check **"Sync with this iPhone over Wi-Fi"**.
2. In Sideloadly, under the **Currently Installed** tab, locate **Drive Photos**.
3. Sideloadly tracks days remaining. As long as Sideloadly is left running in your Windows 11 system tray and your iPhone 13 is connected to the same local Wi-Fi network, Sideloadly will **automatically re-sign and refresh the app in the background** before the 7-day limit expires.

#### Method B: Manual USB Refresh (Takes 30 Seconds)
If your computer was off or Wi-Fi refresh was interrupted:
1. Plug your iPhone into your Windows PC.
2. Open Sideloadly.
3. Drag the `Momento-unsigned.ipa` (or click Repeat on the installed list) and click **Start**.
4. The app is re-signed and refreshed.
> [!IMPORTANT]
> **No Data is Lost During Refresh:** Re-signing does **not** uninstall the app. All local databases, photo caches, queued uploads, and Google OAuth login sessions are retained.

---

## 10. Summary of Architectural Integrity

- **Zero Framework Changes:** The app remains 100% React Native + Expo SDK 58.
- **No Downgraded Features:** All gestures, video playback, background chunked uploads, SQLite indexes, and Google Drive sync logic are preserved exactly as coded.
- **Bundle Identifier:** Kept as `com.drivephotos.app` to match the Google Cloud Console iOS Client ID.
- **Testing Verification:** Per instructions, the iOS build is considered verified only once compiled on the macOS runner, signed with Sideloadly, and actively tested on your physical iPhone 13.
