#!/bin/bash

echo "Executing partner_locations_fix.sql..."
echo
echo "This script will fix the partner locations in the database,"
echo "making sure the policy creation doesn't cause errors."
echo
echo "Please run this in the Supabase SQL Editor"
echo
echo "Press Enter to copy the SQL to your clipboard..."
read

# Copy to clipboard using either xclip (Linux) or pbcopy (Mac)
if command -v pbcopy > /dev/null; then
    cat $(dirname "$0")/partner_locations_fix.sql | pbcopy
    echo "SQL copied to clipboard using pbcopy (Mac)"
elif command -v xclip > /dev/null; then
    cat $(dirname "$0")/partner_locations_fix.sql | xclip -selection clipboard
    echo "SQL copied to clipboard using xclip (Linux)"
else
    echo "Could not copy to clipboard. Please manually open the file:"
    echo "$(dirname "$0")/partner_locations_fix.sql"
fi

echo
echo "1. Go to your Supabase project in the browser"
echo "2. Navigate to the SQL Editor"
echo "3. Paste the SQL (Ctrl+V or Cmd+V)"
echo "4. Run the query"
echo
echo "Press Enter to exit..."
read 