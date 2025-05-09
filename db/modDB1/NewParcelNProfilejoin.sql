CREATE OR REPLACE FUNCTION get_parcels_for_user(user_profile_id uuid)
RETURNS SETOF json AS $$
BEGIN
  RETURN QUERY
  SELECT json_build_object(
    'id', p.id,
    'tracking_id', upper(substring(p.id::text, 1, 8)),
    'sender_id', p.sender_id,
    'receiver_id', p.receiver_id,
    'status', p.status,
    'pickup_location', pa.address_line,
    'delivery_location', da.address_line,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'description', 'Package',
    'weight', 0,
    'dimensions', 'N/A'
  )
  FROM parcels p
  LEFT JOIN addresses pa ON p.pickup_address_id = pa.id
  LEFT JOIN addresses da ON p.dropoff_address_id = da.id
  WHERE p.sender_id = user_profile_id OR p.receiver_id = user_profile_id
  ORDER BY p.created_at DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
