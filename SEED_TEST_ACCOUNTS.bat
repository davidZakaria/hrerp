@echo off
echo ========================================
echo    HR-ERP Seed Test Accounts
echo ========================================
echo.
echo Creates employee, manager, admin test accounts for local testing.
echo Ensure MongoDB is running and backend uses same database.
echo.

cd /d "%~dp0"
node scripts/seedTestAccounts.js

echo.
pause
