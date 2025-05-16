-- Partner-Address Relationship Analysis Script

-- 1. View current record counts
SELECT 'partners' as table_name, COUNT(*) as record_count FROM partners
UNION ALL
SELECT 'addresses' as table_name, COUNT(*) as record_count FROM addresses
UNION ALL
SELECT 'partner_locations' as table_name, COUNT(*) as record_count FROM partner_locations;

-- 2. Find partners without addresses
SELECT p.id, p.business_name, p.business_type, p.contact_person
FROM partners p
LEFT JOIN addresses a ON p.id = a.partner_id
WHERE a.id IS NULL;

-- 3. Find addresses without valid partners
SELECT a.id, a.partner_id, a.address_line, a.city
FROM addresses a
LEFT JOIN partners p ON a.partner_id = p.id
WHERE p.id IS NULL;

-- 4. View problematic relationships
SELECT 
  p.id AS partner_id, 
  p.business_name, 
  COUNT(a.id) AS address_count
FROM partners p
LEFT JOIN addresses a ON p.id = a.partner_id
GROUP BY p.id, p.business_name
ORDER BY address_count ASC;

-- 5. Resolution: Match unmatched partners with addresses
-- First, create a fix script to pair orphaned addresses with partners without addresses
WITH 
  orphaned_addresses AS (
    SELECT a.id
    FROM addresses a
    LEFT JOIN partners p ON a.partner_id = p.id
    WHERE p.id IS NULL
  ),
  partnerless_addresses AS (
    SELECT a.id, a.partner_id
    FROM addresses a
    LEFT JOIN partners p ON a.partner_id = p.id
    WHERE p.id IS NULL
  ),
  partners_without_addresses AS (
    SELECT p.id
    FROM partners p
    LEFT JOIN addresses a ON p.id = a.partner_id
    WHERE a.id IS NULL
  )
SELECT 
  'UPDATE addresses SET partner_id = ''' || p.id || ''' WHERE id = ''' || a.id || ''';' AS fix_command
FROM partners_without_addresses p
CROSS JOIN partnerless_addresses a
WHERE p.id IS NOT NULL AND a.id IS NOT NULL
LIMIT 1;

-- 6. Fix: Update these unmatched relationships
-- This will pair partners without addresses with orphaned addresses
-- Execute this after reviewing the analysis

-- 7. Match remaining partners without addresses to randomly generated addresses
WITH partners_without_addresses AS (
  SELECT p.id, p.business_name, p.business_type
  FROM partners p
  LEFT JOIN addresses a ON p.id = a.partner_id
  WHERE a.id IS NULL
)
SELECT 
  'INSERT INTO addresses (id, partner_id, address_line, street_address, city, state, postal_code, country, ' ||
  'latitude, longitude, is_facility, is_verified, created_at, updated_at, is_commercial) VALUES (' ||
  'gen_random_uuid(), ''' || p.id || ''', ' ||
  '''Sample Address for ' || p.business_name || ''', ' ||
  '''Central Street'', ' ||
  '''Addis Ababa'', ' ||
  '''Addis Ababa'', ' ||
  '''1000'', ' ||
  '''Ethiopia'', ' ||
  '9.0 + random() * 0.1, ' ||
  '38.7 + random() * 0.2, ' ||
  'false, ' ||
  'true, ' ||
  'NOW(), ' ||
  'NOW(), ' ||
  'true);' AS insert_statement
FROM partners_without_addresses p;

-- 8. Delete orphaned addresses that can't be matched
-- Uncomment after reviewing analysis and fixing valid relationships
/*
DELETE FROM addresses 
WHERE id IN (
  SELECT a.id
  FROM addresses a
  LEFT JOIN partners p ON a.partner_id = p.id
  WHERE p.id IS NULL
);
*/

-- 9. Verify the results after fixes
-- SELECT 'partners' as table_name, COUNT(*) as record_count FROM partners
-- UNION ALL
-- SELECT 'addresses' as table_name, COUNT(*) as record_count FROM addresses
-- UNION ALL
-- SELECT 'partner_locations' as table_name, COUNT(*) as record_count FROM partner_locations; 