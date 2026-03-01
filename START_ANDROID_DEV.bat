@echo off
echo ========================================
echo    HR-ERP Android Development Mode
echo ========================================
echo.

cd /d "%~dp0"

:: 10.0.2.2 = host machine from Android emulator
set CAPACITOR_DEV=1
set CAPACITOR_SERVER_URL=http://10.0.2.2:3000
set REACT_APP_API_URL=http://10.0.2.2:5001

echo [1/4] Starting backend (port 5001)...
start "HR-ERP Backend" cmd /k "cd /d "%~dp0" && set PORT=5001 && set NODE_ENV=development && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/4] Starting frontend dev server (port 3000)...
start "HR-ERP Frontend" cmd /k "cd /d "%~dp0hr-erp-frontend" && set REACT_APP_API_URL=http://10.0.2.2:5001 && npm start"

timeout /t 10 /nobreak >nul

echo [3/4] Syncing Capacitor for live reload...
cd hr-erp-frontend
call npm run android:dev

echo [4/4] Opening Android Studio...
call npm run android

echo.
echo ========================================
echo   Dev mode ready.
echo   - Backend:   http://localhost:5001
echo   - Frontend:  http://localhost:3000
echo   - Emulator uses 10.0.2.2 to reach host
echo.
echo   Test accounts: run SEED_TEST_ACCOUNTS.bat first
echo   (employee@test.local, manager@test.local, admin@test.local / Test123!)
echo.
echo   WAIT for "Compiled successfully" in Frontend window before Run.
echo   In Android Studio: click Run to launch app.
echo   Changes to React code will hot-reload.
echo ========================================
pause
