# HR-ERP Mobile App Setup (Capacitor)

This document describes how to build and run the HR-ERP app as native iOS and Android applications using Capacitor.

## Prerequisites

- **Node.js 18+**
- **For Android:**
  - **Java 17** (required) - Android Gradle Plugin 8.2 needs Java 17. Android Studio installs its own JBR (JetBrains Runtime); otherwise install [Eclipse Temurin 17](https://adoptium.net/) or Oracle JDK 17.
  - **JAVA_HOME** set to your Java 17 installation (e.g. `C:\Program Files\Eclipse Adoptium\jdk-17.0.x`)
  - **Android Studio** with Android SDK (API 34)
  - **ANDROID_HOME** or **ANDROID_SDK_ROOT** set (e.g. `C:\Users\<user>\AppData\Local\Android\Sdk`)
- For iOS: macOS with Xcode
- Apple Developer account ($99/year) for App Store
- Google Play Developer account ($25 one-time) for Play Store

## Initial Setup (One-time)

1. **Install dependencies**
   ```bash
   cd hr-erp-frontend
   npm install
   ```

2. **Add native platforms** (creates `ios/` and `android/` folders)
   ```bash
   npx cap add ios
   npx cap add android
   ```

3. **Set production API URL** (optional - defaults to https://hr-njd.com in native build)
   ```bash
   # Windows PowerShell
   $env:REACT_APP_API_URL="https://hr-njd.com"
   
   # Linux/Mac
   export REACT_APP_API_URL=https://hr-njd.com
   ```

## Test Accounts (Local Development)

When testing with the local backend (e.g. `START_ANDROID_DEV.bat`), seed test accounts:

```bash
# From project root
node scripts/seedTestAccounts.js
# Or: SEED_TEST_ACCOUNTS.bat
```

| Role    | Email               | Password |
|---------|---------------------|----------|
| Employee| employee@test.local | Test123! |
| Manager | manager@test.local  | Test123! |
| Admin   | admin@test.local    | Test123! |

Ensure MongoDB is running and the backend uses the same database (default: `mongodb://localhost:27017/hr-erp`).

## Build and Run

1. **Build web assets and sync to native projects**
   ```bash
   npm run build:mobile
   ```

2. **Open in IDE and run**
   ```bash
   # Android
   npm run android

   # iOS (macOS only)
   npm run ios
   ```

3. **Build APK from command line (Android)**
   ```bash
   cd hr-erp-frontend
   npm run build:mobile
   cd android
   .\gradlew.bat assembleDebug   # Windows
   # or: ./gradlew assembleDebug  # macOS/Linux
   ```
   Output APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Troubleshooting

### "Incompatible because this component declares... compatible with Java 11"

Your system is using Java 8. **Java 17 is required.** Options:

1. **Use Android Studio's bundled JDK** (if Android Studio is installed):
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
   cd hr-erp-frontend\android
   .\gradlew.bat assembleDebug
   ```

2. **Install Java 17** and set JAVA_HOME:
   - Download [Eclipse Temurin 17](https://adoptium.net/temurin/releases/?version=17)
   - Set `JAVA_HOME` to the JDK installation path

### Gradle "exclusive access" / download timeout

Another Gradle process may be holding a lock. Stop any running Gradle/Java processes and retry, or wait for the first run to finish (Gradle downloads ~150MB on first run).

### White/blank screen on device

- Ensure `https://hr-njd.com` is reachable from the device (same network, no firewall blocking).
- For local backend testing, use your machine's LAN IP: `$env:REACT_APP_API_URL="http://192.168.x.x:5000"` then rebuild.

### "Error connecting to server" on emulator (dev mode)

When using `START_ANDROID_DEV.bat`:

1. **Both servers must be running** – Keep the Backend and Frontend command windows open. Wait for "Compiled successfully" on the frontend.
2. **Restart the app** – After both servers are ready, force-close the app on the emulator and run it again from Android Studio.
3. **Windows Firewall** – If it still fails, allow Node.js through the firewall: Windows Security → Firewall → Allow an app → Node.js (or add inbound rule for ports 3000 and 5001).
4. **Verify backend** – On your PC, open http://localhost:5001/api/health in a browser to confirm the backend responds.

### ANDROID_HOME not set

Gradle can find the SDK if Android Studio is installed. To set manually:
```powershell
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
```

## App Icons

Before submitting to stores, replace the default icons:

- **iOS**: Add 1024x1024 app icon to `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- **Android**: Add adaptive icons (foreground + background, 432x432) to `android/app/src/main/res/`

## Play Store Deployment

### Keystore Setup (one-time)

1. **Generate upload keystore** (backup this file securely; losing it prevents future app updates):
   ```powershell
   & "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkey -v -keystore hr-erp-upload.keystore -alias hr-erp -keyalg RSA -keysize 2048 -validity 10000
   ```
   Run from `hr-erp-frontend/` so the keystore is created there.

2. **Create keystore.properties** in `android/`:
   - Copy `android/keystore.properties.example` to `android/keystore.properties`
   - Edit and set your store password, key alias, and key password

### Build Release AAB

Google Play requires Android App Bundle (AAB), not APK.

**Option A: Use BUILD_ANDROID_RELEASE.bat** (from project root)
```batch
BUILD_ANDROID_RELEASE.bat
```

**Option B: Manual build**
```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cd hr-erp-frontend
npm run build:mobile
cd android
.\gradlew.bat bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Play Console Upload

1. Go to [Play Console](https://play.google.com/console)
2. Create app or select existing
3. Complete store listing (name, description, screenshots)
4. **Release → Internal testing** (recommended first) or **Production**
5. Upload `app-release.aab`
6. Complete content rating questionnaire
7. Set pricing (free) and target countries

### Version Bumping (future releases)

Before each new Play Store upload, update `android/app/build.gradle`:

- `versionCode` – increment (e.g. 2, 3, 4) – required for each upload
- `versionName` – user-visible version (e.g. "1.1", "1.2")

## Verification Summary (2025-02)

| Step | Status |
|------|--------|
| `npm install` | OK |
| `npm run build:mobile` (web build + cap sync) | OK |
| Android `gradlew assembleDebug` | Requires Java 17; fails on Java 8 |
| Android `gradlew bundleRelease` | Requires keystore.properties |
| Capacitor plugins (SplashScreen, StatusBar) | OK |
| API config (Capacitor → https://hr-njd.com) | OK |

- **Debug build:** `BUILD_ANDROID.bat` from project root
- **Release AAB:** `BUILD_ANDROID_RELEASE.bat` from project root (requires keystore setup)

## Notes

- The web app at hr-njd.com continues to work alongside the mobile apps; both use the same backend API.
- Service Worker is disabled when running in the native Capacitor WebView to avoid caching issues.
- API URL defaults to `https://hr-njd.com` when detected inside Capacitor; override with `REACT_APP_API_URL` if needed.
