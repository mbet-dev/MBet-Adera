-- Script to fix partners and addresses tables to maintain proper 1-to-1 relationships
-- The issue is that we have duplicate partners and addresses that aren't properly linked

-- Start a transaction to ensure all operations succeed or fail together
BEGIN;

-- First, create a temporary table to identify duplicate partners
DROP TABLE IF EXISTS temp_duplicate_partners;
CREATE TEMP TABLE temp_duplicate_partners AS
SELECT 
  business_name,
  COUNT(*) AS count,
  ARRAY_AGG(id ORDER BY 
    CASE 
      -- Prioritize partners with linked addresses
      WHEN address_id IS NOT NULL OR EXISTS (SELECT 1 FROM addresses a WHERE a.partner_id = partners.id) THEN 0
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
      WHEN address_id IS NOT NULL OR EXISTS (SELECT 1 FROM addresses a WHERE a.partner_id = partners.id) THEN 0
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

-- Clean up orphaned addresses (those without a partner)
DELETE FROM addresses 
WHERE NOT EXISTS (
  SELECT 1 
  FROM partners 
  WHERE partners.id = addresses.partner_id
);

-- Next, handle cases where a partner has no address
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

-- Check if we have addresses for multiple partners
-- Create a temporary table for addresses with multiple partners
DROP TABLE IF EXISTS temp_addresses_with_multiple_partners;
CREATE TEMP TABLE temp_addresses_with_multiple_partners AS
SELECT a.id, COUNT(DISTINCT p.id) as partner_count
FROM addresses a
JOIN partners p ON a.partner_id = p.id
GROUP BY a.id
HAVING COUNT(DISTINCT p.id) > 1;

-- Create a temporary table for partner-address mappings
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

-- Verify the results
SELECT 'partners' as table_name, COUNT(*) as record_count FROM partners;
SELECT 'addresses' as table_name, COUNT(*) as record_count FROM addresses;
SELECT 'partner_locations view' as view_name, COUNT(*) as record_count FROM (
  SELECT p.id
  FROM partners p
  JOIN addresses a ON p.id = a.partner_id
) as partner_locations;

-- Check that we have equal counts
DO $$
DECLARE
  partner_count INTEGER;
  address_count INTEGER;
  view_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO partner_count FROM partners;
  SELECT COUNT(*) INTO address_count FROM addresses;
  SELECT COUNT(*) INTO view_count FROM (
    SELECT p.id
    FROM partners p
    JOIN addresses a ON p.id = a.partner_id
  ) as partner_locations;
  
  -- Validate counts match
  IF partner_count = address_count AND address_count = view_count THEN
    RAISE NOTICE 'Success: All tables have % records with proper 1-to-1 relationships', partner_count;
  ELSE
    RAISE EXCEPTION 'Failed: Records do not match. Partners: %, Addresses: %, View: %', 
      partner_count, address_count, view_count;
  END IF;
END $$;

-- Clean up temporary tables
DROP TABLE IF EXISTS temp_duplicate_partners;
DROP TABLE IF EXISTS temp_addresses_with_multiple_partners;
DROP TABLE IF EXISTS temp_partner_address_mapping;

COMMIT; 