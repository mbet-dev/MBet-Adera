@echo off
echo Executing partner_locations_fix.sql...
echo.
echo This script will fix the partner locations in the database,
echo making sure the policy creation doesn't cause errors.
echo.
echo Please run this in the Supabase SQL Editor
echo.
echo Press any key to copy the SQL to your clipboard...
pause > nul

type %~dp0partner_locations_fix.sql | clip

echo.
echo SQL has been copied to your clipboard!
echo.
echo 1. Go to your Supabase project in the browser
echo 2. Navigate to the SQL Editor
echo 3. Paste the SQL (Ctrl+V)
echo 4. Run the query
echo.
echo Press any key to exit...
pause > nul 