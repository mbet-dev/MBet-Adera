

-- MBet-Adera Direct User Fix Script
-- This script directly fixes the existing user accounts in auth.users table
-- Preserves all relationships and data by using exact same IDs
-- IMPORTANT: Run this in the Supabase SQL Editor

-- Start transaction
BEGIN;

-- Set role to postgres to bypass RLS
SET LOCAL ROLE postgres;

-- Get instance ID
DO $$
DECLARE
  instance_id uuid;
BEGIN
  BEGIN
    SELECT id INTO instance_id FROM auth.instances LIMIT 1;
    
    -- If no instance found, use the default one
    IF instance_id IS NULL THEN
      instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
    
    RAISE NOTICE 'Using instance ID: %', instance_id;
  EXCEPTION WHEN OTHERS THEN
    instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
    RAISE NOTICE 'Error accessing auth.instances, using default instance ID';
  END;
  
  -- First user is working already (test@mbet.com)
  -- Just fix the other ones by inserting or updating them in auth.users
  
  -- Fix user: bereket@example.com
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, created_at, updated_at, 
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token
  ) VALUES (
    instance_id,
    'aaaaaaaa-0000-1111-2222-333333333333'::uuid, 
    'authenticated', 
    'authenticated', 
    'bereket@example.com',
    crypt('MBet@2023', gen_salt('bf')),
    NOW(), 
    NOW(), 
    NOW(), 
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"customer"}'::jsonb,
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = 'bereket@example.com',
    encrypted_password = crypt('MBet@2023', gen_salt('bf')),
    email_confirmed_at = NOW(),
    aud = 'authenticated',
    role = 'authenticated',
    updated_at = NOW(),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = '{"role":"customer"}'::jsonb,
    confirmation_token = '',
    recovery_token = '';
  
  RAISE NOTICE 'Fixed user: bereket@example.com';
  
  -- Fix user: kidist@example.com
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, created_at, updated_at, 
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token
  ) VALUES (
    instance_id,
    'bbbbbbbb-0000-1111-2222-333333333333'::uuid, 
    'authenticated', 
    'authenticated', 
    'kidist@example.com',
    crypt('MBet@2023', gen_salt('bf')),
    NOW(), 
    NOW(), 
    NOW(), 
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"customer"}'::jsonb,
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = 'kidist@example.com',
    encrypted_password = crypt('MBet@2023', gen_salt('bf')),
    email_confirmed_at = NOW(),
    aud = 'authenticated',
    role = 'authenticated',
    updated_at = NOW(),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = '{"role":"customer"}'::jsonb,
    confirmation_token = '',
    recovery_token = '';
  
  RAISE NOTICE 'Fixed user: kidist@example.com';
  
  -- Fix user: teshome@example.com
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, created_at, updated_at, 
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token
  ) VALUES (
    instance_id,
    'cccccccc-0000-1111-2222-333333333333'::uuid, 
    'authenticated', 
    'authenticated', 
    'teshome@example.com',
    crypt('MBet@2023', gen_salt('bf')),
    NOW(), 
    NOW(), 
    NOW(), 
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"customer"}'::jsonb,
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = 'teshome@example.com',
    encrypted_password = crypt('MBet@2023', gen_salt('bf')),
    email_confirmed_at = NOW(),
    aud = 'authenticated',
    role = 'authenticated',
    updated_at = NOW(),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = '{"role":"customer"}'::jsonb,
    confirmation_token = '',
    recovery_token = '';
  
  RAISE NOTICE 'Fixed user: teshome@example.com';
  
  -- Fix user: driver3@example.com
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, created_at, updated_at, 
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token
  ) VALUES (
    instance_id,
    'dddddddd-0000-1111-2222-333333333333'::uuid, 
    'authenticated', 
    'authenticated', 
    'driver3@example.com',
    crypt('MBet@2023', gen_salt('bf')),
    NOW(), 
    NOW(), 
    NOW(), 
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"driver"}'::jsonb,
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = 'driver3@example.com',
    encrypted_password = crypt('MBet@2023', gen_salt('bf')),
    email_confirmed_at = NOW(),
    aud = 'authenticated',
    role = 'authenticated',
    updated_at = NOW(),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = '{"role":"driver"}'::jsonb,
    confirmation_token = '',
    recovery_token = '';
  
  RAISE NOTICE 'Fixed user: driver3@example.com';
  
  -- Fix user: driver4@example.com
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, created_at, updated_at, 
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token
  ) VALUES (
    instance_id,
    'eeeeeeee-0000-1111-2222-333333333333'::uuid, 
    'authenticated', 
    'authenticated', 
    'driver4@example.com',
    crypt('MBet@2023', gen_salt('bf')),
    NOW(), 
    NOW(), 
    NOW(), 
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"driver"}'::jsonb,
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = 'driver4@example.com',
    encrypted_password = crypt('MBet@2023', gen_salt('bf')),
    email_confirmed_at = NOW(),
    aud = 'authenticated',
    role = 'authenticated',
    updated_at = NOW(),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = '{"role":"driver"}'::jsonb,
    confirmation_token = '',
    recovery_token = '';
  
  RAISE NOTICE 'Fixed user: driver4@example.com';
  
  -- Fix user: driver5@example.com
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, created_at, updated_at, 
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token
  ) VALUES (
    instance_id,
    'ffffffff-0000-1111-2222-333333333333'::uuid, 
    'authenticated', 
    'authenticated', 
    'driver5@example.com',
    crypt('MBet@2023', gen_salt('bf')),
    NOW(), 
    NOW(), 
    NOW(), 
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"driver"}'::jsonb,
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = 'driver5@example.com',
    encrypted_password = crypt('MBet@2023', gen_salt('bf')),
    email_confirmed_at = NOW(),
    aud = 'authenticated',
    role = 'authenticated',
    updated_at = NOW(),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = '{"role":"driver"}'::jsonb,
    confirmation_token = '',
    recovery_token = '';
  
  RAISE NOTICE 'Fixed user: driver5@example.com';
  
  -- Fix user: staff2@mbet.com
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, created_at, updated_at, 
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token
  ) VALUES (
    instance_id,
    '88888888-0000-1111-2222-333333333333'::uuid, 
    'authenticated', 
    'authenticated', 
    'staff2@mbet.com',
    crypt('MBet@2023', gen_salt('bf')),
    NOW(), 
    NOW(), 
    NOW(), 
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"staff"}'::jsonb,
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = 'staff2@mbet.com',
    encrypted_password = crypt('MBet@2023', gen_salt('bf')),
    email_confirmed_at = NOW(),
    aud = 'authenticated',
    role = 'authenticated',
    updated_at = NOW(),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = '{"role":"staff"}'::jsonb,
    confirmation_token = '',
    recovery_token = '';
  
  RAISE NOTICE 'Fixed user: staff2@mbet.com';
  
  -- Fix user: staff3@mbet.com
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, created_at, updated_at, 
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token
  ) VALUES (
    instance_id,
    '99999999-0000-1111-2222-333333333333'::uuid, 
    'authenticated', 
    'authenticated', 
    'staff3@mbet.com',
    crypt('MBet@2023', gen_salt('bf')),
    NOW(), 
    NOW(), 
    NOW(), 
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"staff"}'::jsonb,
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = 'staff3@mbet.com',
    encrypted_password = crypt('MBet@2023', gen_salt('bf')),
    email_confirmed_at = NOW(),
    aud = 'authenticated',
    role = 'authenticated',
    updated_at = NOW(),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = '{"role":"staff"}'::jsonb,
    confirmation_token = '',
    recovery_token = '';
  
  RAISE NOTICE 'Fixed user: staff3@mbet.com';
  
  RAISE NOTICE '=== USER FIX COMPLETE ===';
  RAISE NOTICE 'All 8 users have been fixed with password: MBet@2023';
  RAISE NOTICE 'Original IDs and relationships preserved';
END $$;

-- Verify the users were fixed
SELECT 'Verification of fixed users:' as message;
SELECT 
  p.id,
  p.email,
  p.role,
  p.account_status,
  u.role as auth_role,
  u.email_confirmed_at IS NOT NULL as is_confirmed,
  (u.raw_user_meta_data->>'role') as auth_meta_role
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.id IN (
  'aaaaaaaa-0000-1111-2222-333333333333',
  'bbbbbbbb-0000-1111-2222-333333333333',
  'cccccccc-0000-1111-2222-333333333333',
  'dddddddd-0000-1111-2222-333333333333',
  'eeeeeeee-0000-1111-2222-333333333333',
  'ffffffff-0000-1111-2222-333333333333',
  '88888888-0000-1111-2222-333333333333',
  '99999999-0000-1111-2222-333333333333'
);

COMMIT; 


