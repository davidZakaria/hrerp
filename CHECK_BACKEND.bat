@echo off
echo ========================================
echo   Checking Backend Server Status
echo ========================================
echo.

echo Checking if Node.js is running...
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✅ Node.js process is RUNNING
    echo.
    echo Active Node.js processes:
    tasklist /FI "IMAGENAME eq node.exe"
) else (
    echo ❌ Node.js is NOT running
)

echo.
echo ========================================
echo Checking if port 5001 is listening...
netstat -ano | findstr :5001
if errorlevel 1 (
    echo ❌ Port 5001 is NOT in use
) else (
    echo ✅ Port 5001 is ACTIVE
)

echo.
echo ========================================
echo Checking if port 5000 is in use...
netstat -ano | findstr :5000
if errorlevel 1 (
    echo ✅ Port 5000 is FREE
) else (
    echo ⚠️ Port 5000 is OCCUPIED
    echo You may need to kill this process
)

echo.
pause

