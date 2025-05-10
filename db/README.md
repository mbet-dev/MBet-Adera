# Database Migration Guide

This directory contains SQL scripts and migration tools for the MBet-Adera application database.

## Contents

- `functions/` - SQL functions to be installed in the Supabase database
  - `exec_sql.sql` - Helper function for executing SQL commands (admin only)
  - `get_partner_locations.sql` - Function to retrieve partner locations with address data
  - `get_parcel_statistics.sql` - Function to calculate parcel statistics for a user
  - `get_active_deliveries.sql` - Function to efficiently fetch active deliveries for a user
  - `get_paginated_parcels.sql` - Function to fetch paginated parcels with proper sorting and filtering

- `migrate.js` - Node.js script to deploy database functions to Supabase

## How to Apply Migrations

### Method 1: Using the Migration Script

1. Ensure your environment variables are set:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Run the migration script:
   ```
   node db/migrate.js
   ```

### Method 2: Manual SQL Execution

1. Log in to the Supabase dashboard
2. Navigate to the SQL Editor
3. Execute each SQL file in the following order:
   - `functions/exec_sql.sql`
   - `functions/get_partner_locations.sql`
   - `functions/get_parcel_statistics.sql`
   - `functions/get_active_deliveries.sql`
   - `functions/get_paginated_parcels.sql`

## Important Notes

- The `exec_sql` function is a powerful admin tool that allows arbitrary SQL execution. It should not be accessible to regular users.
- These functions improve performance by moving complex queries to the database layer.
- After applying these changes, restart your application to ensure the new functions are used.

## Database Function Details

### get_partner_locations()
Returns all partner locations with their addresses joined in a single query.

### get_parcel_statistics(user_id)
Returns counts of active, delivered, and cancelled parcels for a specific user.

### get_active_deliveries(user_id)
Returns all active parcels (pending, confirmed, picked-up, in-transit) for a specific user.

### get_paginated_parcels(user_id, p_status, p_limit, p_offset, sort_by, sort_direction)
Returns paginated parcels with flexible sorting and filtering options.

## Troubleshooting

If you encounter issues:

1. Check the Supabase logs for errors
2. Verify that your service role key has permission to create functions
3. Make sure the SQL syntax in the function files is compatible with your Supabase PostgreSQL version
4. Check that all tables and columns referenced in the functions exist in your database 