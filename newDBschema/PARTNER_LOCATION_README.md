# Partner Location Enhancement

This document describes the partner location feature enhancement for the MBet-Adera Delivery System.

## Overview

The partner location enhancement adds comprehensive support for displaying partner locations on the map interface, including:

1. **Enhanced Database Schema**: Improved tables for partners and addresses with additional fields
2. **Sample Data**: Realistic location data for partner offices and facilities
3. **Frontend Integration**: Updated UI to properly display partner details in a popup modal

## Database Changes

### Partners Table

The partners table has been enhanced with the following fields:

- `id`: Unique identifier
- `business_name`: Name of the partner business
- `contact_person`: Name of the primary contact
- `phone_number`: Contact phone number
- `email`: Contact email address
- `business_type`: Type of business ('sorting_facility', 'pickup_point', 'dropoff_point', 'both')
- `description`: Detailed description of the partner
- `working_hours`: JSON structure containing working hours by day
- `color`: Color for map marker display
- `is_facility`: Whether this is a sorting facility
- `is_active`: Whether this partner is active
- Plus several other metadata fields

### Addresses Table

The addresses table stores location data for partners:

- `id`: Unique identifier
- `partner_id`: Reference to partner
- `address_line`: Main address line
- `street_address`: Additional address details
- `city`: City
- `latitude` & `longitude`: Coordinates for map display
- `is_facility`: Whether this is a facility location
- Plus several other metadata fields

### Partner Locations View

A new database view `partner_locations` combines data from both tables for easier frontend queries.

## Sample Data

The script includes sample data for:

- 1 main sorting facility
- 1 mini hub location
- 6 partner pickup/dropoff points

All sample locations are distributed across Addis Ababa with realistic coordinates and business details.

## How to Use

### Running the Enhancement Script

1. Ensure your Supabase instance is running
2. Update connection details in `execute_partner_enhancement.sh`:
   ```
   DB_HOST="localhost"
   DB_PORT="5432"
   DB_NAME="postgres"
   DB_USER="postgres"
   DB_PASSWORD="your_password"  # Replace with actual password
   ```
3. Run the script:
   ```
   bash execute_partner_enhancement.sh
   ```

### Frontend Integration

The frontend code has been updated to:

1. Use the new `partner_locations` view for fetching data
2. Display comprehensive partner details in the modal popup
3. Properly handle working hours formatting
4. Show appropriate UI elements based on partner type

### Map Markers

Partner locations are displayed as map markers with:

- Custom colors based on the partner's defined color
- Different sizes based on importance (facilities are larger)
- Custom icons for facilities
- Detailed popups on selection

## Troubleshooting

If markers don't appear:

1. Check the browser console for API errors
2. Verify that the database has partner and address records
3. Confirm that coordinates are within the map's visible region
4. Ensure the frontend fetch operation is working correctly

## License

This enhancement is part of the MBet-Adera application codebase and follows the same licensing terms. 