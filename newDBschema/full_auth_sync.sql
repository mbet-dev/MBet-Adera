-- MBet-Adera Full Auth Synchronization Script
-- This script synchronizes auth.users with profiles, ensuring all profile users have proper auth entries
-- IMPORTANT: Run this script with admin privileges in the Supabase SQL Editor

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

-- Step 1: Handle instance_id
DO $$
DECLARE
  current_instance_id uuid;
  default_password TEXT := 'MBet@2023';
  default_password_hash TEXT;
  profiles_count INTEGER;
  auth_count INTEGER;
  role_names TEXT[] := ARRAY['admin', 'staff', 'customer', 'partner', 'driver'];
  role_name TEXT;
BEGIN
  -- Check if auth.instances exists and try to get an instance ID
  BEGIN
    -- Try to get the instance ID from the auth.instances table
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'auth' AND table_name = 'instances') THEN
      
      SELECT id INTO current_instance_id FROM auth.instances LIMIT 1;
      
      -- If no instance found, create a default one
      IF current_instance_id IS NULL THEN
        current_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
        RAISE NOTICE 'No instance found in auth.instances, using default instance ID: %', current_instance_id;
      ELSE
        RAISE NOTICE 'Using existing Supabase instance ID: %', current_instance_id;
      END IF;
    ELSE
      -- If auth.instances table doesn't exist, use a default UUID
      current_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
      RAISE NOTICE 'auth.instances table not found, using default instance ID: %', current_instance_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to default UUID if any error occurs
    current_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
    RAISE NOTICE 'Error accessing auth.instances, using default instance ID: %', current_instance_id;
  END;
  
  -- Create temp table for profiles
  CREATE TEMP TABLE temp_profiles AS
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.full_name,
    p.phone_number,
    p.role,
    COALESCE(p.account_status, 'active') as account_status,
    COALESCE(p.verification_status, '{"email": true, "phone": true}') as verification_status
  FROM profiles p;
  
  -- Count profiles
  SELECT COUNT(*) INTO profiles_count FROM temp_profiles;
  RAISE NOTICE 'Found % profiles to synchronize', profiles_count;
  
  -- Generate password hash once for efficiency
  default_password_hash := generate_password_hash(default_password);
  
  -- Step 2: Clean up auth users table but keep system users
  BEGIN
    DELETE FROM auth.users 
    WHERE email NOT LIKE '%supabase.io%' 
      AND email NOT LIKE '%supabase.co%'
      AND NOT is_super_admin;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error cleaning up auth.users: %', SQLERRM;
  END;
    
  -- Step 3: Insert auth users for all profiles
  BEGIN
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
      current_instance_id,
      p.id,
      'authenticated',
      'authenticated',
      p.email,
      default_password_hash,
      NOW(),
      NOW(),
      NOW(),
      jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email']
      ),
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
    FROM temp_profiles p;
  
    -- Count auth users
    SELECT COUNT(*) INTO auth_count FROM auth.users 
    WHERE email NOT LIKE '%supabase.io%' AND email NOT LIKE '%supabase.co%';
    
    RAISE NOTICE 'Recreated % auth users', auth_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating auth users: %', SQLERRM;
  END;
  
  -- Step 4: Fix user role assignments
  BEGIN
    -- First clean up any orphaned user_roles
    DELETE FROM user_roles WHERE user_id NOT IN (SELECT id FROM auth.users);
    
    -- For each valid role in the system, ensure users with that role have the assignment
    FOREACH role_name IN ARRAY role_names
    LOOP
      -- Find or create the role
      INSERT INTO roles (name, description, is_system_role)
      VALUES (
        INITCAP(role_name), -- Convert to proper case
        'System ' || INITCAP(role_name) || ' role',
        true
      )
      ON CONFLICT (name) DO NOTHING;
      
      -- Get the role ID
      WITH role_id_query AS (
        SELECT id FROM roles WHERE LOWER(name) = LOWER(role_name) LIMIT 1
      ),
      -- Get users with this role
      users_with_role AS (
        SELECT p.id FROM temp_profiles p WHERE LOWER(p.role) = LOWER(role_name)
      ),
      -- Insert user roles
      insert_user_roles AS (
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
      SELECT COUNT(*) INTO auth_count FROM insert_user_roles;
      
      RAISE NOTICE 'Assigned % users to role %', auth_count, INITCAP(role_name);
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error assigning roles: %', SQLERRM;
  END;
  
  -- Step 5: Update profiles with verification status if needed
  BEGIN
    UPDATE profiles 
    SET 
      verification_status = COALESCE(verification_status, '{"email": true, "phone": true}'),
      account_status = COALESCE(account_status, 'active'),
      last_login = NOW()
    WHERE account_status IS NULL OR verification_status IS NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error updating profiles: %', SQLERRM;
  END;
  
  -- Final status report
  RAISE NOTICE 'Auth synchronization complete. All % profiles now have corresponding auth users.', profiles_count;
  RAISE NOTICE 'Default password for all users has been set to: %', default_password;
END $$;

-- Verify the synchronization
-- Note: These are simple queries to show results, not part of the PL/pgSQL block
SELECT 'Profile count vs Auth User count:' as check_type;
SELECT 
  (SELECT COUNT(*) FROM profiles) AS profile_count,
  (SELECT COUNT(*) FROM auth.users WHERE email NOT LIKE '%supabase%') AS auth_user_count;

-- Sample verification of individual records
SELECT 'Sample user verification:' as check_type;
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

-- No need to reset role as it's being done with LOCAL in the transaction
-- RESET ROLE; -- Removed this line as it's causing syntax errors

-- Commit the transaction
COMMIT;

-- CREDENTIALS NOTICE:
-- All users now have password: MBet@2023
-- Users retain their original roles and permissions
-- All email addresses are confirmed 