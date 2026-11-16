# Google Cloud OAuth Setup Guide

This guide walks you through setting up Google Cloud credentials for **Drive Photos**.

---

## 1. Create a Google Cloud Project

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top of the page and select **New Project**.
3. Name your project (e.g., `Drive Photos Personal`) and click **Create**.
4. Select your newly created project.

---

## 2. Enable the Google Drive API

1. In the navigation menu (left sidebar), go to **APIs & Services > Library**.
2. Search for `Google Drive API`.
3. Click on **Google Drive API** and select **Enable**.

---

## 3. Configure the OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**.
2. Choose **External** for the User Type and click **Create**.
3. **App Information**:
   - **App name**: `Drive Photos`
   - **User support email**: Your personal Google email
   - **Developer contact information**: Your personal Google email
4. Click **Save and Continue**.
5. **Scopes**:
   - Click **Add or Remove Scopes**.
   - Manually enter or check the following two scopes:
     - `https://www.googleapis.com/auth/drive.readonly` (Browse media in Google Drive)
     - `https://www.googleapis.com/auth/drive.file` (Create uploads in app folder)
   - Click **Update**, then **Save and Continue**.
6. **Test Users**:
   - Add your own Google email address as a test user.
7. Click **Save and Continue** until you reach the summary.
8. **Publishing Status**:
   - Click **Publish App** to move the status from "Testing" to **Production**.
   - *Note:* Because this is a personal-use app, you do not need Google Verification. When signing in for the first time, you will see a warning stating "Google hasn't verified this app". Click **Advanced > Go to Drive Photos (unsafe)** to approve your own account.

---

## 4. Create Platform-Native OAuth Client IDs

Since **Drive Photos** is a public native mobile app, it uses **PKCE (Proof Key for Code Exchange)**. No client secret is used or stored in the code.

### A. Android Client ID

1. Navigate to **APIs & Services > Credentials**.
2. Click **+ Create Credentials > OAuth client ID**.
3. Set **Application type** to `Android`.
4. Fill in:
   - **Name**: `Drive Photos Android`
   - **Package name**: `com.drivephotos.app`
   - **SHA-1 certificate fingerprint**:
     - For local development with Expo on Windows, retrieve your debug keystore SHA-1 by running:
       ```bash
       keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
       ```
     - For EAS cloud builds, run `npx eas credentials` to view your build credentials.
5. Click **Create** and copy the generated **Client ID**.

### B. iOS Client ID

1. Click **+ Create Credentials > OAuth client ID**.
2. Set **Application type** to `iOS`.
3. Fill in:
   - **Name**: `Drive Photos iOS`
   - **Bundle ID**: `com.drivephotos.app`
4. Click **Create** and copy the generated **Client ID**.

---

## 5. Configure Your Local `.env`

Copy `.env.example` to `.env` in the root of the project:

```bash
cp .env.example .env
```

Open `.env` and paste your Client IDs:

```env
# Google OAuth Client IDs
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com

# Enable dev fixtures (set to "false" to use real Google Drive data)
EXPO_PUBLIC_USE_DEV_FIXTURES=false

# Upload folder name in Google Drive
EXPO_PUBLIC_UPLOAD_FOLDER_NAME=Drive Photos Uploads
```

After updating `.env`, restart the Expo development server:

```bash
npx expo start -c
```
