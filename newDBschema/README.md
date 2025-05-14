# MBet-Adera Database Schema Enhancement

## Overview
This folder contains SQL scripts for enhancing the MBet-Adera delivery system's database schema. The enhancements include payment gateway integration, dynamic pricing, delivery personnel management, user roles, and analytics capabilities.

## Files Description

### Core Enhancement Files
- `fixed_complete_schema_enhancement.sql` - Complete schema enhancement in a single script
- `simplified_user_retention_fix.sql` - Quick fix for the user_retention view issue
- `fix_user_retention_view.sql` - Comprehensive fix for the user_retention view

### Modular Enhancement Files
- `01_payment_gateway_integration.sql` - Payment methods integration (YenePay, Chapa, TeleBirr, wallets, cash)
- `02_pricing_system.sql` - Dynamic pricing based on distance, weight, and package size
- `analytics_and_reporting_enhancement.sql` - Analytics and reporting features
- `tracking_and_personnel_enhancement.sql` - Delivery personnel management and tracking
- `user_roles_enhancement.sql` - User roles and permissions system
- `pricing_rules_enhancement.sql` - Detailed pricing rules and discount system
- `payment_gateway_enhancement.sql` - Additional payment gateway features

### Utility Files
- `execute_all_enhancements.sql` - Script to execute all enhancements in the correct order
- `testing_plan.md` - Comprehensive testing plan for verifying the enhancements
- `summary_of_enhancements.md` - Overview of all database schema enhancements

## How to Use

### Option 1: Apply All Enhancements (Recommended for New Installations)
Run the complete schema enhancement script:
```bash
psql -U your_username -d your_database -f fixed_complete_schema_enhancement.sql
```

### Option 2: Apply Modular Enhancements
Run the execution script which applies the enhancements in the correct order:
```bash
psql -U your_username -d your_database -f execute_all_enhancements.sql
```

### Option 3: Fix User Retention View Only
If you only want to fix the user_retention view issue:
```bash
psql -U your_username -d your_database -f simplified_user_retention_fix.sql
```

## Important Notes
1. Always backup your database before applying schema changes
2. Test the scripts in a development or staging environment first
3. Review the testing plan document for verification steps
4. All scripts are designed to be idempotent - they can be run multiple times without error

## Dependencies
- PostgreSQL 13+ with PostGIS extension
- Supabase Auth for user management
- UUID extension enabled

## Support
For questions or issues, contact the MBet-Adera development team. 