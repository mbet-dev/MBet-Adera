-- MBet-Adera Production Auth Synchronization Script
-- This script syncs ALL existing users in profiles with auth.users
-- Preserves all relationships and data, sets a known password for all users
-- IMPORTANT: Run this in the Supabase SQL Editor

-- Start transaction
BEGIN;

-- Set role to postgres to bypass RLS
SET LOCAL ROLE postgres;

-- Function to generate bcrypt password hash
CREATE OR REPLACE FUNCTION generate_password_hash(password TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main synchronization process
DO $$
DECLARE
  default_password TEXT := 'MBet@2023'; -- Standard password for all users
  default_password_hash TEXT;
  instance_id uuid;
  profiles_count INTEGER;
  updated_count INTEGER;
  created_count INTEGER;
  relationships_count INTEGER;
  profile_record RECORD;
  role_record RECORD;
BEGIN
  -- Get instance ID
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
  
  -- Generate password hash once for efficiency
  default_password_hash := generate_password_hash(default_password);
  
  -- Count profiles to be processed
  SELECT COUNT(*) INTO profiles_count FROM profiles;
  RAISE NOTICE 'Found % profiles to synchronize', profiles_count;

  -- Initialize counters
  updated_count := 0;
  created_count := 0;
  relationships_count := 0;
  
  -- STEP 1: Create temporary table with profile data for processing
  CREATE TEMP TABLE profiles_to_sync AS
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.full_name,
    p.phone_number,
    COALESCE(p.role, 'customer') AS role,
    COALESCE(p.account_status, 'active') AS account_status,
    COALESCE(p.verification_status, '{"email": true, "phone": true}'::jsonb) AS verification_status
  FROM profiles p;
  
  -- STEP 2: Update existing auth users to match profiles
  UPDATE auth.users AS u
  SET 
    email = p.email,
    encrypted_password = default_password_hash,
    email_confirmed_at = NOW(),
    updated_at = NOW(),
    raw_user_meta_data = jsonb_build_object(
      'name', COALESCE(p.full_name, CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))),
      'first_name', p.first_name,
      'last_name', p.last_name,
      'phone_number', p.phone_number,
      'role', p.role
    ),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    is_super_admin = CASE WHEN p.role = 'admin' THEN true ELSE false END,
    deleted_at = CASE WHEN p.account_status = 'inactive' THEN NOW() ELSE NULL END
  FROM profiles_to_sync p
  WHERE u.id = p.id;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % existing auth users', updated_count;
  
  -- STEP 3: Insert new auth users for profiles that don't have auth entries
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
  )
  SELECT 
    instance_id,
    p.id,
    'authenticated',
    'authenticated',
    p.email,
    default_password_hash,
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'name', COALESCE(p.full_name, CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))),
      'first_name', p.first_name,
      'last_name', p.last_name,
      'phone_number', p.phone_number,
      'role', p.role
    ),
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    CASE WHEN p.role = 'admin' THEN true ELSE false END,
    false,
    CASE WHEN p.account_status = 'inactive' THEN NOW() ELSE NULL END
  FROM profiles_to_sync p
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = p.id
  );
  
  GET DIAGNOSTICS created_count = ROW_COUNT;
  RAISE NOTICE 'Created % new auth users', created_count;
  
  -- STEP 4: Update profile metadata as needed
  UPDATE profiles
  SET 
    verification_status = COALESCE(verification_status, '{"email": true, "phone": true}'::jsonb),
    account_status = COALESCE(account_status, 'active'),
    last_login = NOW()
  WHERE 
    verification_status IS NULL OR 
    account_status IS NULL;
  
  -- STEP 5: Ensure roles exist and user-role relationships are correct
  -- First ensure all necessary roles exist
  FOR role_record IN 
    SELECT DISTINCT LOWER(role) as role_name FROM profiles_to_sync
  LOOP
    -- Create the role if it doesn't exist
    INSERT INTO roles (name, description, is_system_role)
    VALUES (
      INITCAP(role_record.role_name),
      'Auto-created ' || INITCAP(role_record.role_name) || ' role',
      true
    )
    ON CONFLICT (name) DO NOTHING;
    
    -- Associate users with this role if not already associated
    WITH role_id_query AS (
      SELECT id FROM roles WHERE LOWER(name) = role_record.role_name LIMIT 1
    ),
    users_with_role AS (
      SELECT id FROM profiles_to_sync WHERE LOWER(role) = role_record.role_name
    ),
    insertion_result AS (
      INSERT INTO user_roles (user_id, role_id, created_at, updated_at)
      SELECT 
        uwr.id, 
        (SELECT id FROM role_id_query),
        NOW(),
        NOW()
      FROM users_with_role uwr
      WHERE NOT EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = uwr.id AND ur.role_id = (SELECT id FROM role_id_query)
      )
      RETURNING user_id
    )
    SELECT COUNT(*) INTO relationships_count FROM insertion_result;
    
    RAISE NOTICE 'Assigned % users to role %', relationships_count, INITCAP(role_record.role_name);
  END LOOP;
  
  -- STEP 6: Clean up orphaned user_roles
  DELETE FROM user_roles WHERE user_id NOT IN (SELECT id FROM auth.users);
  
  -- Final report
  RAISE NOTICE '=== AUTH SYNCHRONIZATION COMPLETE ===';
  RAISE NOTICE 'Total profiles processed: %', profiles_count;
  RAISE NOTICE 'Existing auth users updated: %', updated_count;
  RAISE NOTICE 'New auth users created: %', created_count;
  RAISE NOTICE 'Password for all users: %', default_password;
  RAISE NOTICE '======================================';
END $$;

-- Verify the synchronization
SELECT 'Profile count vs Auth User count:' as verification;
SELECT 
  (SELECT COUNT(*) FROM profiles) AS profile_count,
  (SELECT COUNT(*) FROM auth.users WHERE email NOT LIKE '%supabase%') AS auth_user_count,
  ((SELECT COUNT(*) FROM profiles) - 
   (SELECT COUNT(*) FROM auth.users WHERE email NOT LIKE '%supabase%')) AS difference;

-- Sample user verification
SELECT 'Sample users:' as verification;
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
LIMIT 5;

-- Commit the transaction
COMMIT;

-- INSTRUCTIONS:
-- 1. Run this script in the Supabase SQL Editor
-- 2. All users will now have password: MBet@2023
-- 3. All email addresses are confirmed automatically
-- 4. All relationships between profiles, auth.users, and roles are maintained
-- 5. No data is lost from other tables (parcels, etc.) 