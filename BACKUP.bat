@echo off
echo ============================================
echo HR-ERP Manual Backup Script
echo ============================================
echo.
echo Starting backup...
echo.

cd /d "%~dp0"
node utils/backup.js

echo.
echo ============================================
echo Backup completed. Press any key to exit.
pause >nul
