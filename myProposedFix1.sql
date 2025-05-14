-- Direct Test User Creation Script
-- Simple script to create a test user directly in auth.users table first, then profiles
--
-- IMPORTANT: This script must be run with admin privileges from the Supabase dashboard.
-- It will not work when run from the client application due to Row Level Security (RLS) policies.
-- Running this from the SQL Editor in the Supabase dashboard automatically bypasses RLS.

-- Simplified transaction with basic error handling
BEGIN;

-- First, insert into auth.users table (this is required due to foreign key constraint)
DO $$
BEGIN
  -- Only execute if auth.users table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'auth' 
    AND table_name = 'users'
  ) THEN
    -- Insert or update auth user
    INSERT INTO auth.users (
      id, 
      email, 
      encrypted_password, 
      email_confirmed_at
    ) VALUES (
      '11112222-3333-4444-5555-666666666666',
      'test@mbet.com',
      '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK', -- mbet321
      NOW()
    ) ON CONFLICT (id) DO UPDATE 
    SET 
      encrypted_password = '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK',
      email_confirmed_at = NOW();
      
    RAISE NOTICE 'User created in auth.users table';
  ELSE
    RAISE WARNING 'auth.users table not found - this may cause foreign key constraint issues';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not create auth user: %', SQLERRM;
END $$;

-- Then, insert into profiles table
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

-- Commit the transaction
COMMIT;

-- Simple verification
SELECT 'Test user created successfully' as result;
SELECT id, email, role FROM profiles WHERE email = 'test@mbet.com'; 
