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

-- Function to generate consistent UUIDs for auth users
CREATE OR REPLACE FUNCTION generate_auth_user_id(email text) 
RETURNS uuid AS $$
BEGIN
    RETURN md5(email)::uuid;
END;
$$ LANGUAGE plpgsql;

-- Insert users into auth.users with proper credentials
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
)
SELECT 
    generate_auth_user_id(email),
    email,
    '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK', -- mbet321
    NOW(),
    created_at,
    updated_at
FROM temp_profiles;

-- Update all foreign key references in other tables
-- This maintains relationships while using new auth user IDs
DO $$
DECLARE
    old_id uuid;
    new_id uuid;
BEGIN
    FOR old_id, new_id IN 
        SELECT 
            t.id as old_id,
            generate_auth_user_id(t.email) as new_id
        FROM temp_auth_users t
    LOOP
        -- Update profiles table
        UPDATE profiles 
        SET id = new_id 
        WHERE id = old_id;
        
        -- Update other tables that reference auth.users
        -- Add more tables as needed
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
SELECT id, email FROM auth.users;

-- Commit the transaction
COMMIT; 