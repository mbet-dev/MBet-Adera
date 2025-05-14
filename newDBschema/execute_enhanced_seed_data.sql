/*
MBet-Adera Enhanced Seed Data Execution Script

This is a standard SQL script without psql-specific metacommands.
To properly execute all seed data scripts, follow these steps:

1. Execute "enhanced_seed_data.sql" first
2. Then execute "enhanced_seed_data_part2.sql" 
3. Finally execute "enhanced_seed_data_part3.sql"

Each script contains its own transaction block, so they should be run separately.
*/

-- This script simply includes comments to guide execution
-- Execute the following files in order:
-- 1. enhanced_seed_data.sql
-- 2. enhanced_seed_data_part2.sql
-- 3. enhanced_seed_data_part3.sql

-- Alternatively, you can run them using psql with:
--    psql -U your_username -d your_database -f enhanced_seed_data.sql
--    psql -U your_username -d your_database -f enhanced_seed_data_part2.sql
--    psql -U your_username -d your_database -f enhanced_seed_data_part3.sql 