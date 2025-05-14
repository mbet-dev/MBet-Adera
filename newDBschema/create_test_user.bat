@echo off
SETLOCAL

REM MBet-Adera Test User Creation Script Executor for Windows
REM This script creates a guaranteed test user that will work with your app

echo MBet-Adera Test User Creation Tool
echo ==============================
echo.

REM Read environment variables from .env file
IF EXIST "..\\.env" (
  echo Loading environment variables from .env file...
  FOR /F "tokens=*" %%A IN ('..\\.env') DO SET %%A
)

REM Check if environment variables are set
IF "%SUPABASE_URL%"=="" (
  echo Error: SUPABASE_URL is not set.
  goto :error
)

IF "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
  echo Error: SUPABASE_SERVICE_ROLE_KEY is not set.
  goto :error
)

REM Extract host from Supabase URL
FOR /F "tokens=1-4 delims=/:/ " %%A IN ("%SUPABASE_URL%") DO (
  SET DB_HOST=%%C
)

SET DB_NAME=postgres
SET DB_USER=postgres
SET DB_PORT=5432
SET PGPASSWORD=%SUPABASE_SERVICE_ROLE_KEY%

echo.
echo Using database: %DB_HOST%
echo.
echo Creating test user...

REM Execute the SQL script using psql
psql -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -U %DB_USER% -f create_test_user.sql

IF %ERRORLEVEL% NEQ 0 (
  echo.
  echo Test user creation failed. Please check the error messages above.
  goto :error
) ELSE (
  echo.
  echo Test user creation completed successfully!
  echo.
  echo Now update the login.tsx file with the new test user:
  echo.
  echo 1. Open app/auth/login.tsx
  echo 2. Add 'test@mbet.com' to the SEED_USERS array
  echo 3. Restart your app
  echo.
  echo You can log in with:
  echo Email: test@mbet.com
  echo Password: mbet321
)

goto :end

:error
echo.
echo There was an error creating the test user.
echo Make sure PostgreSQL client (psql) is installed and in your PATH.
exit /b 1

:end
echo.
echo Done.
ENDLOCAL 