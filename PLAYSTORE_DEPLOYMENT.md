# HR-ERP Play Store Deployment Guide

## Database Connection: Same as Web App

**Yes.** The Android app uses the **same backend API and database** as the web app:

- **Web app** (https://hr-njd.com) → Backend API → MongoDB
- **Android app** (Play Store) → Same Backend API (https://hr-njd.com) → Same MongoDB

Both apps share the same users, data, and authentication. No separate database or backend is needed.

---

## Prerequisites

- [Google Play Developer account](https://play.google.com/console/signup) ($25 one-time)
- Java 17 (Android Studio's bundled JBR works)
- Android Studio with SDK (API 34)
- Node.js 18+

---

## Step 1: Keystore Setup (One-Time)

The keystore signs your app. **Back it up securely.** Losing it prevents future updates.

1. Open PowerShell and go to the frontend folder:
   ```powershell
   cd c:\Users\m.h\hrerp\hr-erp-frontend
   ```

2. Generate the keystore:
   ```powershell
   & "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkey -v -keystore hr-erp-upload.keystore -alias hr-erp -keyalg RSA -keysize 2048 -validity 10000
   ```

3. When prompted, enter:
   - Keystore password (remember this)
   - Key password (can be same as keystore password)
   - Your name, organization, city, etc.

4. Create `android/keystore.properties`:
   - Copy `android/keystore.properties.example` to `android/keystore.properties`
   - Edit and set:
     ```
     storeFile=../hr-erp-upload.keystore
     storePassword=YOUR_STORE_PASSWORD
     keyAlias=hr-erp
     keyPassword=YOUR_KEY_PASSWORD
     ```

5. **Backup** `hr-erp-upload.keystore` and `keystore.properties` to a safe location.

---

## Step 2: Build the Release AAB

From the project root:

```batch
BUILD_ANDROID_RELEASE.bat
```

Or manually:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cd c:\Users\m.h\hrerp\hr-erp-frontend
npm run build:mobile
cd android
.\gradlew.bat bundleRelease
```

**Output:** `hr-erp-frontend\android\app\build\outputs\bundle\release\app-release.aab`

---

## Step 3: Play Console Setup

1. Go to [Play Console](https://play.google.com/console)
2. Create a new app (or select existing)
3. Complete the setup checklist:
   - **App access**: Declare if app has restricted content
   - **Ads**: Declare if app contains ads (likely No)
   - **Content rating**: Complete the questionnaire
   - **Target audience**: Select age groups
   - **News app**: No (unless applicable)
   - **COVID-19 apps**: No
   - **Data safety**: Declare what data you collect (login, profile, etc.)

---

## Step 4: Store Listing

1. **Main store listing**:
   - App name: HR ERP (or NEW JERSEY DEVELOPMENTS)
   - Short description (80 chars)
   - Full description (4000 chars max)
   - App icon: 512x512 PNG
   - Feature graphic: 1024x500 PNG
   - Screenshots: At least 2 phone screenshots (min 320px, max 3840px)

2. **Optional**: Add tablet screenshots if supporting tablets.

---

## Step 5: Upload and Release

1. In Play Console: **Release** → **Production** (or **Internal testing** first)
2. **Create new release**
3. Upload `app-release.aab`
4. Add release notes (e.g., "Initial release")
5. **Review and roll out**

---

## Step 6: Future Updates

Before each new upload, increment the version in `hr-erp-frontend/android/app/build.gradle`:

```gradle
versionCode 2    // Increment by 1 each upload (required)
versionName "1.1"  // User-visible version (e.g., 1.1, 1.2)
```

Then run `BUILD_ANDROID_RELEASE.bat` again and upload the new AAB.

---

## Checklist Before First Release

| Item | Status |
|------|--------|
| Keystore created and backed up | |
| keystore.properties configured | |
| Release AAB built successfully | |
| Play Console account created | |
| Store listing complete (name, description, screenshots) | |
| Content rating completed | |
| Data safety form completed | |
| Backend (https://hr-njd.com) is live and accessible | |

---

## Troubleshooting

**Build fails with "keystore.properties not found"**  
Copy `keystore.properties.example` to `keystore.properties` and fill in your credentials.

**Java version error**  
Set `JAVA_HOME` to Android Studio's JBR: `C:\Program Files\Android\Android Studio\jbr`

**App shows "Error connecting to server" on device**  
Ensure https://hr-njd.com is reachable from the device (same network or internet). The production build uses this URL automatically.
