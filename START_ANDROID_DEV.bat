@echo off
echo ========================================
echo    HR-ERP Android Development Mode
echo ========================================
echo.

cd /d "%~dp0"

:: Start MongoDB if installed as Windows service (required for backend)
echo [0/5] Ensuring MongoDB is running...
net start MongoDB 2>nul
if %errorlevel% neq 0 (
    echo    MongoDB service not found or already running - continuing...
) else (
    echo    MongoDB started.
)
timeout /t 2 /nobreak >nul

:: 10.0.2.2 = host machine from Android emulator
set CAPACITOR_DEV=1
set CAPACITOR_SERVER_URL=http://10.0.2.2:3000

echo [1/5] Starting backend (port 5001)...
start "HR-ERP Backend" cmd /k "cd /d "%~dp0" && set PORT=5001 && set NODE_ENV=development && npm run dev"

echo    Waiting for backend to be ready (up to 30 sec)...
set /a attempts=0
:wait_backend
timeout /t 2 /nobreak >nul
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5001/api/health' -UseBasicParsing -TimeoutSec 3; exit 0 } catch { exit 1 }" 2>nul
if %errorlevel% equ 0 goto backend_ready
set /a attempts+=1
if %attempts% geq 15 (
    echo    WARNING: Backend not responding. Check the Backend window for MongoDB errors.
    echo    If MongoDB is not installed, start it manually or install from mongodb.com
    goto backend_timeout
)
goto wait_backend
:backend_ready
echo    Backend is ready.
:backend_timeout

echo [2/5] Starting frontend dev server (port 3000)...
start "HR-ERP Frontend" cmd /k "cd /d "%~dp0hr-erp-frontend" && npm start"

timeout /t 10 /nobreak >nul

echo [3/5] Syncing Capacitor for live reload...
cd hr-erp-frontend
call npm run android:dev

echo [4/5] Opening Android Studio...
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
echo.
echo   If app shows "Error connecting to server":
echo   - Ensure Backend window shows "MongoDB Connected" (not errors)
echo   - Allow Node.js through Windows Firewall (ports 3000, 5001)
echo   - Run SEED_TEST_ACCOUNTS.bat to create test users
echo ========================================
pause
