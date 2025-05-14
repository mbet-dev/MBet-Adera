# MBet-Adera Enhanced Seed Data

This directory contains enhanced seed data scripts for testing the MBet-Adera delivery system database. These scripts provide more diverse test scenarios to help with development and testing.

## Files

- `enhanced_seed_data.sql`: Part 1 - adds more users, profiles, addresses, and delivery personnel
- `enhanced_seed_data_part2.sql`: Part 2 - adds more parcels and tracking scenarios
- `enhanced_seed_data_part3.sql`: Part 3 - adds more payments, pricing calculations, and test data
- `execute_enhanced_seed_data.sql`: Master script to run all enhanced seed data scripts

## Test Scenarios

The enhanced seed data includes the following test scenarios:

### User Types
- Regular customers (various addresses)
- Drivers (different vehicle types and capacities)
- Staff members (with different roles)
- Admin users

### Parcel Status Scenarios
- Delivered parcels
- In-transit parcels
- Processing parcels
- Pending parcels
- Cancelled parcels
- Failed delivery attempts
- Returned-to-sender parcels
- On-hold parcels
- International shipments
- Same-day rush deliveries

### Payment Scenarios
- Completed payments
- Pending payments
- Refunded payments
- Partially refunded payments
- On-hold payments
- Multiple payment methods (TeleBirr, Chapa, YenePay, Cash, Wallet)

### Additional Test Data
- Delivery notes
- Customer ratings and feedback
- Favorite locations and contacts

## Usage

To load the enhanced seed data:

1. Connect to your PostgreSQL database
2. Execute the master script:

```sql
\i execute_enhanced_seed_data.sql
```

Or run the individual scripts in order:

```sql
\i enhanced_seed_data.sql
\i enhanced_seed_data_part2.sql
\i enhanced_seed_data_part3.sql
```

## Notes

- These scripts are designed to be idempotent, using ON CONFLICT clauses to avoid duplicate entries
- They include the Partner role removal, reflecting the recent schema change
- New test tables (delivery_notes, delivery_ratings) are created if they don't exist
- The scripts must be run in the correct order to maintain data integrity

## Test User Credentials

All test users have the password: `mbet321`

Notable test users:
- Admin: admin@mbet.com
- Staff: staff@mbet.com, staff2@mbet.com, staff3@mbet.com
- Drivers: driver1-5@example.com
- Customers: Multiple test accounts available

## Examples

### Running a Specific Test Query

```sql
-- Find all cancelled parcels
SELECT p.id, p.tracking_code, p.status, 
       sender.full_name as sender, 
       receiver.full_name as receiver
FROM parcels p
JOIN profiles sender ON p.sender_id = sender.id
JOIN profiles receiver ON p.receiver_id = receiver.id
WHERE p.status = 'cancelled';

-- Get payment status distribution
SELECT payment_status, COUNT(*) 
FROM payments 
GROUP BY payment_status;
``` 