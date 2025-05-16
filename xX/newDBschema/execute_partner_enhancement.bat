@echo off
REM Execute the partner location enhancement script
REM This script runs the SQL script to enhance the partners and addresses tables

echo Running partner location enhancement script...
echo This will create or update the partners and addresses tables and seed them with sample data

REM Connection details - replace these with your actual connection information
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=postgres
set DB_USER=postgres
set DB_PASSWORD=your_password

echo.
echo Please make sure your Supabase or PostgreSQL database is running
echo.

REM Run the SQL script using psql
set PGPASSWORD=%DB_PASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -U %DB_USER% -f partner_location_enhancement.sql

REM Check if the command was successful
if %ERRORLEVEL% == 0 (
  echo.
  echo [SUCCESS] Partner location enhancement script executed successfully!
  echo You should now be able to see partner locations on the map.
) else (
  echo.
  echo [ERROR] Error executing partner location enhancement script.
  echo Please check error messages above and ensure your database is running.
)

echo.
pause 