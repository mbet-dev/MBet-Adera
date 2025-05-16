-- MBet-Adera Enhanced Seed Data Script
-- This script adds more test scenarios with realistic sample data

-- Start transaction
BEGIN;

-- =====================================================
-- 1. ADDITIONAL USERS AND PROFILES
-- =====================================================
-- Create additional test users with password 'mbet321'
-- Password hash is for 'mbet321' - this is for testing only!
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at)
VALUES
  -- More Customers
  ('aaaaaaaa-0000-1111-2222-333333333333', 'bereket@example.com', '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Bereket Girma"}', NOW()),
  ('bbbbbbbb-0000-1111-2222-333333333333', 'kidist@example.com', '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Kidist Demeke"}', NOW()),
  ('cccccccc-0000-1111-2222-333333333333', 'teshome@example.com', '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Teshome Bekele"}', NOW()),
  
  -- More Drivers
  ('dddddddd-0000-1111-2222-333333333333', 'driver3@example.com', '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Eyob Tesfaye"}', NOW()),
  ('eeeeeeee-0000-1111-2222-333333333333', 'driver4@example.com', '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Hana Assefa"}', NOW()),
  ('ffffffff-0000-1111-2222-333333333333', 'driver5@example.com', '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Mekonnen Tadesse"}', NOW()),
  
  -- More Staff
  ('88888888-0000-1111-2222-333333333333', 'staff2@mbet.com', '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Staff Member 2"}', NOW()),
  ('99999999-0000-1111-2222-333333333333', 'staff3@mbet.com', '$2a$10$zUGOzCAuPl1pHs5GBzYVpuJ2Z7zyCk4UKZbzgY/qEgAW4Ei0QpbZK', NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Staff Member 3"}', NOW())
ON CONFLICT (id) DO NOTHING;

-- Add more profiles
INSERT INTO profiles (id, email, first_name, last_name, full_name, phone_number, role)
VALUES
  -- Additional customers
  ('aaaaaaaa-0000-1111-2222-333333333333', 'bereket@example.com', 'Bereket', 'Girma', 'Bereket Girma', '+251911223344', 'customer'),
  ('bbbbbbbb-0000-1111-2222-333333333333', 'kidist@example.com', 'Kidist', 'Demeke', 'Kidist Demeke', '+251922334455', 'customer'),
  ('cccccccc-0000-1111-2222-333333333333', 'teshome@example.com', 'Teshome', 'Bekele', 'Teshome Bekele', '+251933445566', 'customer'),
  
  -- Additional drivers (using 'courier' role)
  ('dddddddd-0000-1111-2222-333333333333', 'driver3@example.com', 'Eyob', 'Tesfaye', 'Eyob Tesfaye', '+251944556677', 'courier'),
  ('eeeeeeee-0000-1111-2222-333333333333', 'driver4@example.com', 'Hana', 'Assefa', 'Hana Assefa', '+251955667788', 'courier'),
  ('ffffffff-0000-1111-2222-333333333333', 'driver5@example.com', 'Mekonnen', 'Tadesse', 'Mekonnen Tadesse', '+251966778899', 'courier'),
  
  -- Additional staff (using 'admin' role)
  ('88888888-0000-1111-2222-333333333333', 'staff2@mbet.com', 'Abeba', 'Tessema', 'Abeba Tessema', '+251977889900', 'admin'),
  ('99999999-0000-1111-2222-333333333333', 'staff3@mbet.com', 'Solomon', 'Gemechu', 'Solomon Gemechu', '+251988990011', 'admin')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. ADDITIONAL ROLES AND USER ASSIGNMENTS
-- =====================================================
-- Assign users to roles
INSERT INTO user_roles (user_id, role_id)
SELECT 
  'aaaaaaaa-0000-1111-2222-333333333333',
  id 
FROM roles 
WHERE name = 'Customer'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 
  'bbbbbbbb-0000-1111-2222-333333333333',
  id 
FROM roles 
WHERE name = 'Customer'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 
  'cccccccc-0000-1111-2222-333333333333',
  id 
FROM roles 
WHERE name = 'Customer'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 
  'dddddddd-0000-1111-2222-333333333333',
  id 
FROM roles 
WHERE name = 'Driver'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 
  'eeeeeeee-0000-1111-2222-333333333333',
  id 
FROM roles 
WHERE name = 'Driver'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 
  'ffffffff-0000-1111-2222-333333333333',
  id 
FROM roles 
WHERE name = 'Driver'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 
  '88888888-0000-1111-2222-333333333333',
  id 
FROM roles 
WHERE name = 'Staff'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 
  '99999999-0000-1111-2222-333333333333',
  id 
FROM roles 
WHERE name = 'Staff'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. ADDITIONAL ADDRESSES
-- =====================================================
INSERT INTO addresses (id, address_line, street_address, city, latitude, longitude, is_facility, created_at)
VALUES
  -- More customer addresses
  ('a1a1a1a1-1a1a-1a1a-1a1a-1a1a1a1a1a1a', 'Sarbet Area', 'Near Dembel City Center', 'Addis Ababa', 8.9930, 38.7600, false, NOW()),
  ('a2a2a2a2-2a2a-2a2a-2a2a-2a2a2a2a2a2a', 'Gerji Area', 'Near Sunshine Apartment', 'Addis Ababa', 8.9982, 38.8036, false, NOW()),
  ('a3a3a3a3-3a3a-3a3a-3a3a-3a3a3a3a3a3a', 'CMC Area', 'Near St. Michael Church', 'Addis Ababa', 9.0257, 38.8359, false, NOW()),
  ('a4a4a4a4-4a4a-4a4a-4a4a-4a4a4a4a4a4a', 'Kirkos Area', 'Near Atlas Hotel', 'Addis Ababa', 8.9957, 38.7573, false, NOW()),
  ('a5a5a5a5-5a5a-5a5a-5a5a-5a5a5a5a5a5a', 'Ayat Area', 'Condominium Block 24', 'Addis Ababa', 9.0350, 38.8683, false, NOW()),
  
  -- Additional company facilities
  ('a6a6a6a6-6a6a-6a6a-6a6a-6a6a6a6a6a6a', 'Piassa Area', 'MBet-Adera Hub Piassa', 'Addis Ababa', 9.0333, 38.7500, true, NOW()),
  ('a7a7a7a7-7a7a-7a7a-7a7a-7a7a7a7a7a7a', 'Kality Area', 'MBet-Adera Warehouse Kality', 'Addis Ababa', 8.9489, 38.7933, true, NOW())
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. ADDITIONAL DELIVERY PERSONNEL
-- =====================================================
INSERT INTO delivery_personnel (id, user_id, employee_id, status, vehicle_type, vehicle_id, license_number, maximum_capacity, is_online)
VALUES
  ('33334444-5555-6666-7777-888899990000', 'dddddddd-0000-1111-2222-333333333333', 'MB-DRV-003', 'active', 'motorcycle', 'BAJAJ-789', 'ET56789', 15, true),
  ('44445555-6666-7777-8888-999900001111', 'eeeeeeee-0000-1111-2222-333333333333', 'MB-DRV-004', 'active', 'car', 'SUZUKI-012', 'ET67890', 40, true),
  ('55556666-7777-8888-9999-000011112222', 'ffffffff-0000-1111-2222-333333333333', 'MB-DRV-005', 'inactive', 'van', 'TOYOTA-345', 'ET78901', 100, false)
ON CONFLICT DO NOTHING;

-- Commit transaction
COMMIT;

-- End of enhanced seed data - part 1 