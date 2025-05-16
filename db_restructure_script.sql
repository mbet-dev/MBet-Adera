-- DB Restructuring Script: Convert partner_locations to a view
-- Part 1: Preparation and Data Migration

-- Create a temporary table to store partner_locations data before we drop it
CREATE TABLE temp_partner_locations AS
SELECT * FROM partner_locations;

-- Part 2: Create the View After Ensuring Data is in Correct Tables

-- First, migrate any missing data from partner_locations to partners and addresses
-- This is only for locations that don't already have corresponding records

-- Step 1: Insert any missing partners from partner_locations
INSERT INTO partners (
  id, business_name, business_type, description, 
  phone_number, email, contact_person, color, 
  is_facility, working_hours, is_active, verification_status, 
  created_at, updated_at, rating
)
SELECT 
  pl.id, pl.business_name, pl.business_type, pl.description,
  pl.phone_number, pl.email, pl.contact_person, pl.color,
  pl.is_facility, pl.working_hours, pl.is_active, pl.verification_status,
  NOW(), NOW(), pl.rating
FROM temp_partner_locations pl
LEFT JOIN partners p ON pl.id = p.id
WHERE p.id IS NULL;

-- Step 2: Insert addresses corresponding to the partner locations
INSERT INTO addresses (
  id, partner_id, address_line, street_address, city, state,
  postal_code, country, latitude, longitude, is_facility,
  is_verified, created_at, updated_at, is_commercial
)
SELECT 
  gen_random_uuid(), pl.id, pl.address_line, pl.street_address, 
  pl.city, pl.state, pl.postal_code, pl.country, 
  pl.latitude, pl.longitude, pl.is_facility,
  pl.address_verified, NOW(), NOW(), true
FROM temp_partner_locations pl
LEFT JOIN addresses a ON a.partner_id = pl.id
WHERE a.partner_id IS NULL;

-- Step 3: Create/Replace the partner_locations view
CREATE OR REPLACE VIEW partner_locations AS
SELECT
  p.id,
  p.business_name,
  p.contact_person,
  p.phone_number,
  p.email,
  p.business_type,
  p.description,
  p.working_hours,
  p.color,
  p.is_facility,
  p.is_active,
  p.verification_status,
  p.rating,
  a.address_line,
  a.street_address,
  a.city,
  a.state,
  a.postal_code,
  a.country,
  a.latitude,
  a.longitude,
  a.is_verified AS address_verified
FROM partners p
JOIN addresses a ON p.id = a.partner_id;

-- Part 3: New Partner Data Seeding

-- Function to ensure we have appropriate working hours format
CREATE OR REPLACE FUNCTION generate_working_hours(
  mon_open TEXT, mon_close TEXT,
  tue_open TEXT, tue_close TEXT, 
  wed_open TEXT, wed_close TEXT,
  thu_open TEXT, thu_close TEXT,
  fri_open TEXT, fri_close TEXT,
  sat_open TEXT, sat_close TEXT,
  sun_open TEXT, sun_close TEXT
) RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'monday', jsonb_build_object('open', mon_open, 'close', mon_close),
    'tuesday', jsonb_build_object('open', tue_open, 'close', tue_close),
    'wednesday', jsonb_build_object('open', wed_open, 'close', wed_close),
    'thursday', jsonb_build_object('open', thu_open, 'close', thu_close),
    'friday', jsonb_build_object('open', fri_open, 'close', fri_close),
    'saturday', jsonb_build_object('open', sat_open, 'close', sat_close),
    'sunday', jsonb_build_object('open', sun_open, 'close', sun_close)
  );
END;
$$ LANGUAGE plpgsql;

-- Update existing partners with improved names and data

-- Update the existing hubs to be the HQ and Sorting Facility
UPDATE partners
SET 
  business_name = 'MBet-Adera Headquarters',
  business_type = 'Headquarters',
  description = 'Main headquarters for MBet-Adera operations',
  is_facility = true,
  contact_person = 'Henok Tesfaye',
  phone_number = '+251115570001',
  email = 'info@mbet-adera.com',
  color = '#3498db'
WHERE id = '55ccb7f7-e5ff-5ac5-d83c-b8ca95af1ed3';

UPDATE partners
SET 
  business_name = 'MBet-Adera Sorting Facility',
  business_type = 'Sorting Facility',
  description = 'Central sorting facility for all parcels',
  is_facility = true,
  contact_person = 'Sara Abebe',
  phone_number = '+251115570002',
  email = 'sorting@mbet-adera.com',
  color = '#2ecc71'
WHERE id = '3016a735-59df-f123-9515-1408fde4304e';

-- Update the remaining hubs to be business partners (NOT facilities)
UPDATE partners
SET 
  business_name = 'Merkato Fashion Gallery',
  business_type = 'Retail - Clothing',
  description = 'Premium clothing store offering local and imported fashion',
  is_facility = false,
  contact_person = 'Yonas Berhanu',
  phone_number = '+251115570004',
  email = 'merkato.fashion@example.com',
  color = '#f39c12'
WHERE id = '66ea0909-e8d5-be5c-5fd7-66ecd0bb3c7e';

UPDATE partners
SET 
  business_name = 'Piassa Electronics',
  business_type = 'Retail - Electronics',
  description = 'Electronics and gadget shop with latest technology products',
  is_facility = false,
  contact_person = 'Amanuel Tesfay',
  phone_number = '+251115570003',
  email = 'piassa.electronics@example.com',
  color = '#e74c3c'
WHERE id = 'e5539e8c-04f5-7bfc-5256-09c32494aa90';

-- Update addresses to match partner facility status
UPDATE addresses 
SET is_facility = p.is_facility
FROM partners p
WHERE addresses.partner_id = p.id;

-- Create new partner entries (8 additional partners)
DO $$
DECLARE
  partner_id UUID;
  address_id UUID;
BEGIN
  -- 1. Habesha Cultural Restaurant
  partner_id := gen_random_uuid();
  address_id := gen_random_uuid();
  
  INSERT INTO partners (
    id, business_name, business_type, description, phone_number, email, contact_person,
    color, is_facility, working_hours, is_active, verification_status, created_at, updated_at, rating
  ) VALUES (
    partner_id, 'Habesha Cultural Restaurant', 'Restaurant', 
    'Traditional Ethiopian cuisine in a cultural setting',
    '+251911234567', 'info@habesharestaurant.com', 'Tigist Haile',
    '#9b59b6', false, 
    generate_working_hours('09:00', '22:00', '09:00', '22:00', '09:00', '22:00', 
                          '09:00', '22:00', '09:00', '22:00', '09:00', '23:00', '11:00', '22:00'),
    true, 'verified', NOW(), NOW(), 4.8
  );
  
  INSERT INTO addresses (
    id, partner_id, address_line, street_address, city, state, postal_code, country,
    latitude, longitude, is_facility, is_verified, created_at, updated_at, is_commercial
  ) VALUES (
    address_id, partner_id, 'CMC, Silver Spring Apartments Area, Main Street', 'CMC Road',
    'Addis Ababa', 'Addis Ababa', '1000', 'Ethiopia', 9.03740, 38.76490, false, true, NOW(), NOW(), true
  );
  
  -- 2. Tomoca Coffee Bole
  partner_id := gen_random_uuid();
  address_id := gen_random_uuid();
  
  INSERT INTO partners (
    id, business_name, business_type, description, phone_number, email, contact_person,
    color, is_facility, working_hours, is_active, verification_status, created_at, updated_at, rating
  ) VALUES (
    partner_id, 'Tomoca Coffee Bole', 'Coffee Shop', 
    'Famous Ethiopian coffee shop with fresh roasted beans',
    '+251922345678', 'bole@tomoca.com', 'Dawit Mengistu',
    '#f1c40f', false, 
    generate_working_hours('07:00', '20:00', '07:00', '20:00', '07:00', '20:00', 
                          '07:00', '20:00', '07:00', '20:00', '07:00', '20:00', '08:00', '18:00'),
    true, 'verified', NOW(), NOW(), 4.9
  );
  
  INSERT INTO addresses (
    id, partner_id, address_line, street_address, city, state, postal_code, country,
    latitude, longitude, is_facility, is_verified, created_at, updated_at, is_commercial
  ) VALUES (
    address_id, partner_id, 'Bole Dembel Mall, 1st Floor, Shop B12', 'Ethio-China St',
    'Addis Ababa', 'Addis Ababa', '1000', 'Ethiopia', 9.00920, 38.78950, false, true, NOW(), NOW(), true
  );
  
  -- 3. Genet Pharmacy
  partner_id := gen_random_uuid();
  address_id := gen_random_uuid();
  
  INSERT INTO partners (
    id, business_name, business_type, description, phone_number, email, contact_person,
    color, is_facility, working_hours, is_active, verification_status, created_at, updated_at, rating
  ) VALUES (
    partner_id, 'Genet Pharmacy', 'Pharmacy', 
    'Full-service pharmacy with prescription and OTC medications',
    '+251933456789', 'info@genetpharmacy.com', 'Selam Bekele',
    '#27ae60', false, 
    generate_working_hours('08:00', '21:00', '08:00', '21:00', '08:00', '21:00', 
                          '08:00', '21:00', '08:00', '21:00', '08:00', '21:00', '09:00', '18:00'),
    true, 'verified', NOW(), NOW(), 4.6
  );
  
  INSERT INTO addresses (
    id, partner_id, address_line, street_address, city, state, postal_code, country,
    latitude, longitude, is_facility, is_verified, created_at, updated_at, is_commercial
  ) VALUES (
    address_id, partner_id, 'Gerji Condominium Area, Building C23, Ground Floor', 'Gerji Road',
    'Addis Ababa', 'Addis Ababa', '1000', 'Ethiopia', 9.01490, 38.83040, false, true, NOW(), NOW(), true
  );
  
  -- 4. Eve Beauty Salon
  partner_id := gen_random_uuid();
  address_id := gen_random_uuid();
  
  INSERT INTO partners (
    id, business_name, business_type, description, phone_number, email, contact_person,
    color, is_facility, working_hours, is_active, verification_status, created_at, updated_at, rating
  ) VALUES (
    partner_id, 'Eve Beauty Salon', 'Beauty & Cosmetics', 
    'Premium beauty salon offering hair, nail and skin treatments',
    '+251944567890', 'appointments@evebeauty.com', 'Helen Desta',
    '#d35400', false, 
    generate_working_hours('09:00', '19:00', '09:00', '19:00', '09:00', '19:00', 
                          '09:00', '19:00', '09:00', '19:00', '09:00', '20:00', '10:00', '17:00'),
    true, 'verified', NOW(), NOW(), 4.7
  );
  
  INSERT INTO addresses (
    id, partner_id, address_line, street_address, city, state, postal_code, country,
    latitude, longitude, is_facility, is_verified, created_at, updated_at, is_commercial
  ) VALUES (
    address_id, partner_id, 'Kazanchis Mall, 4th Floor, Unit 405', 'Ras Mekonen St',
    'Addis Ababa', 'Addis Ababa', '1000', 'Ethiopia', 9.01810, 38.76020, false, true, NOW(), NOW(), true
  );
  
  -- 5. Teshome Electronics
  partner_id := gen_random_uuid();
  address_id := gen_random_uuid();
  
  INSERT INTO partners (
    id, business_name, business_type, description, phone_number, email, contact_person,
    color, is_facility, working_hours, is_active, verification_status, created_at, updated_at, rating
  ) VALUES (
    partner_id, 'Teshome Electronics', 'Retail - Electronics', 
    'Wide range of electronics, computers and accessories',
    '+251955678901', 'sales@teshome-electronics.com', 'Teshome Arega',
    '#3498db', false, 
    generate_working_hours('08:30', '18:30', '08:30', '18:30', '08:30', '18:30', 
                          '08:30', '18:30', '08:30', '18:30', '08:30', '19:00', '10:00', '16:00'),
    true, 'verified', NOW(), NOW(), 4.5
  );
  
  INSERT INTO addresses (
    id, partner_id, address_line, street_address, city, state, postal_code, country,
    latitude, longitude, is_facility, is_verified, created_at, updated_at, is_commercial
  ) VALUES (
    address_id, partner_id, 'Merkato, Dubai Tera Shopping Center, Shop 217', 'Dubai Tera Road',
    'Addis Ababa', 'Addis Ababa', '1000', 'Ethiopia', 9.03380, 38.74470, false, true, NOW(), NOW(), true
  );
  
  -- 6. Addis Book Center
  partner_id := gen_random_uuid();
  address_id := gen_random_uuid();
  
  INSERT INTO partners (
    id, business_name, business_type, description, phone_number, email, contact_person,
    color, is_facility, working_hours, is_active, verification_status, created_at, updated_at, rating
  ) VALUES (
    partner_id, 'Addis Book Center', 'Retail - Books', 
    'Comprehensive bookstore with local and international titles',
    '+251966789012', 'info@addisbookcenter.com', 'Abebe Kebede',
    '#16a085', false, 
    generate_working_hours('09:00', '18:00', '09:00', '18:00', '09:00', '18:00', 
                          '09:00', '18:00', '09:00', '18:00', '09:00', '19:00', '11:00', '16:00'),
    true, 'verified', NOW(), NOW(), 4.4
  );
  
  INSERT INTO addresses (
    id, partner_id, address_line, street_address, city, state, postal_code, country,
    latitude, longitude, is_facility, is_verified, created_at, updated_at, is_commercial
  ) VALUES (
    address_id, partner_id, 'Sarbet, Behind Dembel City Center, Building A3', 'Sarbet Road',
    'Addis Ababa', 'Addis Ababa', '1000', 'Ethiopia', 8.99620, 38.76860, false, true, NOW(), NOW(), true
  );
  
  -- 7. Shoa Supermarket
  partner_id := gen_random_uuid();
  address_id := gen_random_uuid();
  
  INSERT INTO partners (
    id, business_name, business_type, description, phone_number, email, contact_person,
    color, is_facility, working_hours, is_active, verification_status, created_at, updated_at, rating
  ) VALUES (
    partner_id, 'Shoa Supermarket', 'Retail - Supermarket', 
    'Large supermarket with wide range of groceries and household items',
    '+251977890123', 'info@shoasupermarket.com', 'Kidist Alemayehu',
    '#e67e22', false, 
    generate_working_hours('08:00', '20:00', '08:00', '20:00', '08:00', '20:00', 
                          '08:00', '20:00', '08:00', '20:00', '08:00', '21:00', '09:00', '19:00'),
    true, 'verified', NOW(), NOW(), 4.6
  );
  
  INSERT INTO addresses (
    id, partner_id, address_line, street_address, city, state, postal_code, country,
    latitude, longitude, is_facility, is_verified, created_at, updated_at, is_commercial
  ) VALUES (
    address_id, partner_id, 'Bole Road, Near Bole Medhanialem Church', 'Bole Road',
    'Addis Ababa', 'Addis Ababa', '1000', 'Ethiopia', 9.01450, 38.78000, false, true, NOW(), NOW(), true
  );
  
  -- 8. Sabegn Ethiopian Fashion
  partner_id := gen_random_uuid();
  address_id := gen_random_uuid();
  
  INSERT INTO partners (
    id, business_name, business_type, description, phone_number, email, contact_person,
    color, is_facility, working_hours, is_active, verification_status, created_at, updated_at, rating
  ) VALUES (
    partner_id, 'Sabegn Ethiopian Fashion', 'Retail - Fashion', 
    'Modern Ethiopian fashion and traditional clothing store',
    '+251988901234', 'contact@sabegnfashion.com', 'Meron Haile',
    '#9b59b6', false, 
    generate_working_hours('09:00', '19:00', '09:00', '19:00', '09:00', '19:00', 
                          '09:00', '19:00', '09:00', '19:00', '09:00', '20:00', '10:00', '17:00'),
    true, 'verified', NOW(), NOW(), 4.7
  );
  
  INSERT INTO addresses (
    id, partner_id, address_line, street_address, city, state, postal_code, country,
    latitude, longitude, is_facility, is_verified, created_at, updated_at, is_commercial
  ) VALUES (
    address_id, partner_id, 'Mexico Area, Sunshine Building, 2nd Floor', 'Mexico Square',
    'Addis Ababa', 'Addis Ababa', '1000', 'Ethiopia', 9.01470, 38.76330, false, true, NOW(), NOW(), true
  );
  
END $$;

-- Part 4: Security and Policies

-- Enable RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies - Drop existing first to prevent errors
DROP POLICY IF EXISTS partner_read_policy ON partners;
DROP POLICY IF EXISTS partner_insert_policy ON partners;
DROP POLICY IF EXISTS partner_update_policy ON partners;
DROP POLICY IF EXISTS address_read_policy ON addresses;
DROP POLICY IF EXISTS address_insert_policy ON addresses;
DROP POLICY IF EXISTS address_update_policy ON addresses;

-- Create new policies
CREATE POLICY partner_read_policy ON partners
  FOR SELECT USING (true);
  
CREATE POLICY partner_insert_policy ON partners
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  
CREATE POLICY partner_update_policy ON partners
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY address_read_policy ON addresses
  FOR SELECT USING (true);
  
CREATE POLICY address_insert_policy ON addresses
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  
CREATE POLICY address_update_policy ON addresses
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Part 5: Fix Duplicate Partner Records and Ensure 1-to-1 Relationship
-- Maintain proper relationship between partners and addresses

-- Create temporary table to identify duplicate partners
DROP TABLE IF EXISTS temp_duplicate_partners;
CREATE TEMP TABLE temp_duplicate_partners AS
SELECT 
  business_name,
  COUNT(*) AS count,
  ARRAY_AGG(id ORDER BY 
    CASE 
      -- Prioritize partners with linked addresses
      WHEN EXISTS (SELECT 1 FROM addresses a WHERE a.partner_id = partners.id) THEN 0
      ELSE 1 
    END, 
    -- Then prioritize verified partners
    CASE WHEN verification_status = 'verified' THEN 0 ELSE 1 END,
    -- Then prioritize those with ratings
    CASE WHEN rating > 0 THEN 0 ELSE 1 END,
    created_at
  ) AS ids,
  -- Store the primary partner ID (the one we'll keep)
  (ARRAY_AGG(id ORDER BY 
    CASE 
      WHEN EXISTS (SELECT 1 FROM addresses a WHERE a.partner_id = partners.id) THEN 0
      ELSE 1 
    END, 
    CASE WHEN verification_status = 'verified' THEN 0 ELSE 1 END,
    CASE WHEN rating > 0 THEN 0 ELSE 1 END,
    created_at
  ))[1] AS primary_id
FROM partners
GROUP BY business_name
HAVING COUNT(*) > 1;

-- First, update the address references to point to the primary partner
UPDATE addresses
SET partner_id = dp.primary_id
FROM temp_duplicate_partners dp
WHERE addresses.partner_id IN (
  SELECT unnest(ids[2:array_length(ids, 1)])
  FROM temp_duplicate_partners
);

-- Now it's safe to delete the duplicate partners
DELETE FROM partners
WHERE id IN (
  SELECT unnest(ids[2:array_length(ids, 1)]) 
  FROM temp_duplicate_partners
);

-- Clean up orphaned addresses (those without a valid partner)
DELETE FROM addresses 
WHERE NOT EXISTS (
  SELECT 1 
  FROM partners 
  WHERE partners.id = addresses.partner_id
);

-- Create addresses for partners that don't have one
INSERT INTO addresses (
  id, 
  partner_id, 
  address_line, 
  street_address, 
  city, 
  state, 
  postal_code, 
  country, 
  latitude, 
  longitude, 
  is_facility, 
  is_verified, 
  created_at, 
  updated_at, 
  is_commercial
)
SELECT 
  gen_random_uuid(), 
  p.id, 
  'Address for ' || p.business_name, 
  'Business District', 
  'Addis Ababa', 
  'Addis Ababa', 
  '1000', 
  'Ethiopia',
  9.0 + random() * 0.1, 
  38.7 + random() * 0.2,
  p.is_facility, 
  true, 
  NOW(), 
  NOW(), 
  true
FROM partners p
WHERE NOT EXISTS (
  SELECT 1 FROM addresses a 
  WHERE a.partner_id = p.id
);

-- Create temporary table for addresses with multiple partners
DROP TABLE IF EXISTS temp_addresses_with_multiple_partners;
CREATE TEMP TABLE temp_addresses_with_multiple_partners AS
SELECT a.id, COUNT(DISTINCT p.id) as partner_count
FROM addresses a
JOIN partners p ON a.partner_id = p.id
GROUP BY a.id
HAVING COUNT(DISTINCT p.id) > 1;

-- Create temporary table for partner-address mappings
DROP TABLE IF EXISTS temp_partner_address_mapping;
CREATE TEMP TABLE temp_partner_address_mapping AS
SELECT 
  a.id as address_id,
  p.id as partner_id,
  ROW_NUMBER() OVER(PARTITION BY a.id ORDER BY p.id) as rn
FROM addresses a
JOIN partners p ON a.partner_id = p.id
WHERE a.id IN (SELECT id FROM temp_addresses_with_multiple_partners);

-- Keep the first partner for each address
UPDATE addresses a
SET partner_id = (
  SELECT partner_id
  FROM temp_partner_address_mapping pam 
  WHERE pam.address_id = a.id AND pam.rn = 1
)
WHERE a.id IN (SELECT id FROM temp_addresses_with_multiple_partners);

-- Create new addresses for partners that now share addresses with others
INSERT INTO addresses (
  id, 
  partner_id, 
  address_line, 
  street_address, 
  city, 
  state, 
  postal_code, 
  country, 
  latitude, 
  longitude, 
  is_facility, 
  is_verified, 
  created_at, 
  updated_at, 
  is_commercial
)
SELECT 
  gen_random_uuid(), 
  pam.partner_id, 
  'New address for ' || p.business_name, 
  'Business District', 
  'Addis Ababa', 
  'Addis Ababa', 
  '1000', 
  'Ethiopia',
  9.0 + random() * 0.1, 
  38.7 + random() * 0.2,
  p.is_facility, 
  true, 
  NOW(), 
  NOW(), 
  true
FROM temp_partner_address_mapping pam
JOIN partners p ON pam.partner_id = p.id
WHERE pam.rn > 1;

-- Clean up temporary tables
DROP TABLE IF EXISTS temp_duplicate_partners;
DROP TABLE IF EXISTS temp_addresses_with_multiple_partners;
DROP TABLE IF EXISTS temp_partner_address_mapping;

-- Finally verify the counts match between tables and view
SELECT 'partners' as table_name, COUNT(*) as record_count FROM partners;
SELECT 'addresses' as table_name, COUNT(*) as record_count FROM addresses;
SELECT 'partner_locations view' as view_name, COUNT(*) as record_count FROM partner_locations;

-- Part 6: Clean up
-- Only drop the partner_locations table after confirming the view works properly
-- DROP TABLE partner_locations;
-- DROP TABLE temp_partner_locations;

-- IMPORTANT: Uncomment these drops only after fully testing that the view works correctly

-- Note: Since this script is for review first, we're keeping the partner_locations table
-- and creating temp_partner_locations as a backup. Once confirmed working, you can
-- drop both tables by uncommenting the DROP TABLE statements above.

-- Part 6: Fix Missing Relationships Between Partners and Addresses

-- Begin fix transaction
BEGIN;

-- Fix orphaned addresses by assigning them to partners without addresses
WITH partners_without_addresses AS (
  SELECT p.id 
  FROM partners p
  LEFT JOIN addresses a ON p.id = a.partner_id
  WHERE a.id IS NULL
  ORDER BY p.id
), orphaned_addresses AS (
  SELECT a.id 
  FROM addresses a
  LEFT JOIN partners p ON a.partner_id = p.id
  WHERE p.id IS NULL
  ORDER BY a.id
)
UPDATE addresses 
SET partner_id = pwoa.id
FROM (
  SELECT p.id, ROW_NUMBER() OVER() AS rn 
  FROM partners_without_addresses p
) pwoa
JOIN (
  SELECT a.id, ROW_NUMBER() OVER() AS rn 
  FROM orphaned_addresses a
) oa ON pwoa.rn = oa.rn
WHERE addresses.id = oa.id;

-- For partners still without addresses, create new address records
WITH partners_without_addresses AS (
  SELECT p.id, p.business_name, p.business_type, p.is_facility
  FROM partners p
  LEFT JOIN addresses a ON p.id = a.partner_id
  WHERE a.id IS NULL
)
INSERT INTO addresses (
  id, partner_id, address_line, street_address, city, state, 
  postal_code, country, latitude, longitude, is_facility, 
  is_verified, created_at, updated_at, is_commercial
)
SELECT 
  gen_random_uuid(), 
  p.id, 
  'Address for ' || p.business_name, 
  'Business District', 
  'Addis Ababa', 
  'Addis Ababa', 
  '1000', 
  'Ethiopia',
  9.0 + random() * 0.1, 
  38.7 + random() * 0.2,
  p.is_facility, 
  true, 
  NOW(), 
  NOW(), 
  true
FROM partners_without_addresses p;

-- Delete any remaining orphaned addresses
DELETE FROM addresses 
WHERE id IN (
  SELECT a.id
  FROM addresses a
  LEFT JOIN partners p ON a.partner_id = p.id
  WHERE p.id IS NULL
);

-- Verify the results after fixes
SELECT 'partners' as table_name, COUNT(*) as record_count FROM partners;
SELECT 'addresses' as table_name, COUNT(*) as record_count FROM addresses;
SELECT 'partner_locations' as table_name, COUNT(*) as record_count FROM partner_locations;

-- If all relationships are fixed, commit the transaction
COMMIT; 