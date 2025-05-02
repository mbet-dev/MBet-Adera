-- Check parcels data
SELECT 
    'Parcels' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status IN ('pending', 'confirmed', 'picked_up', 'in_transit') THEN 1 END) as active_count,
    COUNT(CASE WHEN sender_id = '63d01adb-4254-4088-90a6-bb49fe657222' THEN 1 END) as user_sent_count,
    COUNT(CASE WHEN receiver_id = '63d01adb-4254-4088-90a6-bb49fe657222' THEN 1 END) as user_received_count
FROM parcels;

-- Show sample of active parcels
SELECT 
    p.id,
    p.status,
    p.sender_id,
    p.receiver_id,
    p.created_at,
    pa.address_line as pickup_address,
    da.address_line as dropoff_address
FROM parcels p
LEFT JOIN addresses pa ON p.pickup_address_id = pa.id
LEFT JOIN addresses da ON p.dropoff_address_id = da.id
WHERE p.status IN ('pending', 'confirmed', 'picked_up', 'in_transit')
LIMIT 5; 