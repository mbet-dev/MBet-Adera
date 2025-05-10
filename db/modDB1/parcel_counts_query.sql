-- Query to get parcel counts for the current user
-- This query assumes the current user's ID is available through auth.uid()
-- It counts parcels where the user is either the sender or receiver

SELECT 
    COUNT(*) FILTER (WHERE status = 'pending' OR status = 'in_transit') as active_count,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
    COUNT(*) as total_count
FROM public.parcels
WHERE 
    -- User is either sender or receiver
    sender_id = auth.uid() OR receiver_id = auth.uid(); 