-- MBet-Adera Database Enhancement Execution Script
-- This script runs all enhancement scripts in the proper order to ensure dependencies are met

-- Begin transaction
BEGIN;

-- Extension setup first (required by all scripts)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Fix the immediate issue - user_retention view
\echo 'Applying user retention view fix...'
\i simplified_user_retention_fix.sql

-- 2. Payment Gateway Integration (foundational for other enhancements)
\echo 'Setting up payment gateway integration...'
\i 01_payment_gateway_integration.sql

-- 3. Pricing System (depends on payment structures)
\echo 'Setting up pricing system...'
\i 02_pricing_system.sql

-- 4. User Roles and Permissions (foundational for personnel)
\echo 'Setting up user roles and permissions...'
\i user_roles_enhancement.sql

-- 5. Tracking and Personnel (depends on user roles)
\echo 'Setting up tracking and personnel management...'
\i tracking_and_personnel_enhancement.sql

-- 6. Analytics and Reporting (depends on all previous components)
\echo 'Setting up analytics and reporting capabilities...'
\i analytics_and_reporting_enhancement.sql

-- Alternatively, you can use the complete schema enhancement
-- which contains all the above components but requires more resources
-- Uncomment if you prefer to use this instead of the individual scripts
-- \echo 'Applying complete schema enhancement...'
-- \i fixed_complete_schema_enhancement.sql

-- Commit all changes
COMMIT;

\echo 'All enhancements have been successfully applied to the database!'
\echo 'Make sure to test the system thoroughly, especially the user_retention view.' 