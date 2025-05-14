# MBet-Adera Authentication Fix Guide

This guide provides a complete solution to fix authentication issues in MBet-Adera where only the test user (test@mbet.com) can log in, but existing users cannot.

## The Problem

Your application has profiles in the database, but they're not properly connected to auth.users entries, making authentication fail with "Invalid login credentials".

## Solution: 4-Step Approach

### Step 1: Set Up Environment

First, you need to set up your environment with the Supabase service role key:

```bash
# Run the environment setup script
node create-env.js

# Follow the prompts to input your Supabase service role key
```

You'll need your service role key from:
1. Go to https://app.supabase.com/
2. Select your project
3. Go to Project Settings > API
4. Copy the "service_role" key (not the anon key)

### Step 2: Run the SQL Fix Script

This is the **most important step**. The SQL script will fix auth.users entries for all your profile records.

1. Open your browser and go to https://app.supabase.com/
2. Log in to your Supabase account
3. Select your MBet-Adera project
4. Click on "SQL Editor" in the left sidebar
5. Click the "New Query" button
6. **Copy the entire content** of direct_user_fix_v2.sql and paste it into the editor
7. Click "Run" button to execute the script

The script uses a safe approach that preserves all data relationships:
- It first checks the existing test user that works
- It updates existing auth.users records (instead of deleting them) to maintain foreign key relationships
- It creates new users only if they don't exist yet
- It assigns appropriate roles to each user:
  - test@mbet.com → admin
  - bereket@example.com, kidist@example.com, teshome@example.com → customer
  - driver3@example.com, driver4@example.com, driver5@example.com → driver
  - staff2@mbet.com, staff3@mbet.com → staff
- It verifies the system configuration and reports any issues

### Step 3: Clear Any Cached Authentication

To clear any cached or stuck authentication tokens:

```bash
# Run the reset script
node reset-app-auth.js

# Restart development server
npm run dev
```

This will:
- Clear any stored tokens
- Add code to clear tokens on app startup
- Reset the authentication state

### Step 4: Test on Device/Emulator

1. Completely close the app on your device/emulator
2. Clear app data/cache if possible
3. Restart the app
4. Try logging in with the credentials:
   - Email: Any user email (e.g., kidist@example.com)
   - Password: MBet@2023

## Diagnostic Tools

If you're still having issues, you can use the included diagnostic tools:

```bash
# Simple diagnostic that checks profiles and login status
node simple-auth-check.js

# More detailed authentication diagnostic
node check-auth-status.js
```

These tools will help you understand:
- Which users exist in the profiles table
- Which users can successfully log in
- What errors are occurring during login attempts

## Troubleshooting

### Check SQL Execution

Verify the SQL script ran successfully:
- Look for "USER FIX COMPLETE" message
- Check verification results at the bottom
- Ensure it found the test user as a template

### Database Connection

Make sure your app is connecting to the correct database:
1. Check the SUPABASE_URL in your .env file
2. Verify it matches your Supabase project URL

### Manual Fix via Supabase Dashboard

If all else fails:
1. Go to Authentication > Users in Supabase Dashboard
2. For each user, click Edit and:
   - Ensure email is confirmed
   - Reset their password to "MBet@2023"
   - Update their metadata to include the correct role
3. Make sure to set appropriate role in the metadata:
   - test@mbet.com should have {"role": "admin"}
   - Customer emails should have {"role": "customer"}
   - Driver emails should have {"role": "driver"}
   - Staff emails should have {"role": "staff"}

## Why This Works

This approach works because:
1. It preserves existing auth.users entries and their relationships to other tables
2. It updates credentials with fresh bcrypt password hashes for all users
3. It properly sets all required fields, including email_confirmed_at
4. It sets the correct role for each user type in the metadata
5. It matches the working configuration of your test user

All users will now have the password "MBet@2023". After confirming everything works, you may want to implement a password reset feature. 