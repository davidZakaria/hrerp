@echo off
echo ========================================
echo    Starting HR-ERP Backend Server
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Killing any existing Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Setting environment...
set PORT=5001
set NODE_ENV=development

echo [3/3] Starting server on port 5001...
echo.
echo ========================================
echo   Server starting... Please wait...
echo ========================================
echo.

npm run dev

pause

