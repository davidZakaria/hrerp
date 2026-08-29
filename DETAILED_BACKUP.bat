@echo off
echo ============================================
echo HR-ERP Detailed Backup + Change Report
echo ============================================
echo.
echo Creates full backup AND change-report.md showing:
echo   - Git commits / files changed since last backup
echo   - Database counts and data deltas
echo   - Recent audit activity and balance changes
echo.

cd /d "%~dp0"
node scripts/detailed-backup.js %*

echo.
echo ============================================
echo Done. Open backups\...\change-report.md
echo ============================================
pause
