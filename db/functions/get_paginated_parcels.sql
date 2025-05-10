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
            pickup.latitude AS pickup_latitude,
            pickup.longitude AS pickup_longitude,
            pickup.address_line::text AS pickup_address,
            pickup.city::text AS pickup_city,
            dropoff.latitude AS dropoff_latitude,
            dropoff.longitude AS dropoff_longitude,
            dropoff.address_line::text AS dropoff_address,
            dropoff.city::text AS dropoff_city,
            pickup_partner.business_name::text AS pickup_business_name,
            pickup_partner.color::text AS pickup_partner_color,
            dropoff_partner.business_name::text AS dropoff_business_name,
            dropoff_partner.color::text AS dropoff_partner_color
        FROM 
            parcels p
        LEFT JOIN 
            addresses pickup ON p.pickup_address_id = pickup.id
        LEFT JOIN 
            addresses dropoff ON p.dropoff_address_id = dropoff.id
        LEFT JOIN 
            partners pickup_partner ON pickup.id = pickup_partner.address_id
        LEFT JOIN 
            partners dropoff_partner ON dropoff.id = dropoff_partner.address_id
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
                'status', pp.status::text,
                'pickup_address_id', pp.pickup_address_id,
                'dropoff_address_id', pp.dropoff_address_id,
                'pickup_address', jsonb_build_object(
                    'id', pp.pickup_address_id,
                    'address_line', pp.pickup_address,
                    'latitude', pp.pickup_latitude,
                    'longitude', pp.pickup_longitude,
                    'city', pp.pickup_city,
                    'business_name', pp.pickup_business_name,
                    'partner_color', pp.pickup_partner_color
                ),
                'dropoff_address', jsonb_build_object(
                    'id', pp.dropoff_address_id,
                    'address_line', pp.dropoff_address,
                    'latitude', pp.dropoff_latitude,
                    'longitude', pp.dropoff_longitude,
                    'city', pp.dropoff_city,
                    'business_name', pp.dropoff_business_name,
                    'partner_color', pp.dropoff_partner_color
                ),
                'pickup_contact', pp.pickup_contact::text,
                'dropoff_contact', pp.dropoff_contact::text,
                'package_size', pp.package_size::text,
                'package_description', pp.package_description::text,
                'is_fragile', pp.is_fragile,
                'estimated_price', pp.estimated_price
            ) AS parcel_json
        FROM 
            paginated_parcels pp
    )
    SELECT 
        jsonb_build_object(
            'parcels', COALESCE(jsonb_agg(jp.parcel_json), '[]'::jsonb),
            'total_count', total_count
        ) INTO parcels_data
    FROM 
        jsonb_parcels jp;
    
    RETURN parcels_data;
END;
$$;

-- Grant execute privileges to authenticated users
GRANT EXECUTE ON FUNCTION get_paginated_parcels(UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT) TO authenticated; 