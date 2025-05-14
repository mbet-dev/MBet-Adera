# Partner Locations Enhancement

This document explains the partner locations enhancement in the MBet-Adera delivery application.

## Overview

The partner locations feature allows users to:

1. View partner locations on a map
2. See detailed information about each partner
3. Use these locations as pickup or dropoff points

## Implementation

### Database

The enhancement includes:

1. `partners` table with enhanced fields:
   - Business details (name, type, description)
   - Contact information (email, phone, contact person)
   - Working hours in JSON format
   - Visual properties (color)

2. `addresses` table for location data:
   - Geographic coordinates (latitude, longitude)
   - Address information
   - Relationship to partners

3. `partner_locations` view that joins these tables for easy data access

### Frontend Components

Key components:

1. **Map Display**: Shows partner locations with custom markers on the map
2. **Partner Details Modal**: Displays comprehensive partner information when a marker is selected
3. **Partner Selection**: Allows using partners as pickup or dropoff points for deliveries

## How to Use

### Viewing Partner Locations

1. Open the home screen of the application
2. The map will display markers for all partner locations
3. Tap on a marker to view details about that partner

### Partner Details

When you tap on a partner location, you'll see:

- Partner name and type
- Contact information (clickable phone and email)
- Address
- Working hours with current status
- Business description
- Options to use as pickup or dropoff point

### Using a Partner Location

After viewing partner details, you can:
1. Tap "Use as Pickup" to set this location as the pickup point for a new delivery
2. Tap "Use as Dropoff" to set this location as the destination for a new delivery

## Partner Types

The system supports different types of partner locations with distinctive icon markers:

1. **Sorting Facilities**: Internal locations for package processing (truck icon)
2. **Pickup Points**: Partners that accept packages for shipping (add location icon)
3. **Dropoff Points**: Partners that receive packages for customers (flag icon)
4. **Both**: Partners that serve as both pickup and dropoff points (store icon)

## Working Hours Display

The working hours display includes:

- Day-by-day schedule
- Current day highlighted
- Open/Closed status indicators
- "Open Now" and "Closed" badges for the current day

## Technical Details

### SQL Script

To set up the database for partner locations:

1. Run the `partner_locations_fix.sql` script in the Supabase SQL Editor
2. The script creates/updates tables and populates sample data

### Key Files

- `src/screens/main/HomeNew.tsx` - Main map display and partner details modal
- `src/components/OpenStreetMap.tsx` - Native map implementation
- `src/components/OpenStreetMap.web.tsx` - Web-specific map implementation
- `newDBschema/partner_locations_fix.sql` - Database setup script

## Troubleshooting

If partner locations don't appear:

1. Check browser console for any errors
2. Ensure the database schema was properly setup
3. Check that there are valid entries in the partners and addresses tables
4. Verify that the partner_locations view was created

### Common Issues

1. **"Policy already exists" error** - The script has been updated to check if policies exist before creating them.
2. **Marker icons not displaying correctly** - The code now uses proper MaterialIcons compatible with both native and web platforms.
3. **Web markers not visible** - Web rendering has been improved with SVG icons for better cross-platform compatibility.

## Future Enhancements

Potential improvements:

1. Search and filter partners by type, distance, or services
2. Add ratings and reviews for partner locations
3. Show routing information between user location and partners
4. Display additional information like capacity and service hours

## License

This enhancement is part of the MBet-Adera application and follows the same licensing terms as the main application. 