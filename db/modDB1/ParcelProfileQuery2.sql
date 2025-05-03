-- SQL script to update parcels with valid sender_id and receiver_id values

-- First, let's find out the exact columns in the parcels table to ensure our script works
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'parcels';

-- Update parcels with status 'pending'
UPDATE parcels 
SET 
  sender_id = '63d01adb-4254-4088-90a6-bb49fe657222', -- Customer Two
  receiver_id = '355ae2e2-10a8-4154-b915-9b567810dd8e'  -- Customer Three
WHERE 
  status = 'pending';

-- Update parcels with status 'in_transit'
UPDATE parcels 
SET 
  sender_id = '63d01adb-4254-4088-90a6-bb49fe657222', -- Customer Two (same user as logged in)
  receiver_id = 'f22e1f7a-d20b-4eb4-8339-00d8ef22b0b3'  -- Customer One
WHERE 
  status = 'in_transit';

-- Update delivered parcels with different user combinations
UPDATE parcels 
SET 
  sender_id = '822c70cd-8812-4ec7-bb9d-422fb1b218e7', -- Customer Seven
  receiver_id = '6f14efc3-5111-4d64-82c5-ccd0c7132058'  -- Customer Five
WHERE 
  status = 'delivered';

-- Create a function to insert a new row that will handle differences in table structure
DO $$
DECLARE
  sender_id_val UUID := '63d01adb-4254-4088-90a6-bb49fe657222'; -- Customer Two
  receiver_id_val UUID := '355ae2e2-10a8-4154-b915-9b567810dd8e'; -- Customer Three
  pickup_addr_val UUID := '64f36325-5c5f-6ce1-7c4a-7c34f6a83278'; -- MBet-Adera Sorting Facility
  dropoff_addr_val UUID := '002a6830-0791-d95e-917e-f3d0ca49b89f'; -- Gerji address
  status_val TEXT := 'confirmed';
  parcel_id UUID;
BEGIN
  -- Insert with minimal required columns
  INSERT INTO parcels (
    id,
    sender_id,
    receiver_id,
    pickup_address_id,
    dropoff_address_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    sender_id_val,
    receiver_id_val,
    pickup_addr_val,
    dropoff_addr_val,
    status_val,
    now(),
    now()
  ) RETURNING id INTO parcel_id;
  
  RAISE NOTICE 'Created new parcel with ID: %', parcel_id;
END $$;

-- Function to get paginated parcels with total count
CREATE OR REPLACE FUNCTION get_paginated_parcels(
    user_id UUID,
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0,
    sort_by TEXT DEFAULT 'created_at',
    sort_direction TEXT DEFAULT 'desc'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    parcels_data JSONB;
    total_count INTEGER;
BEGIN
    -- Count matching parcels
    WITH filtered_parcels AS (
        SELECT p.id
        FROM parcels p
        WHERE (p.sender_id = user_id OR p.receiver_id = user_id)
        AND (
            (p_status IS NULL) OR
            (p_status = 'all') OR
            (p_status = 'active' AND p.status IN ('pending', 'confirmed', 'picked_up', 'in_transit')) OR
            (p_status = p.status)
        )
    )
    SELECT COUNT(*) INTO total_count FROM filtered_parcels;
    
    -- Get paginated parcels with address data
    WITH paginated_parcels AS (
        SELECT 
            p.*,
            pickup.address_line AS pickup_address_line,
            pickup.city AS pickup_city,
            pickup.latitude AS pickup_latitude,
            pickup.longitude AS pickup_longitude,
            dropoff.address_line AS dropoff_address_line,
            dropoff.city AS dropoff_city,
            dropoff.latitude AS dropoff_latitude,
            dropoff.longitude AS dropoff_longitude
        FROM 
            parcels p
        LEFT JOIN 
            addresses pickup ON p.pickup_address_id = pickup.id
        LEFT JOIN 
            addresses dropoff ON p.dropoff_address_id = dropoff.id
        WHERE 
            (p.sender_id = user_id OR p.receiver_id = user_id)
            AND (
                (p_status IS NULL) OR
                (p_status = 'all') OR
                (p_status = 'active' AND p.status IN ('pending', 'confirmed', 'picked_up', 'in_transit')) OR
                (p_status = p.status)
            )
        ORDER BY
            CASE WHEN sort_by = 'created_at' AND sort_direction = 'desc' THEN p.created_at END DESC,
            CASE WHEN sort_by = 'created_at' AND sort_direction = 'asc' THEN p.created_at END ASC,
            CASE WHEN sort_by = 'updated_at' AND sort_direction = 'desc' THEN p.updated_at END DESC,
            CASE WHEN sort_by = 'updated_at' AND sort_direction = 'asc' THEN p.updated_at END ASC,
            CASE WHEN sort_by = 'estimated_price' AND sort_direction = 'desc' THEN p.estimated_price END DESC,
            CASE WHEN sort_by = 'estimated_price' AND sort_direction = 'asc' THEN p.estimated_price END ASC
        LIMIT p_limit OFFSET p_offset
    ),
    jsonb_parcels AS (
        SELECT 
            jsonb_build_object(
                'id', pp.id,
                'created_at', pp.created_at,
                'updated_at', pp.updated_at,
                'sender_id', pp.sender_id,
                'receiver_id', pp.receiver_id,
                'tracking_code', pp.tracking_code::text,
                'status', pp.status,
                'pickup_address_id', pp.pickup_address_id,
                'dropoff_address_id', pp.dropoff_address_id,
                'pickup_address', jsonb_build_object(
                    'id', pp.pickup_address_id,
                    'address_line', pp.pickup_address_line,
                    'city', pp.pickup_city,
                    'latitude', pp.pickup_latitude,
                    'longitude', pp.pickup_longitude
                ),
                'dropoff_address', jsonb_build_object(
                    'id', pp.dropoff_address_id,
                    'address_line', pp.dropoff_address_line,
                    'city', pp.dropoff_city,
                    'latitude', pp.dropoff_latitude,
                    'longitude', pp.dropoff_longitude
                ),
                'pickup_contact', pp.pickup_contact,
                'dropoff_contact', pp.dropoff_contact,
                'package_size', pp.package_size,
                'package_description', pp.package_description,
                'is_fragile', pp.is_fragile,
                'estimated_price', pp.estimated_price
            ) AS parcel_json
        FROM 
            paginated_parcels pp
    )
    SELECT 
        jsonb_build_object(
            'parcels', jsonb_agg(jp.parcel_json),
            'total_count', total_count
        ) INTO parcels_data
    FROM 
        jsonb_parcels jp;
    
    -- Return empty array if no parcels found
    IF parcels_data IS NULL THEN
        RETURN jsonb_build_object(
            'parcels', '[]'::jsonb,
            'total_count', 0
        );
    END IF;
    
    RETURN parcels_data;
END;
$$;

-- Grant execute privileges to authenticated users
GRANT EXECUTE ON FUNCTION get_paginated_parcels(UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;

-- Function to get active deliveries for a user
CREATE OR REPLACE FUNCTION get_active_deliveries(user_id UUID)
RETURNS SETOF JSONB LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH active_parcels AS (
    SELECT 
      p.*,
      pickup.address_line AS pickup_address_line,
      pickup.city AS pickup_city,
      pickup.latitude AS pickup_latitude,
      pickup.longitude AS pickup_longitude,
      dropoff.address_line AS dropoff_address_line,
      dropoff.city AS dropoff_city,
      dropoff.latitude AS dropoff_latitude,
      dropoff.longitude AS dropoff_longitude
    FROM 
      parcels p
    LEFT JOIN 
      addresses pickup ON p.pickup_address_id = pickup.id
    LEFT JOIN 
      addresses dropoff ON p.dropoff_address_id = dropoff.id
    WHERE 
      (p.sender_id = user_id OR p.receiver_id = user_id) AND
      p.status IN ('pending', 'confirmed', 'picked_up', 'in_transit')
    ORDER BY 
      p.created_at DESC
  )
  SELECT 
    jsonb_build_object(
      'id', ap.id,
      'created_at', ap.created_at,
      'updated_at', ap.updated_at,
      'sender_id', ap.sender_id,
      'receiver_id', ap.receiver_id,
      'tracking_code', ap.tracking_code,
      'status', ap.status,
      'pickup_address_id', ap.pickup_address_id,
      'dropoff_address_id', ap.dropoff_address_id,
      'pickup_address', jsonb_build_object(
        'id', ap.pickup_address_id,
        'address_line', ap.pickup_address_line,
        'city', ap.pickup_city,
        'latitude', ap.pickup_latitude,
        'longitude', ap.pickup_longitude
      ),
      'dropoff_address', jsonb_build_object(
        'id', ap.dropoff_address_id,
        'address_line', ap.dropoff_address_line,
        'city', ap.dropoff_city,
        'latitude', ap.dropoff_latitude,
        'longitude', ap.dropoff_longitude
      ),
      'pickup_contact', ap.pickup_contact,
      'dropoff_contact', ap.dropoff_contact,
      'package_size', ap.package_size,
      'package_description', ap.package_description,
      'is_fragile', ap.is_fragile,
      'estimated_price', ap.estimated_price
    )
  FROM 
    active_parcels ap;
END;
$$;

-- Grant execute privileges to authenticated users
GRANT EXECUTE ON FUNCTION get_active_deliveries(UUID) TO authenticated;

-- Function to get a specific parcel by ID
CREATE OR REPLACE FUNCTION get_parcel_by_id(
    p_parcel_id UUID,
    p_user_id UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    parcel_data JSONB;
BEGIN
    WITH parcel_details AS (
        SELECT 
            p.*,
            pickup.address_line AS pickup_address_line,
            pickup.city AS pickup_city,
            pickup.latitude AS pickup_latitude,
            pickup.longitude AS pickup_longitude,
            dropoff.address_line AS dropoff_address_line,
            dropoff.city AS dropoff_city,
            dropoff.latitude AS dropoff_latitude,
            dropoff.longitude AS dropoff_longitude
        FROM 
            parcels p
        LEFT JOIN 
            addresses pickup ON p.pickup_address_id = pickup.id
        LEFT JOIN 
            addresses dropoff ON p.dropoff_address_id = dropoff.id
        WHERE 
            p.id = p_parcel_id
            AND (p.sender_id = p_user_id OR p.receiver_id = p_user_id)
    )
    SELECT 
        CASE 
            WHEN pd.id IS NULL THEN NULL
            ELSE jsonb_build_object(
                'id', pd.id,
                'created_at', pd.created_at,
                'updated_at', pd.updated_at,
                'sender_id', pd.sender_id,
                'receiver_id', pd.receiver_id,
                'tracking_code', pd.tracking_code::text,
                'status', pd.status,
                'pickup_address_id', pd.pickup_address_id,
                'dropoff_address_id', pd.dropoff_address_id,
                'pickup_address', jsonb_build_object(
                    'id', pd.pickup_address_id,
                    'address_line', pd.pickup_address_line,
                    'city', pd.pickup_city,
                    'latitude', pd.pickup_latitude,
                    'longitude', pd.pickup_longitude
                ),
                'dropoff_address', jsonb_build_object(
                    'id', pd.dropoff_address_id,
                    'address_line', pd.dropoff_address_line,
                    'city', pd.dropoff_city,
                    'latitude', pd.dropoff_latitude,
                    'longitude', pd.dropoff_longitude
                ),
                'pickup_contact', pd.pickup_contact,
                'dropoff_contact', pd.dropoff_contact,
                'package_size', pd.package_size,
                'package_description', pd.package_description,
                'is_fragile', pd.is_fragile,
                'estimated_price', pd.estimated_price
            )
        END INTO parcel_data
    FROM parcel_details pd;
    
    RETURN parcel_data;
END;
$$;

-- Grant execute privileges to authenticated users
GRANT EXECUTE ON FUNCTION get_parcel_by_id(UUID, UUID) TO authenticated;
