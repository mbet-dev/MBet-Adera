-- Create a stored procedure to get parcel counts for the current user
CREATE OR REPLACE FUNCTION public.get_user_parcel_counts()
RETURNS TABLE (
    active_count BIGINT,
    delivered_count BIGINT,
    total_count BIGINT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed', 'picked_up', 'in_transit')) as active_count,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
        COUNT(*) as total_count
    FROM public.parcels
    WHERE 
        -- User is either sender or receiver
        sender_id = auth.uid() OR receiver_id = auth.uid();
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_parcel_counts() TO authenticated;