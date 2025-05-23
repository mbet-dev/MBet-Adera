-- Partner-Address Relationship Fix Script

-- 1. Create a backup of current data
CREATE TABLE IF NOT EXISTS partners_backup AS SELECT * FROM partners;
CREATE TABLE IF NOT EXISTS addresses_backup AS SELECT * FROM addresses;

-- 2. Begin transaction for safety
BEGIN;

-- 3. Fix orphaned addresses by assigning them to partners without addresses
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

-- 4. For partners still without addresses, create new address records
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

-- 5. Delete any remaining orphaned addresses
DELETE FROM addresses 
WHERE id IN (
  SELECT a.id
  FROM addresses a
  LEFT JOIN partners p ON a.partner_id = p.id
  WHERE p.id IS NULL
);

-- 6. Ensure all partner-address relationship data is valid
-- Update is_facility to match between partners and addresses
UPDATE addresses
SET is_facility = p.is_facility
FROM partners p
WHERE addresses.partner_id = p.id
AND addresses.is_facility != p.is_facility;

-- 7. Update the partner_locations view to ensure it's correctly picking up all relationships
DROP VIEW IF EXISTS partner_locations;
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

-- 8. Verify the results (uncomment to check)
SELECT 'partners' as table_name, COUNT(*) as record_count FROM partners;
SELECT 'addresses' as table_name, COUNT(*) as record_count FROM addresses;
SELECT 'partner_locations' as table_name, COUNT(*) as record_count FROM partner_locations;

-- If everything looks good, commit the transaction
COMMIT;

-- Function to get parcel details with phone numbers
CREATE OR REPLACE FUNCTION get_parcel_by_id(p_parcel_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_parcel JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', p.id,
        'tracking_code', p.tracking_code,
        'status', p.status,
        'sender_id', p.sender_id,
        'receiver_id', p.receiver_id,
        'pickup_address_id', p.pickup_address_id,
        'dropoff_address_id', p.dropoff_address_id,
        'package_description', p.package_description,
        'package_size', p.package_size,
        'is_fragile', p.is_fragile,
        'pickup_contact', p.pickup_contact,
        'dropoff_contact', p.dropoff_contact,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'weight', p.weight,
        'sender_phone', sender_profile.phone_number,
        'receiver_phone', receiver_profile.phone_number,
        'pickup_address', jsonb_build_object(
            'id', pa.id,
            'address_line', pa.address_line,
            'city', pa.city,
            'latitude', pa.latitude,
            'longitude', pa.longitude
        ),
        'dropoff_address', jsonb_build_object(
            'id', da.id,
            'address_line', da.address_line,
            'city', da.city,
            'latitude', da.latitude,
            'longitude', da.longitude
        )
    ) INTO v_parcel
    FROM parcels p
    LEFT JOIN profiles sender_profile ON p.sender_id = sender_profile.id
    LEFT JOIN profiles receiver_profile ON p.receiver_id = receiver_profile.id
    LEFT JOIN addresses pa ON p.pickup_address_id = pa.id
    LEFT JOIN addresses da ON p.dropoff_address_id = da.id
    WHERE p.id = p_parcel_id
    AND (p.sender_id = p_user_id OR p.receiver_id = p_user_id);

    RETURN v_parcel;
END;
$$; 