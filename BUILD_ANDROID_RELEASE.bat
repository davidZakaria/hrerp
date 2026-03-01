@echo off
echo ========================================
echo    HR-ERP Android Release Build (AAB)
echo ========================================
echo.

cd /d "%~dp0"

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"

echo [1/4] Checking Java...
"%JAVA_HOME%\bin\java.exe" -version 2>&1
echo.

echo [2/4] Building web assets and syncing to Android...
cd hr-erp-frontend
call npm run build:mobile
if errorlevel 1 (
    echo Build failed.
    pause
    exit /b 1
)

echo [3/4] Building Android release AAB...
cd android
if not exist keystore.properties (
    echo.
    echo ERROR: keystore.properties not found.
    echo Copy keystore.properties.example to keystore.properties and add your signing credentials.
    echo See hr-erp-frontend\MOBILE_SETUP.md for Play Store deployment instructions.
    pause
    exit /b 1
)
call gradlew.bat bundleRelease
if errorlevel 1 (
    echo.
    echo Build failed. Check that keystore path and passwords are correct.
    pause
    exit /b 1
)

echo.
echo [4/4] Release build complete!
echo.
echo AAB location: hr-erp-frontend\android\app\build\outputs\bundle\release\app-release.aab
echo.
echo Next steps for Play Store:
echo   1. Go to https://play.google.com/console
echo   2. Create app or select existing
echo   3. Release -^> Internal testing (or Production)
echo   4. Upload app-release.aab
echo.
pause
