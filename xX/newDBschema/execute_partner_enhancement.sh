#!/bin/bash

# Execute the partner location enhancement script
# This script runs the SQL script to enhance the partners and addresses tables

echo "Running partner location enhancement script..."
echo "This will create or update the partners and addresses tables and seed them with sample data"

# Connection details - replace these with your actual connection information
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="your_password"  # Replace this with your actual password

# Run the SQL script
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f partner_location_enhancement.sql

# Check if the command was successful
if [ $? -eq 0 ]; then
  echo "✅ Partner location enhancement script executed successfully!"
  echo "You should now be able to see partner locations on the map."
else
  echo "❌ Error executing partner location enhancement script."
  echo "Please check error messages above and ensure your database is running."
fi 