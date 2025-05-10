-- Function to import sample data from CSV files
CREATE OR REPLACE FUNCTION import_sample_data()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- First, let's clear existing data to avoid conflicts
    TRUNCATE TABLE parcels CASCADE;
    TRUNCATE TABLE addresses CASCADE;

    -- Insert addresses data
    INSERT INTO addresses (id, address_line, street_address, city, latitude, longitude, is_facility, created_at, updated_at)
    VALUES
      ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Mexico Square', 'Mexico Square', 'Addis Ababa', 9.0232, 38.7462, false, NOW(), NOW()),
      ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Merkato', 'Merkato', 'Addis Ababa', 9.0333, 38.7500, false, NOW(), NOW()),
      ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Bole', 'Bole', 'Addis Ababa', 9.0167, 38.7833, false, NOW(), NOW()),
      ('d4e5f6a7-b8c9-0123-defg-234567890123', 'Sarbet', 'Sarbet', 'Addis Ababa', 9.0167, 38.7833, false, NOW(), NOW()),
      ('e5f6a7b8-c9d0-1234-efgh-345678901234', 'CMC', 'CMC', 'Addis Ababa', 9.0167, 38.7833, false, NOW(), NOW());

    -- Insert parcels data
    INSERT INTO parcels (
      id, sender_id, receiver_id, pickup_address_id, dropoff_address_id, 
      status, created_at, updated_at, tracking_code, package_size, 
      is_fragile, package_description, pickup_contact, dropoff_contact, 
      estimated_price, distance
    )
    VALUES
      (
        'f6a7b8c9-d0e1-2345-fghi-456789012345',
        '63d01adb-4254-4088-90a6-bb49fe657222',
        '73d01adb-4254-4088-90a6-bb49fe657223',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        'in_transit',
        NOW(),
        NOW(),
        'TRK123456',
        'medium',
        false,
        'Electronics package',
        '+251912345678',
        '+251987654321',
        150.00,
        5.5
      ),
      (
        'a7b8c9d0-e1f2-3456-ghij-567890123456',
        '63d01adb-4254-4088-90a6-bb49fe657222',
        '83d01adb-4254-4088-90a6-bb49fe657224',
        'c3d4e5f6-a7b8-9012-cdef-123456789012',
        'd4e5f6a7-b8c9-0123-defg-234567890123',
        'confirmed',
        NOW(),
        NOW(),
        'TRK123457',
        'small',
        true,
        'Fragile items',
        '+251912345679',
        '+251987654322',
        120.00,
        3.2
      );

    -- Verify the data was inserted
    SELECT 'Addresses count:' as check_type, COUNT(*) as count FROM addresses
    UNION ALL
    SELECT 'Parcels count:', COUNT(*) FROM parcels;

    -- Return success message
    result := jsonb_build_object(
        'status', 'success',
        'message', 'Sample data imported successfully'
    );
    
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    -- Return error information
    result := jsonb_build_object(
        'status', 'error',
        'error', SQLERRM,
        'detail', SQLSTATE
    );
    
    RETURN result;
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION import_sample_data() TO service_role; 