-- Function to get parcel statistics for a user
CREATE OR REPLACE FUNCTION get_parcel_statistics(user_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    total_count INTEGER;
    active_count INTEGER;
    delivered_count INTEGER;
    cancelled_count INTEGER;
    result JSON;
BEGIN
    -- Count total parcels
    SELECT COUNT(*) 
    INTO total_count
    FROM parcels
    WHERE sender_id = user_id OR receiver_id = user_id;
    
    -- Count active parcels (pending, confirmed, picked_up, in_transit)
    SELECT COUNT(*) 
    INTO active_count
    FROM parcels
    WHERE (sender_id = user_id OR receiver_id = user_id)
    AND status IN ('pending', 'confirmed', 'picked_up', 'in_transit');
    
    -- Count delivered parcels
    SELECT COUNT(*) 
    INTO delivered_count
    FROM parcels
    WHERE (sender_id = user_id OR receiver_id = user_id)
    AND status = 'delivered';
    
    -- Count cancelled parcels
    SELECT COUNT(*) 
    INTO cancelled_count
    FROM parcels
    WHERE (sender_id = user_id OR receiver_id = user_id)
    AND status = 'cancelled';
    
    -- Build response JSON
    result := json_build_object(
        'total', total_count,
        'active', active_count,
        'delivered', delivered_count,
        'cancelled', cancelled_count
    );
    
    RETURN result;
END;
$$;

-- Grant execute privileges to authenticated users
GRANT EXECUTE ON FUNCTION get_parcel_statistics(UUID) TO authenticated; 