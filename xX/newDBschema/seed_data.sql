-- MBet-Adera Seed Data Script
-- This script populates the database with realistic sample data for testing

-- Start transaction
BEGIN;

-- =====================================================
-- 1. USERS AND PROFILES
-- =====================================================
-- Create test users with password 'mbet321'
-- Password hash is for 'mbet321' - this is for testing only!
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at)
VALUES
  -- Customers
  ('11111111-1111-1111-1111-111111111111', 'abebe@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Abebe Kebede"}', NOW()),
  ('22222222-2222-2222-2222-222222222222', 'selam@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Selam Haile"}', NOW()),
  ('33333333-3333-3333-3333-333333333333', 'tewodros@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Tewodros Alemu"}', NOW()),
  
  -- Drivers
  ('44444444-4444-4444-4444-444444444444', 'driver1@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Dawit Tigabu"}', NOW()),
  ('55555555-5555-5555-5555-555555555555', 'driver2@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Meseret Tesfaye"}', NOW()),
  
  -- Staff/Admin
  ('66666666-6666-6666-6666-666666666666', 'admin@mbet.com', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Admin User"}', NOW()),
  ('77777777-7777-7777-7777-777777777777', 'staff@mbet.com', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Staff Member"}', NOW()),
  
  -- Partners
  ('88888888-8888-8888-8888-888888888888', 'partner1@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Business Partner 1"}', NOW()),
  ('99999999-9999-9999-9999-999999999999', 'partner2@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Business Partner 2"}', NOW())
ON CONFLICT (id) DO NOTHING;

-- Add profiles
INSERT INTO profiles (id, email, first_name, last_name, full_name, phone_number, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'abebe@example.com', 'Abebe', 'Kebede', 'Abebe Kebede', '+251911234567', 'customer'),
  ('22222222-2222-2222-2222-222222222222', 'selam@example.com', 'Selam', 'Haile', 'Selam Haile', '+251922345678', 'customer'),
  ('33333333-3333-3333-3333-333333333333', 'tewodros@example.com', 'Tewodros', 'Alemu', 'Tewodros Alemu', '+251933456789', 'customer'),
  ('44444444-4444-4444-4444-444444444444', 'driver1@example.com', 'Dawit', 'Tigabu', 'Dawit Tigabu', '+251944567890', 'driver'),
  ('55555555-5555-5555-5555-555555555555', 'driver2@example.com', 'Meseret', 'Tesfaye', 'Meseret Tesfaye', '+251955678901', 'driver'),
  ('66666666-6666-6666-6666-666666666666', 'admin@mbet.com', 'Admin', 'User', 'Admin User', '+251966789012', 'admin'),
  ('77777777-7777-7777-7777-777777777777', 'staff@mbet.com', 'Staff', 'Member', 'Staff Member', '+251977890123', 'staff'),
  ('88888888-8888-8888-8888-888888888888', 'partner1@example.com', 'Business', 'Partner 1', 'Business Partner 1', '+251988901234', 'partner'),
  ('99999999-9999-9999-9999-999999999999', 'partner2@example.com', 'Business', 'Partner 2', 'Business Partner 2', '+251999012345', 'partner')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. ROLES AND USER ASSIGNMENTS
-- =====================================================
-- Assign users to roles
INSERT INTO user_roles (user_id, role_id)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  id 
FROM roles 
WHERE name = 'Customer'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 
  '22222222-2222-2222-2222-222222222222',
  id 
FROM roles 
WHERE name = 'Customer'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 
  '33333333-3333-3333-3333-333333333333',
  id 
FROM roles 
WHERE name = 'Customer'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 
  '44444444-4444-4444-4444-444444444444',
  id 
FROM roles 
WHERE name = 'Driver'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 
  '55555555-5555-5555-5555-555555555555',
  id 
FROM roles 
WHERE name = 'Driver'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 
  '66666666-6666-6666-6666-666666666666',
  id 
FROM roles 
WHERE name = 'Admin'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 
  '77777777-7777-7777-7777-777777777777',
  id 
FROM roles 
WHERE name = 'Staff'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 
  '88888888-8888-8888-8888-888888888888',
  id 
FROM roles 
WHERE name = 'Partner'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 
  '99999999-9999-9999-9999-999999999999',
  id 
FROM roles 
WHERE name = 'Partner'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. ADDRESSES
-- =====================================================
INSERT INTO addresses (id, address_line, street_address, city, latitude, longitude, is_facility, created_at)
VALUES
  -- Customer addresses
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bole Road', 'Near Bole Medhanialem Church', 'Addis Ababa', 8.9806, 38.7578, false, NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mexico Area', 'Near Estifanos Church', 'Addis Ababa', 9.0092, 38.7645, false, NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Kazanchis', 'Behind UNECA', 'Addis Ababa', 9.0167, 38.7667, false, NOW()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Piassa', 'Near Taitu Hotel', 'Addis Ababa', 9.0333, 38.7500, false, NOW()),
  
  -- Partner/Facility addresses
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Bole Area', 'MBet-Adera Hub Bole', 'Addis Ababa', 8.9865, 38.7912, true, NOW()),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Megenagna', 'MBet-Adera Hub Megenagna', 'Addis Ababa', 9.0233, 38.8079, true, NOW())
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. DELIVERY PERSONNEL
-- =====================================================
INSERT INTO delivery_personnel (id, user_id, employee_id, status, vehicle_type, vehicle_id, license_number, maximum_capacity, is_online)
VALUES
  ('11112222-3333-4444-5555-666677778888', '44444444-4444-4444-4444-444444444444', 'MB-DRV-001', 'active', 'motorcycle', 'TVS-123', 'ET12345', 20, true),
  ('22223333-4444-5555-6666-777788889999', '55555555-5555-5555-5555-555555555555', 'MB-DRV-002', 'active', 'car', 'TOYOTA-456', 'ET54321', 50, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. PARCELS 
-- =====================================================
INSERT INTO parcels (
  id, sender_id, receiver_id, pickup_address_id, dropoff_address_id, 
  tracking_code, status, delivery_type, package_size, weight, 
  dimensions, estimated_delivery_time, actual_delivery_time,
  pickup_contact, pickup_phone, dropoff_contact, dropoff_phone, 
  created_at, handle_with_care, is_fragile, delivery_instructions
)
VALUES
  -- Delivered parcel
  (
    'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 
    '11111111-1111-1111-1111-111111111111', -- sender: Abebe
    '22222222-2222-2222-2222-222222222222', -- receiver: Selam
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- pickup: Bole
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- dropoff: Mexico
    'MB-TRK-001', 
    'delivered', 
    'standard', 
    'medium', 
    3.5, 
    '{"length": 30, "width": 20, "height": 15}', 
    NOW() - interval '2 days', 
    NOW() - interval '1 day',
    'Abebe Kebede', 
    '+251911234567', 
    'Selam Haile', 
    '+251922345678', 
    NOW() - interval '3 days',
    false,
    false,
    'Please call before delivery'
  ),
  
  -- In-transit parcel
  (
    'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7', 
    '22222222-2222-2222-2222-222222222222', -- sender: Selam
    '33333333-3333-3333-3333-333333333333', -- receiver: Tewodros
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- pickup: Mexico
    'cccccccc-cccc-cccc-cccc-cccccccccccc', -- dropoff: Kazanchis
    'MB-TRK-002', 
    'in_transit', 
    'express', 
    'small', 
    1.2, 
    '{"length": 15, "width": 10, "height": 8}', 
    NOW() + interval '6 hours', 
    NULL,
    'Selam Haile', 
    '+251922345678', 
    'Tewodros Alemu', 
    '+251933456789', 
    NOW() - interval '1 day',
    true,
    true,
    'Handle with extreme care, fragile electronics'
  ),
  
  -- Processing parcel
  (
    'c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8', 
    '33333333-3333-3333-3333-333333333333', -- sender: Tewodros
    '11111111-1111-1111-1111-111111111111', -- receiver: Abebe
    'cccccccc-cccc-cccc-cccc-cccccccccccc', -- pickup: Kazanchis
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- dropoff: Bole
    'MB-TRK-003', 
    'processing', 
    'standard', 
    'large', 
    7.8, 
    '{"length": 50, "width": 35, "height": 25}', 
    NOW() + interval '1 day', 
    NULL,
    'Tewodros Alemu', 
    '+251933456789', 
    'Abebe Kebede', 
    '+251911234567', 
    NOW() - interval '12 hours',
    false,
    false,
    'Leave with neighbor if recipient not available'
  ),
  
  -- Pending parcel
  (
    'd4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9', 
    '11111111-1111-1111-1111-111111111111', -- sender: Abebe
    '33333333-3333-3333-3333-333333333333', -- receiver: Tewodros
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- pickup: Bole
    'cccccccc-cccc-cccc-cccc-cccccccccccc', -- dropoff: Kazanchis
    'MB-TRK-004', 
    'pending', 
    'same_day', 
    'medium', 
    2.3, 
    '{"length": 22, "width": 18, "height": 12}', 
    NOW() + interval '10 hours', 
    NULL,
    'Abebe Kebede', 
    '+251911234567', 
    'Tewodros Alemu', 
    '+251933456789', 
    NOW() - interval '2 hours',
    false,
    false,
    'Call recipient one hour before delivery'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. PARCEL STATUS HISTORY
-- =====================================================
INSERT INTO parcel_status_history (parcel_id, status, location, address_text, notes, performed_by)
VALUES
  -- History for delivered parcel
  (
    'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 
    'created', 
    '{"latitude": 8.9806, "longitude": 38.7578}', 
    'Bole Road, Addis Ababa', 
    'Parcel registered in system', 
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 
    'processing', 
    '{"latitude": 8.9865, "longitude": 38.7912}', 
    'MBet-Adera Hub Bole', 
    'Parcel received at hub for processing', 
    '77777777-7777-7777-7777-777777777777'
  ),
  (
    'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 
    'in_transit', 
    '{"latitude": 8.9865, "longitude": 38.7912}', 
    'MBet-Adera Hub Bole', 
    'Parcel dispatched for delivery', 
    '44444444-4444-4444-4444-444444444444'
  ),
  (
    'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 
    'delivered', 
    '{"latitude": 9.0092, "longitude": 38.7645}', 
    'Mexico Area, Addis Ababa', 
    'Parcel delivered successfully to recipient', 
    '44444444-4444-4444-4444-444444444444'
  ),
  
  -- History for in-transit parcel
  (
    'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7', 
    'created', 
    '{"latitude": 9.0092, "longitude": 38.7645}', 
    'Mexico Area, Addis Ababa', 
    'Parcel registered in system', 
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7', 
    'processing', 
    '{"latitude": 9.0233, "longitude": 38.8079}', 
    'MBet-Adera Hub Megenagna', 
    'Parcel received at hub for processing', 
    '77777777-7777-7777-7777-777777777777'
  ),
  (
    'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7', 
    'in_transit', 
    '{"latitude": 9.0233, "longitude": 38.8079}', 
    'MBet-Adera Hub Megenagna', 
    'Parcel dispatched for delivery', 
    '55555555-5555-5555-5555-555555555555'
  ),
  
  -- History for processing parcel
  (
    'c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8', 
    'created', 
    '{"latitude": 9.0167, "longitude": 38.7667}', 
    'Kazanchis, Addis Ababa', 
    'Parcel registered in system', 
    '33333333-3333-3333-3333-333333333333'
  ),
  (
    'c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8', 
    'processing', 
    '{"latitude": 9.0233, "longitude": 38.8079}', 
    'MBet-Adera Hub Megenagna', 
    'Parcel received at hub for processing', 
    '77777777-7777-7777-7777-777777777777'
  ),
  
  -- History for pending parcel
  (
    'd4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9', 
    'created', 
    '{"latitude": 8.9806, "longitude": 38.7578}', 
    'Bole Road, Addis Ababa', 
    'Parcel registered in system', 
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'd4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9', 
    'pending', 
    '{"latitude": 8.9806, "longitude": 38.7578}', 
    'Bole Road, Addis Ababa', 
    'Awaiting pickup', 
    '77777777-7777-7777-7777-777777777777'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. PARCEL ASSIGNMENTS
-- =====================================================
INSERT INTO parcel_assignments (
  parcel_id, personnel_id, status, assigned_at, accepted_at, completed_at, assigned_by, priority
)
VALUES
  -- Assigned and completed (delivered parcel)
  (
    'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 
    '11112222-3333-4444-5555-666677778888', 
    'completed', 
    NOW() - interval '2 days', 
    NOW() - interval '2 days' + interval '30 minutes', 
    NOW() - interval '1 day', 
    '77777777-7777-7777-7777-777777777777', 
    1
  ),
  -- Assigned and in progress (in-transit parcel)
  (
    'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7', 
    '22223333-4444-5555-6666-777788889999', 
    'in_progress', 
    NOW() - interval '12 hours', 
    NOW() - interval '11 hours', 
    NULL, 
    '77777777-7777-7777-7777-777777777777', 
    2
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. PAYMENTS
-- =====================================================
INSERT INTO payments (
  id, parcel_id, amount, payment_method, payment_status, transaction_id, 
  gateway_id, gateway_transaction_id, currency
)
VALUES
  -- Payment for delivered parcel (completed)
  (
    'p1p1p1p1-p1p1-p1p1-p1p1-p1p1p1p1p1p1', 
    'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 
    125.00, 
    'cash', 
    'completed', 
    'TXN-001',
    (SELECT id FROM payment_gateways WHERE provider = 'cash' LIMIT 1),
    NULL,
    'ETB'
  ),
  -- Payment for in-transit parcel (completed)
  (
    'p2p2p2p2-p2p2-p2p2-p2p2-p2p2p2p2p2p2', 
    'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7', 
    85.50, 
    'telebirr', 
    'completed', 
    'TXN-002',
    (SELECT id FROM payment_gateways WHERE provider = 'TeleBirr' LIMIT 1),
    'TB-TXN-78901',
    'ETB'
  ),
  -- Payment for processing parcel (completed)
  (
    'p3p3p3p3-p3p3-p3p3-p3p3-p3p3p3p3p3p3', 
    'c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8', 
    210.75, 
    'yenepay', 
    'completed', 
    'TXN-003',
    (SELECT id FROM payment_gateways WHERE provider = 'YenePay' LIMIT 1),
    'YP-TXN-12345',
    'ETB'
  ),
  -- Payment for pending parcel (pending)
  (
    'p4p4p4p4-p4p4-p4p4-p4p4-p4p4p4p4p4p4', 
    'd4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9', 
    150.00, 
    'wallet', 
    'pending', 
    'TXN-004',
    (SELECT id FROM payment_gateways WHERE provider = 'internal_wallet' LIMIT 1),
    NULL,
    'ETB'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- 9. PRICE CALCULATIONS
-- =====================================================
INSERT INTO price_calculations (
  id, parcel_id, base_price, distance_fee, weight_fee, 
  subtotal, tax_amount, tax_rate, total_price
)
VALUES
  -- Price calc for delivered parcel
  (
    'pc1pc1pc-pc1p-c1pc-1pc1-pc1pc1pc1pc1', 
    'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 
    50.00, 
    35.00, 
    7.00, 
    92.00, 
    13.80, 
    15.00, 
    125.00
  ),
  -- Price calc for in-transit parcel
  (
    'pc2pc2pc-pc2p-c2pc-2pc2-pc2pc2pc2pc2', 
    'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7', 
    50.00, 
    20.00, 
    2.40, 
    72.40, 
    10.86, 
    15.00, 
    85.50
  ),
  -- Price calc for processing parcel
  (
    'pc3pc3pc-pc3p-c3pc-3pc3-pc3pc3pc3pc3', 
    'c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8', 
    50.00, 
    45.00, 
    15.60, 
    110.60, 
    16.59, 
    15.00, 
    210.75
  ),
  -- Price calc for pending parcel
  (
    'pc4pc4pc-pc4p-c4pc-4pc4-pc4pc4pc4pc4', 
    'd4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9', 
    50.00, 
    30.00, 
    4.60, 
    84.60, 
    12.69, 
    15.00, 
    150.00
  )
ON CONFLICT DO NOTHING;

-- Update parcels to reference price_calculation_id
UPDATE parcels 
SET price_calculation_id = 'pc1pc1pc-pc1p-c1pc-1pc1-pc1pc1pc1pc1' 
WHERE id = 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6';

UPDATE parcels 
SET price_calculation_id = 'pc2pc2pc-pc2p-c2pc-2pc2-pc2pc2pc2pc2' 
WHERE id = 'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7';

UPDATE parcels 
SET price_calculation_id = 'pc3pc3pc-pc3p-c3pc-3pc3-pc3pc3pc3pc3' 
WHERE id = 'c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8';

UPDATE parcels 
SET price_calculation_id = 'pc4pc4pc-pc4p-c4pc-4pc4-pc4pc4pc4pc4' 
WHERE id = 'd4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9';

-- =====================================================
-- 10. FAVORITE LOCATIONS AND CONTACTS
-- =====================================================
INSERT INTO favorite_locations (user_id, name, address, latitude, longitude, type)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Home', 'Bole Road, Near Bole Medhanialem Church', 8.9806, 38.7578, 'home'),
  ('11111111-1111-1111-1111-111111111111', 'Office', 'Mexico Area, Near ECA', 9.0092, 38.7645, 'work'),
  ('22222222-2222-2222-2222-222222222222', 'Home', 'Mexico Area, Near Estifanos Church', 9.0092, 38.7645, 'home'),
  ('33333333-3333-3333-3333-333333333333', 'Home', 'Kazanchis, Behind UNECA', 9.0167, 38.7667, 'home')
ON CONFLICT DO NOTHING;

INSERT INTO favorite_contacts (user_id, name, phone_number, email)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Selam Haile', '+251922345678', 'selam@example.com'),
  ('11111111-1111-1111-1111-111111111111', 'Tewodros Alemu', '+251933456789', 'tewodros@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'Abebe Kebede', '+251911234567', 'abebe@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'Abebe Kebede', '+251911234567', 'abebe@example.com')
ON CONFLICT DO NOTHING;

-- Commit transaction
COMMIT;

-- End of seed data script 