# Momento (Drive Photos) — iOS Installation & TestFlight Guide

This guide provides end-to-end instructions for building, signing, and installing **Momento (Drive Photos)** directly on your physical iPhone using **Expo EAS Cloud Build** and **Apple TestFlight** from a **Windows 11** development environment (no Mac or local Xcode required).

---

## Architecture & Distribution Strategy

```
+-----------------------------------------------------------+
| Windows 11 PC (d:\prod-Projects\Momento)                  |
| - TypeScript & Jest verified                              |
| - Native Expo modules & Hermes JS bundle                  |
| - Command: npx eas-cli build --platform ios ...          |
+-----------------------------+-----------------------------+
                              | Uploads code to EAS
                              v
+-----------------------------------------------------------+
| Expo EAS Cloud (Apple Silicon macOS Build Worker)        |
| - Generates iOS project via Prebuild                      |
| - Connects to Apple Developer API for certificates       |
| - Compiles standalone native .ipa archive                 |
+-----------------------------+-----------------------------+
                              | Uploads .ipa via EAS Submit
                              v
+-----------------------------------------------------------+
| Apple App Store Connect & TestFlight                     |
| - Processes .ipa build                                    |
| - Private Internal Testing (NO App Store Review required) |
+-----------------------------+-----------------------------+
                              | Instant OTA invite
                              v
+-----------------------------------------------------------+
| Physical iPhone                                           |
| - TestFlight App -> Tap "Install"                         |
| - Native app on iOS Home Screen                           |
+-----------------------------------------------------------+
```

### Why TestFlight for Personal Use?
1. **True Standalone App:** It runs as an independent native app on your iPhone home screen (not inside Expo Go).
2. **No Mac / No Xcode:** EAS compiles and signs the `.ipa` entirely in the cloud.
3. **No Cable / No Manual UDID Management:** Builds arrive wirelessly over the air.
4. **Internal Testing requires zero review:** Apple does **not** review internal TestFlight builds. They become available immediately after automated server processing (usually 5–15 minutes).
5. **Private:** The app is never submitted for public App Store release.

---

## Prerequisites

Before starting, ensure you have:

1. **Apple Developer Account (Paid: \$99/year):**
   - Active membership at [developer.apple.com](https://developer.apple.com/).
   - Required by Apple for TestFlight distribution and generating production distribution certificates.
2. **Expo Account:**
   - Logged in as `youknowom` (linked to project ID `fc9b300e-66c6-45c5-93e8-8b8a8bd805ad`).
3. **EAS CLI on Windows:**
   - Run `npx eas-cli --version` in PowerShell to verify.
4. **Physical iPhone:**
   - Running iOS 15.0 or later.
   - Install the free **TestFlight** app from the [Apple App Store](https://apps.apple.com/app/testflight/id899247664).
5. **Google Cloud Console Configuration:**
   - Project: "Drive Photos Personal"
   - Bundle ID configured: `com.drivephotos.app`
   - iOS Client ID: `155400204245-5ng092ij8ibr0hhmi71nprj6hm29acch.apps.googleusercontent.com`
   - Test User: Your Google email added under OAuth Consent Screen > Audience.

---

## Step 1: Register the App in App Store Connect (One-Time)

Before EAS Submit can push builds to TestFlight, an app record must exist in App Store Connect:

1. Open your browser and navigate to [App Store Connect](https://appstoreconnect.apple.com/).
2. Sign in with your Apple Developer Apple ID.
3. Click **Apps** (top left).
4. Click the blue **`+`** icon and select **New App**.
5. Fill in the modal fields:
   - **Platforms:** Select **iOS**.
   - **Name:** Enter `Drive Photos` (if taken by another developer worldwide, use a personal variant such as `Momento Drive Photos` or `Drive Photos (Personal)`).
   - **Primary Language:** `English (US)` (or your preferred language).
   - **Bundle ID:** Select `com.drivephotos.app`.
     > *Note:* If `com.drivephotos.app` is not in the dropdown yet, go to [Apple Developer Identifiers](https://developer.apple.com/account/resources/identifiers/list), click `+`, choose "App IDs", enter Description "Drive Photos" and Bundle ID "Explicit: com.drivephotos.app", and click "Register". Then return to App Store Connect.
   - **SKU:** Enter any unique string, e.g. `drivephotos-ios-01`.
   - **User Access:** Select **Full Access**.
6. Click **Create**.

> [!NOTE]
> Creating this entry does **not** publish your app. Your app remains 100% private and accessible only to you through TestFlight.

---

## Step 2: Build the iOS App with EAS Cloud

In your Windows 11 PowerShell terminal at `d:\prod-Projects\Momento`:

```powershell
npx eas-cli build --platform ios --profile production
```

### What to Expect in Terminal Prompts:
1. **Apple Account Login:**
   ```text
   ? Do you want to log in to your Apple account? » (Y/n)
   ```
   - Type `Y` and press Enter.
   - When prompted for `Apple ID:`, enter your Apple Developer email address.
   - When prompted for `Password:`, enter your Apple ID password.
   - When prompted for a 2FA verification code, enter the 6-digit code sent to your iPhone or trusted Apple device.
2. **Automatic Credential Management:**
   - EAS will check Apple Developer Portal for an **iOS Distribution Certificate** and **Provisioning Profile**.
   - If one doesn't exist, EAS will automatically generate one using your Apple Developer account and securely store it in your Expo account's encrypted credentials vault.
3. **Encryption Compliance Prompt:**
   - Because `ITSAppUsesNonExemptEncryption: false` is configured in `app.json`, EAS and Apple recognize that the app only uses standard HTTPS/TLS and does not require manual export documentation.
4. **Cloud Build Starts:**
   - EAS will print a URL:
     ```text
     https://expo.dev/accounts/youknowom/projects/drive-photos/builds/<build-id>
     ```
   - You can open this link in your browser to watch the real-time build logs on Expo's Apple Silicon cloud runners.
   - You can safely close your Windows terminal while the build completes in the cloud.

---

## Step 3: Submit the Build to TestFlight

You can submit automatically or manually:

### Option A: Automatic Build & Submit (Recommended)
You can trigger both the build and TestFlight upload in a single command:

```powershell
npx eas-cli build --platform ios --profile production --auto-submit
```
Once the cloud worker finishes compiling the `.ipa`, EAS will immediately transfer it to Apple App Store Connect without any further prompt.

### Option B: Submit an Existing Completed Build
If you ran `eas build` without `--auto-submit`, submit the finished build with:

```powershell
npx eas-cli submit --platform ios
```
- EAS will show your recent production builds.
- Select the latest build by pressing Enter.
- EAS will upload the `.ipa` package directly into your App Store Connect account.

---

## Step 4: Enable TestFlight Internal Testing

Once EAS Submit finishes uploading the build:

1. Open [App Store Connect](https://appstoreconnect.apple.com/) -> **Apps** -> **Drive Photos**.
2. Click on the **TestFlight** tab at the top.
3. Under **iOS**, you will see your uploaded build (e.g., Version `1.0.0 (1)`).
   - Its status will initially show **"Processing"**.
   - Apple's backend takes between **5 to 15 minutes** to process the build. Refresh the page periodically.
4. Once processing is complete, its status will change to **"Ready to Test"**.
5. In the left sidebar under **Internal Testing**:
   - Click the **`+`** icon next to "Internal Groups" to create a group (or click "App Store Connect Users").
   - Name it `Personal Testing`.
   - Under **Testers**, click **`+`** and add your Apple ID.
   - Under **Builds**, click **`+`** and select the `1.0.0 (1)` build.
   - Save changes.

---

## Step 5: Install on Your Physical iPhone

1. On your iPhone, open the **Mail** app or check the email associated with your Apple ID.
2. You will see an email from Apple TestFlight: *"You've been invited to test Drive Photos"*.
3. Tap **View in TestFlight** (or open the **TestFlight** app directly on your iPhone).
4. Tap **Accept**, then tap **Install**.
5. Once downloaded, **Drive Photos** will appear directly on your iPhone home screen like any native App Store app (with a small yellow dot indicating a TestFlight build).

---

## Step 6: Testing App Functionality on iPhone

When opening the app for the first time:

1. **Splash Screen & UI:** Verify the splash icon and dark/light system theme transitions.
2. **Google Sign-In Flow:**
   - Tap **"Connect with Google Drive"** in the Settings tab or on the welcome banner.
   - iOS displays a native modal: `“Drive Photos” Wants to Use “google.com” to Sign In`. Tap **Continue**.
   - Sign in with your Google Account (the email listed as a Test User in Google Cloud Console).
   - Review permissions (Google Drive read and upload access) and tap **Allow**.
   - The browser redirects back through custom scheme `com.googleusercontent.apps.155400204245-5ng092ij8ibr0hhmi71nprj6hm29acch:/oauth2redirect`.
   - The app resumes instantly, stores the refresh token in iOS Secure Enclave (`expo-secure-store`), and displays your Google profile email and avatar.
3. **Photo Browsing & Media Cache:**
   - The sync engine fetches media metadata from Google Drive and caches thumbnails locally using `expo-sqlite` and `expo-file-system`.
   - Test zoom, pinch, and full-resolution viewing in the Viewer.
4. **Photo Uploads:**
   - Tap the `+` button in the Timeline or Album screen.
   - iOS requests Photo Library permission (`NSPhotoLibraryUsageDescription`). Tap **Allow Full Access**.
   - Select photos/videos to queue background resumable chunked uploads to your Google Drive `Drive Photos Uploads` folder.

---

## Step 7: How to Update Your Code Going Forward

Whenever you edit files or add features on your Windows machine:

1. **Verify your code locally:**
   ```powershell
   npx tsc --noEmit
   npm test
   npx expo-doctor
   ```
2. **Ship an updated build:**
   ```powershell
   npx eas-cli build --platform ios --profile production --auto-submit
   ```
   - Because `autoIncrement: true` is configured in `eas.json`, EAS automatically increments the iOS `buildNumber` (e.g. `1` -> `2` -> `3`).
3. **Install the update on iPhone:**
   - Once Apple finishes processing the build (~5–10 mins), TestFlight will push a push notification to your iPhone: *"Drive Photos 1.0.0 (2) is available to test"*.
   - Tap **Update** in TestFlight to install the latest build over the existing one without losing local data or credentials.

---

## Troubleshooting & Key Configurations

### 1. App Store Connect API Key (Recommended to Avoid Password / 2FA Prompts)
If you prefer not to enter your Apple ID password and 2FA code during builds, generate an App Store Connect API Key:
1. Go to [App Store Connect > Users and Access > Integrations > App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api).
2. Click `+` to generate a key. Name it `EAS Build`, select Role **Admin** or **App Manager**.
3. Download the `.p8` key file (Apple only allows downloading it once).
4. Run `npx eas-cli credentials` in PowerShell, choose **iOS > Production**, and select **App Store Connect API Key**. Paste the Key ID, Issuer ID, and the `.p8` file. EAS will use this key for all future automated builds and submissions.

### 2. Google OAuth Error 400 (`redirect_uri_mismatch`)
If Google throws a redirect mismatch error on iOS:
- Standalone iOS builds do **not** use `drivephotos://` for Google OAuth.
- Google OAuth on iOS strictly requires the reversed client ID scheme:
  ```
  com.googleusercontent.apps.155400204245-5ng092ij8ibr0hhmi71nprj6hm29acch:/oauth2redirect
  ```
- Both `app.json` (`scheme` array) and `src/services/auth.ts` (`getRedirectUri()`) are already configured to match this exact format.

### 3. Missing Export Compliance Warning
If App Store Connect ever flags missing export compliance:
- `app.json` has `ITSAppUsesNonExemptEncryption: false` configured under `expo.ios.infoPlist`.
- This informs Apple that the app only utilizes standard operating system encryption (HTTPS/TLS) and bypasses manual export documentation requirements.
