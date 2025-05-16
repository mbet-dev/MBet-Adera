@echo off
SETLOCAL

REM MBet-Adera Password Update Script Executor for Windows
REM This script connects to your Supabase database and executes the password update script

echo MBet-Adera Password Update Tool
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
echo Updating passwords...

REM Execute the SQL script using psql
psql -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -U %DB_USER% -f update_passwords.sql

IF %ERRORLEVEL% NEQ 0 (
  echo.
  echo Password update failed. Please check the error messages above.
  goto :error
) ELSE (
  echo.
  echo Password update completed successfully!
  echo All users can now log in with password: mbet321
)

goto :end

:error
echo.
echo There was an error executing the password update script.
echo Make sure PostgreSQL client (psql) is installed and in your PATH.
exit /b 1

:end
echo.
echo Done.
ENDLOCAL 