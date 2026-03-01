@echo off
echo ========================================
echo    HR-ERP Android Build Verification
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Java...
java -version 2>&1
echo.

echo [2/4] Building web assets and syncing to Android...
cd hr-erp-frontend
call npm run build:mobile
if errorlevel 1 (
    echo Build failed.
    pause
    exit /b 1
)

echo [3/4] Building Android debug APK...
cd android
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
call gradlew.bat assembleDebug
if errorlevel 1 (
    echo.
    echo If you see "Java 11" or "Java 8" compatibility errors, Java 17 is required.
    echo See hr-erp-frontend\MOBILE_SETUP.md - Troubleshooting section.
    pause
    exit /b 1
)

echo.
echo [4/4] Build complete!
echo APK location: hr-erp-frontend\android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause
