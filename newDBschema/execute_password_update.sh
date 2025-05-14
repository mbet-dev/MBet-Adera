#!/bin/bash

# MBet-Adera Password Update Script Executor
# This script connects to your Supabase database and executes the password update script

# Read environment variables from .env file if it exists
if [ -f "../.env" ]; then
  echo "Loading environment variables from .env file..."
  source "../.env"
fi

# Ensure required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: Missing required environment variables."
  echo "Please make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
  exit 1
fi

# Extract database credentials from the Supabase URL
DB_HOST=$(echo $SUPABASE_URL | awk -F[/:] '{print $4}')
DB_NAME="postgres"
DB_USER="postgres"
DB_PORT="5432"

# Use service_role key to create a temporary JWT token for database access
echo "Authenticating with Supabase..."
JWT_TOKEN=$SUPABASE_SERVICE_ROLE_KEY

# Execute the password update script
echo "Updating user passwords in the database..."
PGPASSWORD=$JWT_TOKEN psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f update_passwords.sql

# Check the result
if [ $? -eq 0 ]; then
  echo "✅ Password update completed successfully!"
  echo "All users can now log in with password: mbet321"
else
  echo "❌ Password update failed. Please check the error messages above."
fi

echo "Done." 