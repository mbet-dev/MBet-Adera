-- Start transaction to ensure data consistency
BEGIN;

-- Create temporary table to store existing auth user data
CREATE TEMP TABLE temp_auth_users AS
SELECT * FROM auth.users;

-- Create temporary table to store existing profile data
CREATE TEMP TABLE temp_profiles AS
SELECT * FROM profiles;

-- Clear auth.users table
TRUNCATE TABLE auth.users CASCADE;

-- Insert users into auth.users with proper credentials and metadata
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    aud,
    role,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    is_sso_user,
    deleted_at
)
SELECT 
    p.id, -- Use original ID from profiles
    p.email,
    '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK', -- mbet321
    NOW(),
    p.created_at,
    p.updated_at,
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
        'name', COALESCE(p.full_name, CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))),
        'first_name', p.first_name,
        'last_name', p.last_name,
        'phone_number', p.phone_number,
        'role', p.role
    ),
    CASE WHEN p.role = 'admin' THEN true ELSE false END,
    false,
    CASE WHEN p.account_status = 'inactive' THEN NOW() ELSE NULL END
FROM temp_profiles p;

-- Update all foreign key references in other tables
-- This maintains relationships while using the original IDs
DO $$
DECLARE
    old_id uuid;
    new_id uuid;
BEGIN
    FOR old_id, new_id IN 
        SELECT 
            t.id as old_id,
            p.id as new_id
        FROM temp_auth_users t
        JOIN temp_profiles p ON t.email = p.email
    LOOP
        -- Update profiles table
        UPDATE profiles 
        SET id = new_id 
        WHERE id = old_id;
        
        -- Update other tables that reference auth.users
        UPDATE parcel_assignments 
        SET assigned_by = new_id 
        WHERE assigned_by = old_id;
        
        UPDATE parcel_status_history 
        SET performed_by = new_id 
        WHERE performed_by = old_id;
        
        UPDATE user_roles 
        SET user_id = new_id 
        WHERE user_id = old_id;
        
        UPDATE user_verifications 
        SET user_id = new_id, verified_by = new_id 
        WHERE user_id = old_id OR verified_by = old_id;
        
        UPDATE wallets 
        SET user_id = new_id 
        WHERE user_id = old_id;
        
        UPDATE user_activity_log 
        SET user_id = new_id 
        WHERE user_id = old_id;
        
        UPDATE support_messages 
        SET user_id = new_id 
        WHERE user_id = old_id;
        
        UPDATE notifications 
        SET user_id = new_id 
        WHERE user_id = old_id;
    END LOOP;
END $$;

-- Clean up temporary tables
DROP TABLE temp_auth_users;
DROP TABLE temp_profiles;

-- Verify the changes
SELECT 'Auth users created successfully' as result;
SELECT 
    id, 
    email, 
    role as auth_role,
    (raw_user_meta_data->>'role') as meta_role,
    email_confirmed_at IS NOT NULL as is_confirmed
FROM auth.users;

-- Commit the transaction
COMMIT; 