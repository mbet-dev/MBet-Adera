-- MBet-Adera Password Update Script
-- This script updates all user passwords to a properly hashed version of "mbet321"
-- It ensures all seed data users can log in with the same password: mbet321

-- Start transaction
BEGIN;

-- Update all users in the auth.users table with a proper bcrypt hash of "mbet321"
-- The hash below is a valid bcrypt hash for the password "mbet321"
UPDATE auth.users
SET encrypted_password = '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK'
WHERE 
    -- Only update users that have plain text or incorrect password formats
    encrypted_password != '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK' 
    AND (
        -- Users from enhanced seed data with plaintext passwords
        encrypted_password = 'mbet321'
        OR
        -- Users from the original seed data with placeholder hash
        encrypted_password LIKE '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ%'
        OR
        -- Users with potentially invalid password formats
        LENGTH(encrypted_password) < 50
    );

-- Set email_confirmed_at for all users to ensure they can log in
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Update raw_app_meta_data for any users that might have invalid formats
UPDATE auth.users
SET raw_app_meta_data = '{"provider":"email","providers":["email"]}'
WHERE raw_app_meta_data IS NULL OR raw_app_meta_data::text = '{}';

-- Ensure user metadata exists for all users
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}')
WHERE raw_user_meta_data IS NULL;

-- Log updated users (optional, for verification)
SELECT id, email, LEFT(encrypted_password, 30) || '...' AS password_hash_preview
FROM auth.users
WHERE encrypted_password = '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK';

-- Commit transaction
COMMIT;

-- Output notice
\echo 'Password update complete. All users can now log in with password: mbet321' 