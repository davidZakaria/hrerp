# HR-ERP Mobile App Setup (Capacitor)

This document describes how to build and run the HR-ERP app as native iOS and Android applications using Capacitor.

## Prerequisites

- Node.js 18+
- For iOS: macOS with Xcode
- For Android: Android Studio
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

## App Icons

Before submitting to stores, replace the default icons:

- **iOS**: Add 1024x1024 app icon to `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- **Android**: Add adaptive icons (foreground + background, 432x432) to `android/app/src/main/res/`

## Notes

- The web app at hr-njd.com continues to work alongside the mobile apps; both use the same backend API.
- Service Worker is disabled when running in the native Capacitor WebView to avoid caching issues.
- API URL defaults to `https://hr-njd.com` when detected inside Capacitor; override with `REACT_APP_API_URL` if needed.
