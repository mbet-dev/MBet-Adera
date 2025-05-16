# MBet-Adera Password Update Tool

This tool updates all user passwords in the Supabase database to properly hashed versions of "mbet321" for testing purposes.

## The Problem

In the enhanced seed data, passwords were stored as plaintext 'mbet321' instead of bcrypt-hashed passwords required by Supabase Auth. This causes login failures with "Invalid login credentials" errors.

## The Solution

The `update_passwords.sql` script updates all user passwords to a valid bcrypt hash of "mbet321", enabling all seed users to successfully log in with the same password.

## Files Included

- `update_passwords.sql` - SQL script that updates passwords
- `execute_password_update.sh` - Shell script for Linux/macOS
- `execute_password_update.bat` - Batch script for Windows

## How to Use

### Option 1: Using the Supabase Dashboard

1. Log in to your Supabase dashboard at https://app.supabase.com
2. Select your project
3. Go to SQL Editor
4. Copy the contents of `update_passwords.sql`
5. Paste into the SQL Editor and run the query

### Option 2: Using Command Line (Linux/macOS)

1. Make the shell script executable:
   ```
   chmod +x execute_password_update.sh
   ```

2. Run the script:
   ```
   ./execute_password_update.sh
   ```

### Option 3: Using Command Line (Windows)

1. Open Command Prompt and navigate to this directory
2. Run the batch script:
   ```
   execute_password_update.bat
   ```

## After Running the Script

All users in the database can now log in with:
- Email: Their existing email (e.g., kidist@example.com)
- Password: mbet321

## Troubleshooting

If you encounter any issues:

1. Make sure your `.env` file contains valid Supabase credentials
2. Ensure you have PostgreSQL client (psql) installed
3. Check that you have the necessary permissions to modify the auth.users table

## For Future Seed Data

When creating new seed data, always use the bcrypt hash for passwords:
```sql
'$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK'
```

This is the correct bcrypt hash for the password "mbet321". 