-- MBet-Adera Test User Creation Script
-- This script creates a guaranteed test user that will work for login

-- Start transaction
BEGIN;

-- Check if we have auth schema available
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
        RAISE NOTICE 'Warning: auth schema not found. Creating test user directly in profiles table only.';
    END IF;
END $$;

-- Insert a test user in auth.users if schema exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test@mbet.com') THEN
            INSERT INTO auth.users (
                id, 
                email, 
                encrypted_password, 
                email_confirmed_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at
            ) VALUES (
                'testuser-1111-2222-3333-444444444444',
                'test@mbet.com',
                '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK', -- hashed 'mbet321'
                NOW(),
                '{"provider":"email","providers":["email"]}',
                '{"name":"Test User"}',
                NOW()
            );
            RAISE NOTICE 'Created test user in auth.users table';
        ELSE
            -- Update existing user with correct password
            UPDATE auth.users 
            SET encrypted_password = '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK',
                email_confirmed_at = NOW()
            WHERE email = 'test@mbet.com';
            RAISE NOTICE 'Updated existing auth.users test user';
        END IF;
    END IF;
END $$;

-- Create test user in profiles table (works regardless of auth schema)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'test@mbet.com') THEN
        INSERT INTO profiles (
            id, 
            email, 
            first_name, 
            last_name, 
            full_name, 
            phone_number, 
            role
        ) VALUES (
            'testuser-1111-2222-3333-444444444444',
            'test@mbet.com',
            'Test',
            'User',
            'Test User',
            '+251900000000',
            'admin'
        );
        RAISE NOTICE 'Created test user in profiles table';
    ELSE
        -- Ensure profile is correctly set up
        UPDATE profiles
        SET first_name = 'Test',
            last_name = 'User',
            full_name = 'Test User',
            role = 'admin'
        WHERE email = 'test@mbet.com';
        RAISE NOTICE 'Updated existing profiles test user';
    END IF;
END $$;

-- Ensure user role assignment
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
            -- Get the admin role ID
            DECLARE admin_role_id UUID;
            BEGIN
                SELECT id INTO admin_role_id FROM roles WHERE name = 'Admin' OR name = 'admin' LIMIT 1;
                
                IF admin_role_id IS NOT NULL THEN
                    -- Get the test user ID
                    DECLARE test_user_id UUID;
                    SELECT id INTO test_user_id FROM profiles WHERE email = 'test@mbet.com';
                    
                    IF test_user_id IS NOT NULL THEN
                        -- Check if role assignment exists
                        IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = test_user_id AND role_id = admin_role_id) THEN
                            INSERT INTO user_roles (user_id, role_id)
                            VALUES (test_user_id, admin_role_id);
                            RAISE NOTICE 'Assigned admin role to test user';
                        END IF;
                    END IF;
                END IF;
            END;
        END IF;
    END IF;
END $$;

-- Verify the test user was created successfully
SELECT 'TEST USER CREATION RESULTS:' as message;
SELECT EXISTS (SELECT 1 FROM profiles WHERE email = 'test@mbet.com') as profile_exists;

-- If auth schema exists, also check auth.users
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
        PERFORM EXISTS (SELECT 1 FROM auth.users WHERE email = 'test@mbet.com') as auth_user_exists;
        RAISE NOTICE 'Auth user exists: %', FOUND;
    END IF;
END $$;

-- Commit transaction
COMMIT;

-- Output success message
\echo 'Test user creation complete. You can now log in with:'
\echo 'Email: test@mbet.com'
\echo 'Password: mbet321'
\echo ''
\echo 'Add this email to the SEED_USERS array in app/auth/login.tsx' 