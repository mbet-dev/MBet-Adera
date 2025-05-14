# Using Test Users in MBet-Adera

This guide explains how to work with test users in the MBet-Adera app.

## Development Mode - Quick Start

In development mode, the app now supports easy testing with any of the seed users:

1. Make sure you're running the app in development mode
2. Use any of these emails with password `mbet321`:
   - `kidist@example.com`
   - `bereket@example.com`
   - `teshome@example.com`
   - `driver3@example.com` through `driver5@example.com`
   - `staff2@mbet.com`, `staff3@mbet.com`
   - `abebe@example.com`, `selam@example.com`
   - `admin@mbet.com`
   - `test@mbet.com`

The app will automatically allow these users in development mode, even if they don't exist in the database.

## Production Mode - Creating Test Users in the Database

For production mode or to have actual database records, you need to create test users using SQL:

1. Log in to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to "SQL Editor" in the left sidebar
4. Create a new query
5. Copy and paste the following SQL:

```sql
-- First create the user in auth.users table (required for foreign key constraint)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at
) VALUES (
  '11112222-3333-4444-5555-666666666666',
  'test@mbet.com',
  '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK', -- password: mbet321
  NOW()
) ON CONFLICT (id) DO UPDATE 
SET encrypted_password = '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK';

-- Then create the user in the profiles table
INSERT INTO profiles (
  id, 
  email, 
  first_name, 
  last_name, 
  full_name, 
  phone_number, 
  role
) VALUES (
  '11112222-3333-4444-5555-666666666666',
  'test@mbet.com',
  'Test',
  'User',
  'Test User',
  '+251900000000',
  'admin'
) ON CONFLICT (id) DO UPDATE 
SET 
  first_name = 'Test',
  last_name = 'User',
  full_name = 'Test User',
  role = 'admin';

-- Verify it was created
SELECT id, email, role FROM profiles WHERE email = 'test@mbet.com';
```

6. Click "Run" to execute the SQL
7. You should see a confirmation that the user was created

> **IMPORTANT**: This SQL script must be run with admin privileges from the Supabase dashboard. 
> The app itself cannot create users directly due to Row Level Security (RLS) policies.

## Login Credentials

For all seed users and test users:

- **Password:** `mbet321`

## Troubleshooting

If you're having issues:

1. If in development mode, make sure __DEV__ is true (it should be by default in development environments)
2. For production, check that your Supabase service is running properly
3. For production, verify that both the `auth.users` and `profiles` tables exist in your database
4. For production database changes, make sure you're running SQL as an admin from the Supabase dashboard
5. Check the browser console or app logs for any error messages 