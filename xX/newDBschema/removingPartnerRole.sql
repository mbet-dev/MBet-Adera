-- MBet-Adera - Remove Partner Role from Schema
-- This script removes the Partner role from the database

-- Begin transaction
BEGIN;

-- 1. Delete user_roles assignments for Partner role
DELETE FROM user_roles 
WHERE role_id IN (SELECT id FROM roles WHERE name = 'Partner');

-- 2. Delete the Partner role
DELETE FROM roles 
WHERE name = 'Partner';

-- 3. Update profiles that had partner role to staff role
UPDATE profiles 
SET role = 'staff' 
WHERE role = 'partner';

-- 4. Update facility addresses to be company owned (no longer partner-owned)
-- Keep the addresses but change descriptions to indicate company ownership
UPDATE addresses
SET street_address = REPLACE(street_address, 'Partner', 'Company')
WHERE is_facility = true;

-- Commit transaction
COMMIT;

-- Note: This script should be run before the seed_data.sql script
-- to ensure the Partner role is completely removed from the system.
