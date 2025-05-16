-- Direct Test User Creation Script
-- Simple script to create a test user directly in auth.users table first, then profiles
--
-- IMPORTANT: This script must be run with admin privileges from the Supabase dashboard.
-- It will not work when run from the client application due to Row Level Security (RLS) policies.
-- Running this from the SQL Editor in the Supabase dashboard automatically bypasses RLS.

-- Simplified transaction with basic error handling
BEGIN;

-- Set role to postgres to bypass RLS
SET LOCAL ROLE postgres;

-- First, insert into auth.users table
DO $$
DECLARE
  user_id uuid := '11112222-3333-4444-5555-666666666666';
  user_email text := 'test@mbet.com';
  user_password text := 'mbet321';
  instance_id uuid;
BEGIN
  -- Get the correct instance_id
  SELECT id INTO instance_id FROM auth.instances LIMIT 1;
  
  IF instance_id IS NULL THEN
    RAISE EXCEPTION 'No instance found in auth.instances';
  END IF;

  -- Only execute if auth.users table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'auth' 
    AND table_name = 'users'
  ) THEN
    -- Delete existing user if exists
    DELETE FROM auth.users WHERE id = user_id;
    
    -- Insert new auth user
    INSERT INTO auth.users (
      instance_id,
      id, 
      aud,
      role,
      email, 
      encrypted_password, 
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token,
      is_super_admin,
      is_sso_user,
      deleted_at
    ) VALUES (
      instance_id,
      user_id,
      'authenticated',
      'authenticated',
      user_email,
      -- This is the hashed version of 'mbet321' using Supabase's bcrypt
      crypt(user_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Test User","role":"admin"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      '',
      false,
      false,
      null
    );
      
    RAISE NOTICE 'User created in auth.users table with instance_id: %', instance_id;
  ELSE
    RAISE WARNING 'auth.users table not found - this may cause foreign key constraint issues';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not create auth user: %', SQLERRM;
END $$;

-- Delete existing profile if exists
DELETE FROM profiles WHERE id = '11112222-3333-4444-5555-666666666666';

-- Then, insert into profiles table
INSERT INTO profiles (
  id, 
  email, 
  first_name, 
  last_name, 
  full_name, 
  phone_number, 
  role,
  account_status,
  created_at,
  updated_at,
  last_login,
  verification_status,
  preferences
) VALUES (
  '11112222-3333-4444-5555-666666666666',
  'test@mbet.com',
  'Test',
  'User',
  'Test User',
  '+251900000000',
  'admin',
  'active',
  NOW(),
  NOW(),
  NOW(),
  '{"email": true, "phone": true}',
  '{"notifications": true, "theme": "light"}'
);

-- Reset role
RESET ROLE;

-- Commit the transaction
COMMIT;

-- Test user creation complete. You can now log in with:
-- Email: test@mbet.com
-- Password: mbet321

-- Verify the user was created correctly
SELECT 'Verifying auth user:' as check_type;
SELECT id, email, role, email_confirmed_at IS NOT NULL as is_confirmed, instance_id
FROM auth.users 
WHERE id = '11112222-3333-4444-5555-666666666666';

SELECT 'Verifying profile:' as check_type;
SELECT id, email, role, account_status 
FROM profiles 
WHERE id = '11112222-3333-4444-5555-666666666666'; 