-- Function to check parcels data
CREATE OR REPLACE FUNCTION check_parcels_data(p_user_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Get counts and sample data
    WITH parcel_stats AS (
        SELECT 
            COUNT(*) as total_count,
            COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed', 'picked_up', 'in_transit')) as active_count,
            COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count
        FROM parcels
        WHERE (p_user_id IS NULL OR sender_id = p_user_id OR receiver_id = p_user_id)
    ),
    sample_parcels AS (
        SELECT 
            p.id,
            p.status,
            p.sender_id,
            p.receiver_id,
            p.created_at,
            p.tracking_code,
            pa.address_line as pickup_address,
            da.address_line as dropoff_address
        FROM parcels p
        LEFT JOIN addresses pa ON p.pickup_address_id = pa.id
        LEFT JOIN addresses da ON p.dropoff_address_id = da.id
        WHERE (p_user_id IS NULL OR p.sender_id = p_user_id OR p.receiver_id = p_user_id)
        AND p.status IN ('pending', 'confirmed', 'picked_up', 'in_transit')
        ORDER BY p.created_at DESC
        LIMIT 5
    ),
    all_parcels AS (
        SELECT 
            p.id,
            p.status,
            p.sender_id,
            p.receiver_id,
            p.created_at,
            p.tracking_code,
            p.pickup_address_id,
            p.dropoff_address_id
        FROM parcels p
        WHERE (p_user_id IS NULL OR p.sender_id = p_user_id OR p.receiver_id = p_user_id)
        ORDER BY p.created_at DESC
    ),
    expected_parcels AS (
        SELECT unnest(ARRAY[
            'MBET172283',
            'MBET502031',
            'MBET438359',
            'MBET526401',
            'MBET607733'
        ]) as tracking_code
    ),
    missing_parcels AS (
        SELECT ep.tracking_code
        FROM expected_parcels ep
        LEFT JOIN parcels p ON p.tracking_code = ep.tracking_code
        WHERE p.id IS NULL
    )
    SELECT jsonb_build_object(
        'stats', (SELECT row_to_json(ps) FROM parcel_stats ps),
        'sample_parcels', (SELECT jsonb_agg(row_to_json(sp)) FROM sample_parcels sp),
        'all_parcels', (SELECT jsonb_agg(row_to_json(ap)) FROM all_parcels ap),
        'missing_parcels', (SELECT jsonb_agg(tracking_code) FROM missing_parcels)
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Grant execute privileges to authenticated users
GRANT EXECUTE ON FUNCTION check_parcels_data(UUID) TO authenticated; 