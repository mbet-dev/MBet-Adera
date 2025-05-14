# MBet-Adera Database Enhancements Testing Plan

## Overview
This document outlines a comprehensive testing plan for the database enhancements implemented in the MBet-Adera delivery system. Following this plan will ensure that all components work correctly and that the original error with the user_retention view has been resolved.

## Test Environment Setup
1. Create a test database instance separate from production
2. Apply the enhancement scripts using `execute_all_enhancements.sql`
3. Load sample data for testing using the provided sample data scripts

## Testing Areas

### 1. User Retention View Fix
- **Test case 1.1:** Query the user_retention view directly
  ```sql
  SELECT * FROM user_retention LIMIT 10;
  ```
- **Test case 1.2:** Verify that the view uses sender_id and not user_id
  ```sql
  SELECT pg_get_viewdef('user_retention'::regclass, true);
  ```
- **Test case 1.3:** Test the refresh function
  ```sql
  SELECT refresh_materialized_views();
  ```

### 2. Payment Gateway Integration
- **Test case 2.1:** Verify payment gateway table structure
  ```sql
  SELECT column_name, data_type FROM information_schema.columns 
  WHERE table_name = 'payment_gateways';
  ```
- **Test case 2.2:** Verify default gateways were created
  ```sql
  SELECT name, provider FROM payment_gateways;
  ```
- **Test case 2.3:** Test transaction recording by inserting a sample transaction
  ```sql
  INSERT INTO payment_transactions (payment_id, status, amount, transaction_type, gateway_response)
  VALUES (
    (SELECT id FROM payments LIMIT 1),
    'completed',
    100.00,
    'capture',
    '{"transaction_reference": "TEST-1234", "status_message": "Success"}'
  ) RETURNING id;
  ```

### 3. Pricing System
- **Test case 3.1:** Verify pricing categories and rules
  ```sql
  SELECT * FROM pricing_categories;
  SELECT * FROM pricing_rules;
  ```
- **Test case 3.2:** Create a sample discount code
  ```sql
  INSERT INTO discount_codes (code, description, discount_type, discount_value, valid_to)
  VALUES ('TESTCODE10', 'Test discount code', 'percentage', 10, now() + interval '30 day')
  RETURNING id, code, discount_value;
  ```
- **Test case 3.3:** Test price calculation for a sample parcel
  ```sql
  INSERT INTO price_calculations (
    parcel_id, rule_id, base_price, distance_fee, weight_fee, subtotal, total_price
  ) VALUES (
    (SELECT id FROM parcels LIMIT 1),
    (SELECT id FROM pricing_rules LIMIT 1),
    50, 10, 5, 65, 65
  ) RETURNING id;
  ```

### 4. Delivery Personnel & Tracking
- **Test case 4.1:** Add a test delivery personnel
  ```sql
  INSERT INTO delivery_personnel (
    user_id, employee_id, status, vehicle_type
  ) VALUES (
    (SELECT id FROM auth.users LIMIT 1),
    'TEST-EMP-001',
    'active',
    'motorcycle'
  ) RETURNING id;
  ```
- **Test case 4.2:** Test location tracking
  ```sql
  INSERT INTO personnel_location_history (
    personnel_id, latitude, longitude
  ) VALUES (
    (SELECT id FROM delivery_personnel LIMIT 1),
    9.005401,
    38.763611
  ) RETURNING id;
  ```
- **Test case 4.3:** Create test parcel assignment
  ```sql
  INSERT INTO parcel_assignments (
    parcel_id, personnel_id, assigned_by
  ) VALUES (
    (SELECT id FROM parcels LIMIT 1),
    (SELECT id FROM delivery_personnel LIMIT 1),
    (SELECT id FROM auth.users LIMIT 1)
  ) RETURNING id;
  ```

### 5. User Roles & Permissions
- **Test case 5.1:** Verify default roles
  ```sql
  SELECT name, permissions FROM roles;
  ```
- **Test case 5.2:** Assign a role to a test user
  ```sql
  INSERT INTO user_roles (
    user_id, role_id
  ) VALUES (
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM roles WHERE name = 'Customer' LIMIT 1)
  ) RETURNING id;
  ```
- **Test case 5.3:** Test user verification
  ```sql
  INSERT INTO user_verifications (
    user_id, verification_type, status
  ) VALUES (
    (SELECT id FROM auth.users LIMIT 1),
    'email',
    'verified'
  ) RETURNING id;
  ```

### 6. Analytics & Reporting
- **Test case 6.1:** Check delivery statistics view
  ```sql
  SELECT * FROM delivery_statistics LIMIT 5;
  ```
- **Test case 6.2:** Insert test system metrics
  ```sql
  INSERT INTO system_metrics (
    metric_date, active_users, new_users, total_parcels
  ) VALUES (
    CURRENT_DATE,
    100,
    10,
    50
  ) RETURNING id;
  ```
- **Test case 6.3:** Test personnel metrics
  ```sql
  INSERT INTO personnel_metrics (
    personnel_id, metric_date, deliveries_assigned, deliveries_completed
  ) VALUES (
    (SELECT id FROM delivery_personnel LIMIT 1),
    CURRENT_DATE,
    5,
    3
  ) RETURNING id;
  ```

## Integration Testing
- **Test case I.1:** End-to-end parcel creation with payment, pricing, and assignment
  ```sql
  -- This would be a multi-step process testing the entire flow
  -- 1. Create parcel
  -- 2. Calculate price
  -- 3. Process payment
  -- 4. Assign to personnel
  -- 5. Update status
  -- 6. Verify all related tables updated correctly
  ```
- **Test case I.2:** Verify all foreign key constraints work correctly
  ```sql
  -- Attempt operations that should fail due to FK constraints
  ```

## Performance Testing
- **Test case P.1:** Measure query performance on large datasets
  ```sql
  EXPLAIN ANALYZE SELECT * FROM user_retention WHERE first_active_date > current_date - interval '30 days';
  ```
- **Test case P.2:** Test index usage
  ```sql
  EXPLAIN ANALYZE SELECT * FROM parcels WHERE sender_id = '[some-uuid]';
  ```

## Rollback Plan
In case issues are discovered during testing:
1. Document the specific error and affected component
2. Apply the appropriate fix script
3. Re-test the affected component
4. If necessary, revert to previous schema state:
   ```sql
   -- Revert script for each component with appropriate DROP statements
   ```

## Success Criteria
- User retention view returns data correctly using sender_id
- All tables have appropriate constraints and relationships
- Sample data can be inserted and retrieved from all tables
- No errors in query execution for any of the test cases
- Performance metrics within acceptable ranges

After successful testing in the test environment, apply the changes to the staging environment for further validation before production deployment. 