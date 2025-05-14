# Partner Location Fix

This document describes how to fix the partner location display issue in the MBet-Adera application.

## Problem Description

The current implementation has issues with displaying partner locations on the map due to:

1. Missing or incorrectly structured database tables
2. Incomplete data for partner locations
3. Frontend components not properly fetching or displaying the data

## Solution

The solution involves:

1. Running a SQL script to set up the database correctly
2. Making sure the frontend components use the proper data source
3. Formatting the partner details for display on the map and in the modal

## How to Fix

### 1. Database Fix

Execute the `partner_locations_fix.sql` script in the Supabase SQL Editor:

1. Log in to your Supabase project
2. Go to the SQL Editor
3. Copy and paste the contents of `partner_locations_fix.sql`
4. Run the script

Alternatively, you can use the provided helper scripts:
- On Windows: Run `execute_partner_locations_fix.bat`
- On Mac/Linux: Run `execute_partner_locations_fix.sh`

These scripts will copy the SQL to your clipboard and provide instructions for running it in the Supabase SQL Editor.

#### Handling "Policy already exists" Error

If you encounter an error like:
```
ERROR: 42710: policy "partners_select_policy" for table "partners" already exists
```

The updated script handles this automatically by checking if policies exist before creating them. If you're still seeing this error, ensure you're using the latest version of `partner_locations_fix.sql`.

### 2. Frontend Integration

The frontend code is already set up to use the `partner_locations` view. After running the script, the map should display partner locations correctly.

If you need to modify how partner locations are displayed, check these files:
- `src/screens/main/HomeNew.tsx` - Contains the map display and partner location fetching
- `components/orders/PartnerLocationComponent.tsx` - Component for selecting partner locations

## Verifying the Fix

After applying the fix:

1. Restart your application
2. Navigate to the home screen where the map is displayed
3. You should see markers for each partner location
4. Clicking on a marker should display details about that partner

## Partner Data

The script includes sample data for 8 partners in Addis Ababa:

1. MBet-Adera Sorting Facility Hub (main facility)
2. Bole Supermarket
3. Mexico Pharmacy
4. Piassa Market
5. Kazanchis Office
6. Megenagna Mini Hub (mini facility)
7. Lamberet Express
8. Ayat Terminal

Each partner has realistic:
- Contact information
- Working hours
- Geographic coordinates
- Business type and description

## Troubleshooting

If markers still don't appear after applying the fix:

1. Check the browser console for any errors
2. Verify the script ran successfully by checking the Supabase database
3. Make sure the `partner_locations` view was created correctly
4. Check that the frontend is fetching data from the `partner_locations` view

### Common Issues

1. **"Policy already exists" error** - The script has been updated to handle this by checking if policies exist before creating them.
2. **View not created properly** - Check if the `partner_locations` view exists in your database and has the correct structure.
3. **Data not inserted** - If the tables were empty, sample data should have been inserted. Verify this in the Supabase Table Editor.

## Additional Customization

You can customize the partner locations by:
1. Adding more locations to the database
2. Changing the marker colors in the `color` field
3. Modifying the working hours format
4. Adjusting the details displayed in the partner modal 