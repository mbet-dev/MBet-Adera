-- Function to get active parcels for a user
CREATE OR REPLACE FUNCTION get_active_deliveries(user_id UUID)
RETURNS SETOF JSONB LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH active_parcels AS (
    SELECT 
      p.*,
      pickup.latitude AS pickup_latitude,
      pickup.longitude AS pickup_longitude,
      pickup.address_line AS pickup_address,
      dropoff.latitude AS dropoff_latitude,
      dropoff.longitude AS dropoff_longitude,
      dropoff.address_line AS dropoff_address
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
      'pickup_address', ap.pickup_address,
      'dropoff_address', ap.dropoff_address,
      'pickup_contact', ap.pickup_contact,
      'dropoff_contact', ap.dropoff_contact,
      'package_size', ap.package_size,
      'package_description', ap.package_description,
      'is_fragile', ap.is_fragile,
      'pickup_latitude', ap.pickup_latitude,
      'pickup_longitude', ap.pickup_longitude,
      'dropoff_latitude', ap.dropoff_latitude,
      'dropoff_longitude', ap.dropoff_longitude,
      'status_display', INITCAP(REPLACE(ap.status, '_', ' ')),
      'pickup_address_obj', jsonb_build_object(
        'id', ap.pickup_address_id,
        'address_line', ap.pickup_address,
        'latitude', ap.pickup_latitude,
        'longitude', ap.pickup_longitude
      ),
      'dropoff_address_obj', jsonb_build_object(
        'id', ap.dropoff_address_id,
        'address_line', ap.dropoff_address,
        'latitude', ap.dropoff_latitude,
        'longitude', ap.dropoff_longitude
      )
    )
  FROM 
    active_parcels ap;
END;
$$;

-- Grant execute privileges to authenticated users
GRANT EXECUTE ON FUNCTION get_active_deliveries(UUID) TO authenticated; 