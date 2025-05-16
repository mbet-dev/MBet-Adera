-- MBet-Adera Simple Authentication Fix Script
-- This script attempts to add missing users to auth.users table
-- without deleting existing records

-- Start transaction
BEGIN;

-- Set role to postgres to bypass RLS
SET LOCAL ROLE postgres;

-- Function to insert or update users
DO $$
DECLARE
  instance_id uuid;
  user_count integer := 0;
  exists_count integer := 0;
BEGIN
  -- Get the instance ID
  SELECT id INTO instance_id FROM auth.instances LIMIT 1;
  IF instance_id IS NULL THEN
    instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;
  
  RAISE NOTICE 'Starting user validation process';
  RAISE NOTICE 'Instance ID: %', instance_id;
  
  -- Check which users already exist
  SELECT COUNT(*) INTO user_count FROM auth.users;
  SELECT COUNT(*) INTO exists_count 
  FROM auth.users 
  WHERE id IN (
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
  
  RAISE NOTICE 'Found % total users in auth.users', user_count;
  RAISE NOTICE 'Found % of our target users', exists_count;
  
  -- Update test@mbet.com to admin
  UPDATE auth.users
  SET 
    raw_user_meta_data = jsonb_build_object('role', 'admin'),
    email_confirmed_at = NOW()
  WHERE email = 'test@mbet.com';
  RAISE NOTICE 'Updated test@mbet.com to admin role';
  
  -- Try to insert bereket@example.com if doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'aaaaaaaa-0000-1111-2222-333333333333') THEN
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
    RAISE NOTICE 'Inserted user: bereket@example.com';
  ELSE
    RAISE NOTICE 'User bereket@example.com already exists';
  END IF;
  
  -- Try to insert kidist@example.com if doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'bbbbbbbb-0000-1111-2222-333333333333') THEN
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
    RAISE NOTICE 'Inserted user: kidist@example.com';
  ELSE
    RAISE NOTICE 'User kidist@example.com already exists';
  END IF;
  
  -- Try to insert teshome@example.com if doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'cccccccc-0000-1111-2222-333333333333') THEN
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
    RAISE NOTICE 'Inserted user: teshome@example.com';
  ELSE
    RAISE NOTICE 'User teshome@example.com already exists';
  END IF;
  
  -- Try to insert driver3@example.com if doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'dddddddd-0000-1111-2222-333333333333') THEN
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
    RAISE NOTICE 'Inserted user: driver3@example.com';
  ELSE
    RAISE NOTICE 'User driver3@example.com already exists';
  END IF;
  
  -- Try to insert driver4@example.com if doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'eeeeeeee-0000-1111-2222-333333333333') THEN
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
    RAISE NOTICE 'Inserted user: driver4@example.com';
  ELSE
    RAISE NOTICE 'User driver4@example.com already exists';
  END IF;
  
  -- Try to insert driver5@example.com if doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'ffffffff-0000-1111-2222-333333333333') THEN
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
    RAISE NOTICE 'Inserted user: driver5@example.com';
  ELSE
    RAISE NOTICE 'User driver5@example.com already exists';
  END IF;
  
  -- Try to insert staff2@mbet.com if doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '88888888-0000-1111-2222-333333333333') THEN
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
    RAISE NOTICE 'Inserted user: staff2@mbet.com';
  ELSE
    RAISE NOTICE 'User staff2@mbet.com already exists';
  END IF;
  
  -- Try to insert staff3@mbet.com if doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '99999999-0000-1111-2222-333333333333') THEN
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
    RAISE NOTICE 'Inserted user: staff3@mbet.com';
  ELSE
    RAISE NOTICE 'User staff3@mbet.com already exists';
  END IF;
  
  -- Also make sure these users have confirmed emails
  UPDATE auth.users
  SET 
    email_confirmed_at = NOW(),
    encrypted_password = CASE
      WHEN encrypted_password IS NULL OR encrypted_password = '' THEN crypt('MBet@2023', gen_salt('bf'))
      ELSE encrypted_password
    END
  WHERE id IN (
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
  
  RAISE NOTICE '=== USER FIX COMPLETE ===';
  RAISE NOTICE 'All users have been created or updated with password: MBet@2023';
  RAISE NOTICE 'test@mbet.com set as admin role';
  RAISE NOTICE 'Original IDs and relationships preserved';
  RAISE NOTICE '===================================';
END $$;

-- Verify the users were fixed
SELECT 'Verification of users:' as message;
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