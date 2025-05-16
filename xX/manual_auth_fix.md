# Manual Authentication Fix Guide

Since the SQL script approach failed, let's fix the authentication issue directly through the Supabase Dashboard UI.

## Step 1: Access the Supabase Authentication UI

1. Go to https://app.supabase.com/ and log in
2. Select your MBet-Adera project
3. In the sidebar, click on "Authentication" 
4. Go to "Users" tab

## Step 2: Fix the Test User First

1. Find the user with email "test@mbet.com" 
2. Click on the three dots (⋮) next to that user
3. Select "Edit user"
4. **IMPORTANT**: Check that the "UUID" field exactly matches "33333333-3333-3333-3333-333333333333" (your known working user ID)
5. Make sure "Email confirmed" is checked
6. Click on "View/Edit metadata"
7. Ensure the metadata contains:
   ```json
   {
     "role": "admin"
   }
   ```
8. Close the metadata editor
9. Click "Save"

## Step 3: Fix the Remaining Users

For each of the following users, do these steps:

### For bereket@example.com (UUID: aaaaaaaa-0000-1111-2222-333333333333)
1. Check if the user exists:
   - If YES: Click Edit and fix as described below
   - If NO: Click "Add User" button and set the following:
     - Email: bereket@example.com
     - Password: MBet@2023
     - **CRITICAL**: In "Advanced Settings", set UUID to exactly "aaaaaaaa-0000-1111-2222-333333333333"
     - Enable "Email confirmed"
     - Click "Add User"
2. Edit the user metadata to contain:
   ```json
   {
     "role": "customer"
   }
   ```
3. Save changes

### For kidist@example.com (UUID: bbbbbbbb-0000-1111-2222-333333333333)
- Follow the same steps, setting:
  - UUID: bbbbbbbb-0000-1111-2222-333333333333
  - Role: customer

### For teshome@example.com (UUID: cccccccc-0000-1111-2222-333333333333)
- Follow the same steps, setting:
  - UUID: cccccccc-0000-1111-2222-333333333333
  - Role: customer

### For driver3@example.com (UUID: dddddddd-0000-1111-2222-333333333333)
- Follow the same steps, setting:
  - UUID: dddddddd-0000-1111-2222-333333333333
  - Role: driver

### For driver4@example.com (UUID: eeeeeeee-0000-1111-2222-333333333333)
- Follow the same steps, setting:
  - UUID: eeeeeeee-0000-1111-2222-333333333333
  - Role: driver

### For driver5@example.com (UUID: ffffffff-0000-1111-2222-333333333333)
- Follow the same steps, setting:
  - UUID: ffffffff-0000-1111-2222-333333333333
  - Role: driver

### For staff2@mbet.com (UUID: 88888888-0000-1111-2222-333333333333)
- Follow the same steps, setting:
  - UUID: 88888888-0000-1111-2222-333333333333
  - Role: staff

### For staff3@mbet.com (UUID: 99999999-0000-1111-2222-333333333333)
- Follow the same steps, setting:
  - UUID: 99999999-0000-1111-2222-333333333333
  - Role: staff

## Step 4: Verify User Configuration

Once you've updated all users:
1. Go back to the "Users" tab
2. Verify that all 9 users are listed
3. Each should show "Email confirmed" status

## Step 5: Clear App Authentication Cache

Run this script to clear any cached authentication:

```bash
node reset-app-auth.js
```

## Step 6: Test Authentication

1. Close and reopen your app
2. Clear app data/cache if possible 
3. Try logging in with each type of user:
   - test@mbet.com (admin)
   - bereket@example.com (customer)
   - driver3@example.com (driver)
   - staff2@mbet.com (staff)
4. All should use the password: MBet@2023

## Alternative Fix: Create New Users and Update Foreign Keys

If the manual fix doesn't work, you may need to:
1. Create new users with new UUIDs via the UI
2. Update foreign keys in your tables to point to the new UUIDs
3. Update profile IDs to match the new auth UUIDs

Let me know if you need help with this approach as well. 