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
      'tracking_code', ap.tracking_code::text,
      'status', ap.status::text,
      'pickup_address_id', ap.pickup_address_id,
      'dropoff_address_id', ap.dropoff_address_id,
      'pickup_address', jsonb_build_object(
        'id', ap.pickup_address_id,
        'address_line', ap.pickup_address,
        'latitude', ap.pickup_latitude,
        'longitude', ap.pickup_longitude,
        'city', ap.pickup_city,
        'business_name', ap.pickup_business_name,
        'partner_color', ap.pickup_partner_color
      ),
      'dropoff_address', jsonb_build_object(
        'id', ap.dropoff_address_id,
        'address_line', ap.dropoff_address,
        'latitude', ap.dropoff_latitude,
        'longitude', ap.dropoff_longitude,
        'city', ap.dropoff_city,
        'business_name', ap.dropoff_business_name,
        'partner_color', ap.dropoff_partner_color
      ),
      'pickup_contact', ap.pickup_contact::text,
      'dropoff_contact', ap.dropoff_contact::text,
      'package_size', ap.package_size::text,
      'package_description', ap.package_description::text,
      'is_fragile', ap.is_fragile,
      'estimated_price', ap.estimated_price
    )
  FROM 
    active_parcels ap;
END;
$$;

-- Grant execute privileges to authenticated users
GRANT EXECUTE ON FUNCTION get_active_deliveries(UUID) TO authenticated; 