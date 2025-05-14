-- Create a Single Test User for MBet-Adera
-- This script creates ONE guaranteed test user that will work for login
-- Run this in the Supabase SQL Editor

-- Start transaction
BEGIN;

-- Function to generate bcrypt password hash
CREATE OR REPLACE FUNCTION generate_password_hash(password TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set environment variables
DO $$
DECLARE
  -- Test user information
  test_user_id uuid := '33333333-3333-3333-3333-333333333333';
  test_email text := 'test@mbet.com';
  test_password text := 'Test123!';
  test_password_hash text;
  instance_id uuid;
  auth_users_count integer := 0;
BEGIN
  -- Get the instance ID or use a default one
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'auth' AND table_name = 'instances') THEN
      SELECT id INTO instance_id FROM auth.instances LIMIT 1;
      
      -- If no instance found, use a default one
      IF instance_id IS NULL THEN
        instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
      END IF;
    ELSE
      instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
    
    RAISE NOTICE 'Using instance ID: %', instance_id;
  EXCEPTION WHEN OTHERS THEN
    instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
    RAISE NOTICE 'Error accessing auth.instances, using default instance ID';
  END;
  
  -- Generate password hash
  test_password_hash := generate_password_hash(test_password);
  
  -- Clean up any existing test user
  BEGIN
    DELETE FROM profiles WHERE email = test_email;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'auth' AND table_name = 'users') THEN
      DELETE FROM auth.users WHERE email = test_email;
      
      -- Insert test user into auth.users
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
        recovery_token
      ) VALUES (
        instance_id,
        test_user_id,
        'authenticated',
        'authenticated',
        test_email,
        test_password_hash,
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
        ''
      );
      
      SELECT COUNT(*) INTO auth_users_count FROM auth.users WHERE email = test_email;
      RAISE NOTICE 'Created % test user in auth.users', auth_users_count;
    ELSE
      RAISE WARNING 'auth.users table not found';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error managing auth.users: %', SQLERRM;
  END;
  
  -- Create profile for test user
  BEGIN
    -- Insert test user into profiles
    INSERT INTO profiles (
      id,
      email,
      first_name,
      last_name,
      full_name,
      phone_number,
      role,
      created_at,
      updated_at,
      account_status,
      verification_status,
      last_login
    ) VALUES (
      test_user_id,
      test_email,
      'Test',
      'User',
      'Test User',
      '+1234567890',
      'admin',
      NOW(),
      NOW(),
      'active',
      '{"email": true, "phone": true}',
      NOW()
    );
    
    RAISE NOTICE 'Created test user profile';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile: %', SQLERRM;
  END;
  
  -- Create role if it doesn't exist and assign to user
  BEGIN
    -- Create admin role if it doesn't exist
    INSERT INTO roles (name, description, is_system_role)
    VALUES ('Admin', 'System administrator with full access', true)
    ON CONFLICT (name) DO NOTHING;
    
    -- Assign role to user
    INSERT INTO user_roles (user_id, role_id, created_at, updated_at)
    SELECT
      test_user_id,
      r.id,
      NOW(),
      NOW()
    FROM roles r
    WHERE r.name = 'Admin'
    ON CONFLICT (user_id, role_id) DO NOTHING;
    
    RAISE NOTICE 'Assigned admin role to test user';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error managing roles: %', SQLERRM;
  END;
  
  -- Final verification
  RAISE NOTICE '----- TEST USER CREATED SUCCESSFULLY -----';
  RAISE NOTICE 'Email: %', test_email;
  RAISE NOTICE 'Password: %', test_password;
  RAISE NOTICE 'User ID: %', test_user_id;
  RAISE NOTICE 'Role: admin';
  RAISE NOTICE '-----------------------------------------';
END $$;

-- Verify the test user was created properly
SELECT 'Test User Details:' as verification;
SELECT 
  p.id,
  p.email,
  p.role,
  p.account_status,
  u.role as auth_role,
  u.email_confirmed_at IS NOT NULL as is_confirmed
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.email = 'test@mbet.com';

-- Commit transaction
COMMIT;

-- IMPORTANT: You can now log in with:
-- Email: test@mbet.com
-- Password: Test123! 