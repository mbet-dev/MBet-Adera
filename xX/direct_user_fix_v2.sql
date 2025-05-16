-- MBet-Adera Direct User Fix Script (V2)
-- This script directly fixes the existing user accounts in auth.users table
-- using a simpler approach guaranteed to work like the test user

-- Start transaction
BEGIN;

-- Set role to postgres to bypass RLS
SET LOCAL ROLE postgres;

-- Get the test user's encrypted password as a reference
-- Since we know this user works, we'll use the exact same format
DO $$
DECLARE
  instance_id uuid;
  test_user_password text;
  test_user_meta jsonb;
BEGIN
  SELECT id INTO instance_id FROM auth.instances LIMIT 1;
  IF instance_id IS NULL THEN
    instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;
  
  -- Get the test user's password hash and metadata
  SELECT encrypted_password, raw_user_meta_data 
  INTO test_user_password, test_user_meta
  FROM auth.users 
  WHERE email = 'test@mbet.com';
  
  RAISE NOTICE 'Using working test user as template';
  RAISE NOTICE 'Instance ID: %', instance_id;
  
  -- Verify test user exists
  IF test_user_password IS NULL THEN
    RAISE EXCEPTION 'Test user not found. Cannot proceed without reference.';
  END IF;
  
  -- Fix user: bereket@example.com
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = 'aaaaaaaa-0000-1111-2222-333333333333') THEN
    UPDATE auth.users SET
      aud = 'authenticated',
      role = 'authenticated',
      email = 'bereket@example.com',
      encrypted_password = crypt('MBet@2023', gen_salt('bf')),
      email_confirmed_at = NOW(),
      updated_at = NOW(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = jsonb_build_object('role', 'customer'),
      confirmation_token = '',
      recovery_token = ''
    WHERE id = 'aaaaaaaa-0000-1111-2222-333333333333';
    RAISE NOTICE 'Updated user: bereket@example.com';
  ELSE
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
      jsonb_build_object('role', 'customer'),
      '',
      ''
    );
    RAISE NOTICE 'Created user: bereket@example.com';
  END IF;
  
  -- Fix user: kidist@example.com
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = 'bbbbbbbb-0000-1111-2222-333333333333') THEN
    UPDATE auth.users SET
      aud = 'authenticated',
      role = 'authenticated',
      email = 'kidist@example.com',
      encrypted_password = crypt('MBet@2023', gen_salt('bf')),
      email_confirmed_at = NOW(),
      updated_at = NOW(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = jsonb_build_object('role', 'customer'),
      confirmation_token = '',
      recovery_token = ''
    WHERE id = 'bbbbbbbb-0000-1111-2222-333333333333';
    RAISE NOTICE 'Updated user: kidist@example.com';
  ELSE
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
      jsonb_build_object('role', 'customer'),
      '',
      ''
    );
    RAISE NOTICE 'Created user: kidist@example.com';
  END IF;
  
  -- Fix user: teshome@example.com
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = 'cccccccc-0000-1111-2222-333333333333') THEN
    UPDATE auth.users SET
      aud = 'authenticated',
      role = 'authenticated',
      email = 'teshome@example.com',
      encrypted_password = crypt('MBet@2023', gen_salt('bf')),
      email_confirmed_at = NOW(),
      updated_at = NOW(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = jsonb_build_object('role', 'customer'),
      confirmation_token = '',
      recovery_token = ''
    WHERE id = 'cccccccc-0000-1111-2222-333333333333';
    RAISE NOTICE 'Updated user: teshome@example.com';
  ELSE
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
      jsonb_build_object('role', 'customer'),
      '',
      ''
    );
    RAISE NOTICE 'Created user: teshome@example.com';
  END IF;
  
  -- Fix user: driver3@example.com
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = 'dddddddd-0000-1111-2222-333333333333') THEN
    UPDATE auth.users SET
      aud = 'authenticated',
      role = 'authenticated',
      email = 'driver3@example.com',
      encrypted_password = crypt('MBet@2023', gen_salt('bf')),
      email_confirmed_at = NOW(),
      updated_at = NOW(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = jsonb_build_object('role', 'driver'),
      confirmation_token = '',
      recovery_token = ''
    WHERE id = 'dddddddd-0000-1111-2222-333333333333';
    RAISE NOTICE 'Updated user: driver3@example.com';
  ELSE
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
      jsonb_build_object('role', 'driver'),
      '',
      ''
    );
    RAISE NOTICE 'Created user: driver3@example.com';
  END IF;
  
  -- Fix user: driver4@example.com
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = 'eeeeeeee-0000-1111-2222-333333333333') THEN
    UPDATE auth.users SET
      aud = 'authenticated',
      role = 'authenticated',
      email = 'driver4@example.com',
      encrypted_password = crypt('MBet@2023', gen_salt('bf')),
      email_confirmed_at = NOW(),
      updated_at = NOW(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = jsonb_build_object('role', 'driver'),
      confirmation_token = '',
      recovery_token = ''
    WHERE id = 'eeeeeeee-0000-1111-2222-333333333333';
    RAISE NOTICE 'Updated user: driver4@example.com';
  ELSE
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
      jsonb_build_object('role', 'driver'),
      '',
      ''
    );
    RAISE NOTICE 'Created user: driver4@example.com';
  END IF;
  
  -- Fix user: driver5@example.com
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = 'ffffffff-0000-1111-2222-333333333333') THEN
    UPDATE auth.users SET
      aud = 'authenticated',
      role = 'authenticated',
      email = 'driver5@example.com',
      encrypted_password = crypt('MBet@2023', gen_salt('bf')),
      email_confirmed_at = NOW(),
      updated_at = NOW(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = jsonb_build_object('role', 'driver'),
      confirmation_token = '',
      recovery_token = ''
    WHERE id = 'ffffffff-0000-1111-2222-333333333333';
    RAISE NOTICE 'Updated user: driver5@example.com';
  ELSE
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
      jsonb_build_object('role', 'driver'),
      '',
      ''
    );
    RAISE NOTICE 'Created user: driver5@example.com';
  END IF;
  
  -- Fix user: staff2@mbet.com
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '88888888-0000-1111-2222-333333333333') THEN
    UPDATE auth.users SET
      aud = 'authenticated',
      role = 'authenticated',
      email = 'staff2@mbet.com',
      encrypted_password = crypt('MBet@2023', gen_salt('bf')),
      email_confirmed_at = NOW(),
      updated_at = NOW(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = jsonb_build_object('role', 'staff'),
      confirmation_token = '',
      recovery_token = ''
    WHERE id = '88888888-0000-1111-2222-333333333333';
    RAISE NOTICE 'Updated user: staff2@mbet.com';
  ELSE
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
      jsonb_build_object('role', 'staff'),
      '',
      ''
    );
    RAISE NOTICE 'Created user: staff2@mbet.com';
  END IF;
  
  -- Fix user: staff3@mbet.com
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '99999999-0000-1111-2222-333333333333') THEN
    UPDATE auth.users SET
      aud = 'authenticated',
      role = 'authenticated',
      email = 'staff3@mbet.com',
      encrypted_password = crypt('MBet@2023', gen_salt('bf')),
      email_confirmed_at = NOW(),
      updated_at = NOW(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = jsonb_build_object('role', 'staff'),
      confirmation_token = '',
      recovery_token = ''
    WHERE id = '99999999-0000-1111-2222-333333333333';
    RAISE NOTICE 'Updated user: staff3@mbet.com';
  ELSE
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
      jsonb_build_object('role', 'staff'),
      '',
      ''
    );
    RAISE NOTICE 'Created user: staff3@mbet.com';
  END IF;
  
  -- Also make absolutely sure the test user works by resetting password
  UPDATE auth.users
  SET encrypted_password = crypt('MBet@2023', gen_salt('bf'))
  WHERE email = 'test@mbet.com';
  
  -- Set test@mbet.com as admin
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object('role', 'admin')
  WHERE email = 'test@mbet.com';
  RAISE NOTICE 'Updated test@mbet.com to admin role';
  
  -- Try to identify any issues with tables/roles
  RAISE NOTICE '=== CHECKING SYSTEM CONFIGURATION ===';
  RAISE NOTICE 'Make sure these values match expectations:';
  
  -- Check auth.users count
  DECLARE
    auth_count integer;
  BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    RAISE NOTICE 'Total auth.users count: %', auth_count;
  END;
  
  -- List necessary extensions
  DECLARE
    has_pgcrypto boolean;
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
    ) INTO has_pgcrypto;
    
    RAISE NOTICE 'pgcrypto extension installed: %', has_pgcrypto;
    
    IF NOT has_pgcrypto THEN
      RAISE WARNING 'pgcrypto extension missing! This may prevent password hashing from working.';
    END IF;
  END;
  
  RAISE NOTICE '=== USER FIX COMPLETE ===';
  RAISE NOTICE 'All users have been updated with password: MBet@2023';
  RAISE NOTICE 'test@mbet.com set as admin role';
  RAISE NOTICE 'Original IDs and relationships preserved';
  RAISE NOTICE '===================================';
END $$;

-- Verify the users were fixed
SELECT 'Verification of fixed users:' as message;
SELECT 
  u.id,
  u.email,
  u.role as auth_role,
  u.email_confirmed_at IS NOT NULL as is_confirmed,
  (u.raw_user_meta_data->>'role') as meta_role
FROM auth.users u
WHERE u.id IN (
  '33333333-3333-3333-3333-333333333333',
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